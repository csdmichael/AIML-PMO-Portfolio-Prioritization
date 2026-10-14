# %% [markdown]
# ## Resolve the ten signals with provenance
# The first non-blank value in precedence order wins. Every choice is written to `silver.signal_provenance`.

# %%
def resolve(signal, candidates, provenance, pid):
    for source, value in candidates:
        if not is_blank(value):
            provenance.append((pid, signal, source))
            return value
    provenance.append((pid, signal, None))
    return None


def repo_risk(docs):
    severities = [MAP["riskRating"].get(item.get("severity")) for doc in docs for item in (doc.get("riskItems") or []) if item.get("status") == "Open"]
    severities = [s for s in severities if s]
    return max(severities) if severities else None


def repo_regulatory(docs):
    if not docs:
        return None
    return 1 if any(doc.get("complianceTags") for doc in docs) else None


def run_checks(pid, context):
    results = []
    for check in CONFIG["dataQuality"]["checks"]:
        value = context.get(check.get("field"))
        kind, evaluated, passed, detail = check["type"], True, None, ""
        if kind == "dateRange":
            evaluated = value is not None
            passed = evaluated and pd.Timestamp(check["min"]) <= value <= pd.Timestamp(check["max"])
        elif kind == "intRange":
            evaluated = value is not None
            passed = evaluated and check["min"] <= value <= check["max"]
        elif kind == "numberRange":
            evaluated = value is not None
            if evaluated:
                low_ok = value > check["minExclusive"] if "minExclusive" in check else value >= check["min"]
                passed = low_ok and value <= check["max"]
        elif kind == "inList":
            evaluated = value is not None
            passed = evaluated and value in check["values"]
        elif kind == "notNull":
            passed = bool(value)
        elif kind == "codeFormat":
            evaluated = value is not None
            if evaluated:
                passed = bool(re.fullmatch(check["pattern"], str(value))) and (value == pid if check.get("requireCleanInput") else True)
        elif kind == "spreadDays":
            dates = [d for d in (value or []) if d is not None]
            evaluated = len(dates) >= check["minSources"]
            if evaluated:
                spread = (max(dates) - min(dates)).days
                passed, detail = spread <= check["maxDays"], f"spread {spread} days"
        elif kind == "spreadPercent":
            numbers = [n for n in (value or []) if n]
            evaluated = len(numbers) >= check["minSources"]
            if evaluated:
                spread = (max(numbers) - min(numbers)) / min(numbers) * 100
                passed, detail = spread <= check["maxPercent"], f"spread {spread:.1f} percent"
        else:
            evaluated = False
        results.append((check["id"], evaluated, bool(passed) if evaluated else None, detail))
    return results


# %%
SOURCE_NAMES = ["planview", "powerapps", "ado", "jira", "ms_project", "smartsheet", "bu_trackers", "bu_repositories", "hr_capacity", "cost", "excel_intake"]
RECORD_COUNTS = {
    "planview": PV_RAW["pid"].value_counts(),
    "powerapps": PA_RAW["pid"].value_counts(),
    "ado": ADO_RAW["pid"].value_counts(),
    "jira": JIRA["pid"].value_counts(),
    "ms_project": MSP_RAW["pid"].value_counts(),
    "smartsheet": SS_RAW["pid"].value_counts(),
    "bu_trackers": TR_RAW["pid"].value_counts(),
    "bu_repositories": pd.Series([norm_code(d.get("projectRef")) for d in REPO_DOCS]).value_counts(),
    "hr_capacity": ALLOC_RAW["pid"].value_counts(),
    "cost": COST_RAW["pid"].value_counts(),
    "excel_intake": XL_RAW["pid"].value_counts(),
}
SIGNAL_KEYS = ["go_live_date", "business_value", "sponsor_priority", "regulatory_security", "primary_skill", "cost_usd", "dependencies", "risk", "dt_alignment", "effort_person_weeks"]

