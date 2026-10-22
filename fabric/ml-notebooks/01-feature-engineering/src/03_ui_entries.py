# %% [markdown]
# ## Include saved UI entries and lifecycle edits in analysis
# These are observed project inputs, not training labels or generated scores.

# %%
def read_ui_analysis_inputs(lake, contract, portfolio_config):
    projects_folder = lake / contract["lake"]["manualProjectsFolder"]
    portfolios_folder = lake / contract["lake"]["manualPortfoliosFolder"]
    portfolios = {item["key"]: item for item in portfolio_config["portfolios"]}
    for path in sorted(portfolios_folder.glob("*.json")):
        item = json.loads(path.read_text(encoding="utf-8"))
        portfolios.setdefault(item["key"], item)
    reset_path = projects_folder.parent / "project_resets.json"
    reset = json.loads(reset_path.read_text(encoding="utf-8")) if reset_path.exists() else {}
    for item in reset.get("portfolios", []):
        portfolios.setdefault(item["key"], item)
    changes = dict(reset.get("records", {}))
    for path in sorted((projects_folder.parent / "project_changes").glob("*.json")):
        change = json.loads(path.read_text(encoding="utf-8"))
        previous = changes.get(change["projectId"])
        if previous is None or previous.get("resetRevision") == change.get("resetRevision"):
            changes[change["projectId"]] = change
    entries = {}
    for path in sorted(projects_folder.glob("*.json")):
        entry = json.loads(path.read_text(encoding="utf-8"))
        if entry.get("projectId") != path.stem:
            raise ValueError(f"Project entry ID does not match its filename: {path.name}")
        entries[path.stem] = entry
    portfolio_config["portfolios"] = list(portfolios.values())
    return entries, changes, portfolios


def merge_ui_analysis_inputs(rows, entries, changes, portfolios, model):
    by_id = {row["project_id"]: dict(row) for row in rows}
    field_map = {
        "projectName": "project_name", "businessUnit": "business_unit", "site": "site",
        "projectManager": "project_manager", "sponsorName": "executive_sponsor",
        "executiveSponsor": "executive_sponsor", "sponsorEmail": "sponsor_email",
        "projectStatus": "project_status", "businessValue": "business_value", "userBase": "user_base",
        "costEstimateUsd": "cost_usd", "skillDemandFte": "skill_demand_fte",
        "effortPersonWeeks": "effort_person_weeks", "dependencyCount": "dependencies",
    }
    signal_fields = (
        "go_live_date", "business_value", "sponsor_priority", "regulatory_security", "primary_skill_code",
        "cost_usd", "dependencies", "risk", "dt_alignment", "effort_person_weeks", "user_base",
    )
    affected = {}
    for pid in sorted(set(entries) | set(changes)):
        change = changes.get(pid, {})
        if change.get("deleted"):
            by_id.pop(pid, None)
            continue
        replacement = change.get("replacement")
        values = {**(replacement if replacement is not None else entries.get(pid, {})), **change.get("values", {})}
        if not values:
            continue
        row = dict(by_id.get(pid, {"project_id": pid, "project_id_raw": pid, "sponsor_roster_match": 0}))
        before = dict(row)
        for source, target in field_map.items():
            if source in values:
                row[target] = values[source]
        if "dependencies" in values and isinstance(values["dependencies"], list):
            row["dependencies"] = len(values["dependencies"])
        for source, target in (
            ("sponsorLevel", "sponsor_priority"), ("riskRating", "risk"),
        ):
            if source in values:
                if values[source] is None:
                    row[target] = None
                    continue
                mapping = model["mappings"][source]
                row[target] = mapping.get(values[source])
        row["sponsor_level_code"] = row.get("sponsor_priority")
        if "sponsorLevel" in values:
            row["sponsor_level_name"] = values["sponsorLevel"]
        for source, target in (
            ("regulatorySecurity", "regulatory_security"), ("dtAlignment", "dt_alignment"),
            ("protectedProgram", "protected_program"),
        ):
            if source in values:
                if values[source] is None:
                    row[target] = None
                    continue
                if not isinstance(values[source], bool):
                    raise ValueError(f"{pid}: {source} must be boolean")
                row[target] = int(values[source])
        if "goLiveDate" in values:
            date = dt.datetime.fromisoformat(values["goLiveDate"]) if values["goLiveDate"] else None
            row["go_live_date"] = date
            as_of = dt.datetime.fromisoformat(model["asOfDate"])
            row["months_to_go_live"] = (date - as_of).days / 30.44 if date is not None else None
        if "primarySkill" in values:
            skill = values["primarySkill"]
            names = model["mappings"]["skillNames"]
            code = skill if skill in names else next((key for key, name in names.items() if name == skill), None)
            row.update(primary_skill_code=code, primary_skill=names.get(code))
        portfolio_key = values.get("portfolioKey", row.get("portfolio_key"))
        portfolio = portfolios.get(portfolio_key)
        if portfolio is None:
            raise ValueError(f"{pid}: portfolio is not registered")
        row.update(
            portfolio_key=portfolio_key, portfolio_name=portfolio["displayName"],
            portfolio_code=portfolio["code"], portfolio_role=portfolio["role"],
        )
        if "programKey" in values:
            program = next((item for item in portfolio.get("programs", []) if item["key"] == values["programKey"]), None)
            if program is None:
                raise ValueError(f"{pid}: program is not registered in its portfolio")
            row.update(program_name=program["displayName"], program_code=program["code"])
        elif replacement is not None:
            row.update(program_name=replacement.get("program"), program_code=replacement.get("programCode"))
        row["signals_present"] = sum(row.get(key) is not None for key in signal_fields)
        row["analysis_reset_revision"] = change.get("resetRevision")
        by_id[pid] = row
        affected[pid] = {key for key, value in row.items() if key not in before or before[key] != value}
        if isinstance(values.get("dependencies"), list):
            affected[pid].add("dependency_links")
    return list(by_id.values()), affected


UI_CONTRACT = json.loads((CFG_DIR / "data-entry.json").read_text(encoding="utf-8"))
UI_ENTRIES, UI_CHANGES, UI_PORTFOLIOS = read_ui_analysis_inputs(LAKE, UI_CONTRACT, PORTFOLIO_CFG)


def ui_dependency_edges(entries, changes):
    result, replaced = [], set()
    for pid in sorted(set(entries) | set(changes)):
        change = changes.get(pid, {})
        values = {**(change.get("replacement") or entries.get(pid, {})), **change.get("values", {})}
        links = values.get("dependencies")
        if not isinstance(links, list):
            continue
        replaced.add(pid)
        if change.get("deleted"):
            continue
        result.extend({
            "from_id": pid, "to_id": link["projectId"], "relationship_type": link["relationshipType"],
            "evidence_source": "ui_entries", "evidence_count": 1,
        } for link in links)
    return result, replaced