canonical, provenance, coverage, dq_rows = [], [], [], []
for pid in ALL_IDS:
    portfolio_name = resolve("portfolio", [("planview", cell(PV, pid, "portfolio")), ("excel_intake", cell(XLD, pid, "portfolio"))], provenance, pid)
    portfolio = PORTFOLIO_BY_NAME.get(portfolio_name)
    if portfolio is None:
        key = cell(ado_portfolio, pid) or cell(jira_agg, pid, "portfolio_key") or MSPROJECT_FILE_TO_KEY.get(cell(msp_file, pid) or "")
        if key is None:
            raise ValueError(f"No portfolio evidence for {pid}")
        portfolio = PORTFOLIO_BY_KEY[key]
        provenance.append((pid, "portfolio", "fallback_" + ("ado" if cell(ado_portfolio, pid) else "jira_or_ms_project")))
    program_name = resolve("program", [("planview", cell(PV, pid, "programname"))], provenance, pid)
    program_code = PROGRAM_CODE.get((portfolio["displayName"], program_name))
    if program_code is None:
        program_name, program_code = portfolio["programs"][0]["displayName"], portfolio["programs"][0]["code"]

    name = resolve("project_name", [("planview", cell(PV, pid, "projectname")), ("powerapps", cell(PA, pid, "cr5f2_requesttitle")), ("excel_intake", cell(XLD, pid, "name"))], provenance, pid)
    bu = resolve("business_unit", [("planview", cell(PV, pid, "bu")), ("powerapps", cell(PA, pid, "bu")), ("excel_intake", cell(XLD, pid, "bu"))], provenance, pid)
    site = resolve("site", [("planview", cell(PV, pid, "site")), ("excel_intake", cell(XLD, pid, "site"))], provenance, pid)
    pm = resolve("project_manager", [("planview", norm_person(cell(PV, pid, "projectmanager"))), ("powerapps", cell(PA, pid, "pm"))], provenance, pid)
    sponsor = resolve("executive_sponsor", [("planview", cell(PV, pid, "sponsor")), ("excel_intake", cell(XLD, pid, "sponsor"))], provenance, pid)
    sponsor_email = resolve("sponsor_email", [("planview", cell(PV, pid, "sponsor_email")), ("powerapps", cell(PA, pid, "sponsor_email"))], provenance, pid)
    roster_row = ROSTER_BY_NAME.get(str(sponsor).strip().lower()) if sponsor else None
    sponsor_match = roster_row is not None
    status = cell(PV, pid, "projectstatus") or "Planning"
    protected = resolve("protected_program", [("planview", cell(PV, pid, "protected"))], provenance, pid) or 0

    raw_code = next((code for code in [cell(PV, pid, "projectcode"), cell(PA, pid, "cr5f2_projectcode"), cell(XL, pid, "project_id")] if code), None)
    docs = REPO_BY_PID.get(pid, [])

    golive_sources = [
        ("planview", cell(PV, pid, "go_live")),
        ("smartsheet", cell(ss_golive, pid, "golive")),
        ("powerapps", cell(PA, pid, "go_live")),
        ("excel_intake", cell(XLD, pid, "golive")),
        ("bu_trackers", cell(TR, pid, "fy_end")),
        ("ms_project", parse_date(cell(msp_summary, pid, "finish"))),
    ]
    go_live = resolve("go_live_date", golive_sources, provenance, pid)
    months = None if go_live is None else (go_live - AS_OF).days / 30.44
    value = resolve("business_value", [("planview", cell(PV, pid, "value")), ("powerapps", cell(PA, pid, "value")), ("excel_intake", cell(XLD, pid, "value"))], provenance, pid)
    roster_level = sponsor_code_from_roster(roster_row["joblevel"]) if roster_row else None
    sponsor_priority = resolve("sponsor_priority", [("powerapps", cell(PA, pid, "sponsor_code")), ("hr_roster", roster_level), ("excel_intake", cell(XLD, pid, "sponsor_code"))], provenance, pid)
    regulatory = resolve("regulatory_security", [("powerapps", cell(PA, pid, "reg")), ("excel_intake", cell(XLD, pid, "reg")), ("bu_repositories", repo_regulatory(docs)), ("bu_trackers", cell(TR, pid, "reg"))], provenance, pid)
    pv_strategic = cell(PV, pid, "strategictag")
    tag_dt = 1 if (cell(ado_agg, pid, "dt") or cell(jira_agg, pid, "dt")) else None
    dt_flag = resolve("dt_alignment", [("powerapps", cell(PA, pid, "dt")), ("planview", None if pv_strategic is None else int(pv_strategic == "DT Initiative")), ("ado_jira", tag_dt), ("excel_intake", cell(XLD, pid, "dt"))], provenance, pid)
    skill_code = resolve("primary_skill", [("planview", skill_code_from_name(cell(PV, pid, "primaryskill"))), ("excel_intake", cell(XLD, pid, "skill")), ("hr_capacity", cell(alloc_primary, pid, "skillcode"))], provenance, pid)
    fte = resolve("skill_demand_fte", [("planview", parse_number(cell(PV, pid, "skilldemandfte"))), ("excel_intake", cell(XLD, pid, "fte")), ("hr_capacity", cell(alloc_primary, pid, "fte"))], provenance, pid)
    cost = resolve("cost_usd", [("finance_cost", cell(cost_annual, pid)), ("planview", cell(PV, pid, "cost")), ("powerapps", cell(PA, pid, "cost")), ("bu_trackers", cell(TR, pid, "budget")), ("excel_intake", cell(XLD, pid, "cost"))], provenance, pid)
    graph_deps = int(out_degree.get(pid, 0)) or None
    deps = resolve("dependencies", [("dependency_graph", graph_deps), ("planview", cell(PV, pid, "deps")), ("excel_intake", cell(XLD, pid, "deps"))], provenance, pid)
    risk = resolve("risk", [("planview", cell(PV, pid, "risk")), ("bu_repositories", repo_risk(docs) or None), ("smartsheet", cell(ss_rag, pid)), ("excel_intake", cell(XLD, pid, "risk"))], provenance, pid)
    msp_hours_value = cell(msp_hours, pid)
    story_points = (cell(ado_agg, pid, "points") or 0) + (cell(jira_agg, pid, "points") or 0)
    effort = resolve("effort_person_weeks", [("ms_project", None if msp_hours_value is None else msp_hours_value / 40), ("excel_intake", cell(XLD, pid, "effort")), ("ado_jira", story_points * 0.5 if story_points else None)], provenance, pid)

    signal_values = [go_live, value, sponsor_priority, regulatory, skill_code, cost, deps, risk, dt_flag, effort]
    signals_present = sum(1 for v in signal_values if v is not None)
    golive_candidates = [v for _, v in golive_sources if v is not None]
    cost_candidates = [v for v in [cell(PV, pid, "cost"), cell(PA, pid, "cost"), cell(TR, pid, "budget"), cell(cost_annual, pid), cell(XLD, pid, "cost")] if v is not None]
    context = {
        "go_live_date": go_live, "business_value": value, "cost_usd": cost, "dependencies": deps,
        "effort_person_weeks": effort, "risk": risk, "sponsor_roster_match": sponsor_match,
        "project_id_raw": raw_code, "go_live_candidates": golive_candidates, "cost_candidates": cost_candidates,
    }
    for check_id, evaluated, passed, detail in run_checks(pid, context):
        dq_rows.append((pid, check_id, int(bool(passed)) if evaluated else None, int(evaluated), detail))

    for source in SOURCE_NAMES:
        count = int(RECORD_COUNTS[source].get(pid, 0))
        coverage.append((pid, source, int(count > 0), count))

    canonical.append({
        "project_id": pid,
        "project_name": name,
        "portfolio_key": portfolio["key"],
        "portfolio_name": portfolio["displayName"],
        "portfolio_code": portfolio["code"],
        "portfolio_role": portfolio["role"],
        "program_name": program_name,
        "program_code": program_code,
        "business_unit": bu,
        "site": site,
        "project_manager": pm,
        "executive_sponsor": sponsor,
        "sponsor_email": sponsor_email,
        "sponsor_roster_match": int(sponsor_match),
        "sponsor_level_code": sponsor_priority,
        "project_status": status,
        "protected_program": int(protected),
        "go_live_date": go_live,
        "months_to_go_live": months,
        "business_value": value,
        "sponsor_priority": sponsor_priority,
        "regulatory_security": regulatory,
        "dt_alignment": dt_flag,
        "primary_skill_code": skill_code,
        "primary_skill": SKILL_NAMES.get(skill_code) if skill_code else None,
        "skill_demand_fte": fte,
        "cost_usd": cost,
        "dependencies": deps,
        "risk": risk,
        "effort_person_weeks": effort,
        "signals_present": signals_present,
        "project_id_raw": raw_code,
    })

CANON = pd.DataFrame(canonical)
CANON["sponsor_priority"] = CANON["sponsor_priority"].astype("float")
PROV = pd.DataFrame(provenance, columns=["project_id", "signal", "source"])
COVERAGE = pd.DataFrame(coverage, columns=["project_id", "source_name", "present", "record_count"])
DQ = pd.DataFrame(dq_rows, columns=["project_id", "check_id", "passed", "evaluated", "detail"])
DQ = DQ[DQ["evaluated"] == 1].copy()
DQ["passed"] = DQ["passed"].astype(int)
print(f"signals present: {CANON['signals_present'].value_counts().sort_index().to_dict()}")
print(f"DQ checks evaluated: {len(DQ)}, failed: {int((DQ['passed'] == 0).sum())}")

# %%
PORTFOLIO_CODE = dict(zip(CANON["project_id"], CANON["portfolio_code"]))
DEP = edge_table.copy()
DEP = DEP[DEP["from_id"].isin(PORTFOLIO_CODE) & DEP["to_id"].isin(PORTFOLIO_CODE)].copy()
DEP["from_portfolio_code"] = DEP["from_id"].map(PORTFOLIO_CODE)
DEP["to_portfolio_code"] = DEP["to_id"].map(PORTFOLIO_CODE)
DEP["is_cross_portfolio"] = (DEP["from_portfolio_code"] != DEP["to_portfolio_code"]).astype(int)
DEP = DEP.rename(columns={"from_id": "from_project_id", "to_id": "to_project_id"})[
    ["from_project_id", "to_project_id", "from_portfolio_code", "to_portfolio_code", "is_cross_portfolio", "relationship_type", "evidence_source", "evidence_count"]
].reset_index(drop=True)

write_table(CANON.drop(columns=["sponsor_level_code"]), "silver.project_canonical")
write_table(PROV, "silver.signal_provenance")
write_table(COVERAGE, "gold.source_coverage")
write_table(DQ.drop(columns=["evaluated"]), "gold.dq_checks")
write_table(DEP, "gold.project_dependencies")
