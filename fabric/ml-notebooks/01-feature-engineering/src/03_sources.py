# %% [markdown]
# ## Per-source views
# Each source is reduced to one row per canonical project ID. Multi-row sources are aggregated first.

# %%
def cell(source, pid, column=None):
    if source is None or pid not in source.index or (column is not None and column not in source.columns):
        return None
    value = source.loc[pid] if column is None else source.at[pid, column]
    return None if is_blank(value) else value


PV_RAW = INGESTED["src_planview.portfolio_items"].copy()
PV_RAW["pid"] = PV_RAW["projectcode"].map(norm_code)
PV = PV_RAW[PV_RAW["pid"].notna()].copy()
PV["go_live"] = PV["plannedgolive"].map(parse_date)
PV["value"] = PV["benefitscore"].map(business_value)
PV["cost"] = PV["estimatedcostusd"].map(parse_money)
PV["risk"] = PV["risklevel"].map(risk_level)
PV["deps"] = PV["dependencycount"].map(parse_number)
PV["protected"] = PV["protectedprogram"].map(yes_no)
PV["sponsor"] = PV["executivesponsor"].map(norm_person)
PV["sponsor_email"] = PV["executivesponsoremail"].map(lambda v: None if is_blank(v) else str(v).strip().lower())
PV["bu"] = PV["businessunit"].map(canon_bu)
PV = PV.drop_duplicates("pid", keep="first").set_index("pid")

PA_RAW = INGESTED["src_powerapps.intake_requests"].copy()
PA_RAW["pid"] = PA_RAW["cr5f2_projectcode"].map(norm_code)
PA = PA_RAW[PA_RAW["pid"].notna()].sort_values("cr5f2_submittedon").drop_duplicates("pid", keep="last").set_index("pid")
PA["go_live"] = PA["cr5f2_targetgolive"].map(parse_date)
PA["value"] = PA["cr5f2_businessvalue"].map(business_value)
PA["sponsor_code"] = PA["cr5f2_sponsorlevel"].map(sponsor_code_from_powerapps)
PA["reg"] = PA["cr5f2_regulatorycompliance"].map(yes_no)
PA["dt"] = PA["cr5f2_dtinitiative"].map(yes_no)
PA["cost"] = PA["cr5f2_estimatedcostk"].map(lambda v: None if parse_number(v) is None else parse_number(v) * 1000)
PA["bu"] = PA["cr5f2_businessunit"].map(canon_bu)
PA["pm"] = PA["cr5f2_requestedby"].map(norm_person)
PA["sponsor_email"] = PA["cr5f2_sponsoremail"].map(lambda v: None if is_blank(v) else str(v).strip().lower())

ADO_RAW = INGESTED["src_ado.work_items"].copy()
ADO_RAW["pid"] = ADO_RAW["custom_projectcode"].map(norm_code)
ADO = ADO_RAW[ADO_RAW["pid"].notna()].copy()
ADO["points"] = ADO["story_points"].map(parse_number)
ADO["dt_tag"] = ADO["tags"].fillna("").str.contains("dt-initiative")


def portfolio_key_from_area(value):
    if is_blank(value):
        return None
    parts = str(value).split("\\")
    portfolio = PORTFOLIO_BY_CODE.get(parts[1]) if len(parts) > 1 else None
    return portfolio["key"] if portfolio else None


ADO["portfolio_key"] = ADO["area_path"].map(portfolio_key_from_area)
ado_agg = ADO.groupby("pid").agg(points=("points", "sum"), dt=("dt_tag", "any"), rows=("points", "size"))
ado_portfolio = ADO.dropna(subset=["portfolio_key"]).groupby("pid")["portfolio_key"].first()

JIRA_RAW = json.loads((RAW / "jira" / "jira_issues_export.json").read_text(encoding="utf-8"))["issues"]
KEY_TO_PID = {issue["key"]: norm_code((issue.get("fields") or {}).get("customfield_10050")) for issue in JIRA_RAW}
JIRA = INGESTED["src_jira.issues"].copy()
JIRA["pid"] = JIRA["fields_customfield_10050"].map(norm_code)
JIRA["points"] = JIRA["fields_customfield_10016"].map(parse_number)
JIRA["dt_tag"] = JIRA["fields_labels"].fillna("").str.contains("dt-initiative")
JIRA["portfolio_key"] = JIRA["key"].map(lambda k: JIRA_PREFIX_TO_KEY.get(str(k).split("-")[0]))
JIRA = JIRA[JIRA["pid"].notna()]
jira_agg = JIRA.groupby("pid").agg(points=("points", "sum"), dt=("dt_tag", "any"), portfolio_key=("portfolio_key", "first"), rows=("points", "size"))

MSP_RAW = INGESTED["src_ms_project.tasks"].copy()
MSP_RAW["pid"] = MSP_RAW["text1"].map(norm_code)
MSP = MSP_RAW[MSP_RAW["pid"].notna()].copy()
MSP["hours"] = MSP["work"].map(lambda v: None if is_blank(v) or not re.search(r"PT(\d+)H", str(v)) else float(re.search(r"PT(\d+)H", str(v)).group(1)))
msp_summary = MSP[MSP["summary"] == "1"].drop_duplicates("pid").set_index("pid")
msp_hours = MSP[MSP["summary"] == "0"].groupby("pid")["hours"].sum()
msp_file = MSP.drop_duplicates("pid").set_index("pid")["source_file"]

SS_RAW = INGESTED["src_smartsheet.milestones"].copy()
SS_RAW["pid"] = SS_RAW["project_code"].map(norm_code)
SS = SS_RAW[SS_RAW["pid"].notna()].copy()
ss_golive = SS[SS["milestone_task"] == "Go-Live"].drop_duplicates("pid").set_index("pid")
ss_golive = ss_golive.assign(golive=ss_golive["finish"].map(parse_date))
ss_rag = SS[SS["rag"].notna()].drop_duplicates("pid").set_index("pid")["rag"].map(risk_level)

TR_RAW = INGESTED["src_spreadsheets.bu_tracker"].copy()
TR_RAW["pid"] = TR_RAW["proj"].map(norm_code)
TR = TR_RAW[TR_RAW["pid"].notna()].copy()
TR["fy_end"] = TR["target_live_fy_qtr"].map(parse_fiscal)
TR["budget"] = TR["budget_k"].map(lambda v: None if parse_number(v) is None else parse_number(v) * 1000)
TR["reg"] = TR["regulatory_y_n"].map(yes_no)
TR = TR.drop_duplicates("pid", keep="first").set_index("pid")

DEC_RAW = INGESTED["src_spreadsheets.pmo_decisions"].copy()
DEC_RAW["pid"] = DEC_RAW["project_code"].map(norm_code)
DEC = DEC_RAW[DEC_RAW["pid"].notna()].copy()

REPO_DOCS = json.loads((RAW / "bu_repositories" / "bu_document_index.json").read_text(encoding="utf-8"))
REPO_BY_PID = {}
for doc in REPO_DOCS:
    pid = norm_code(doc.get("projectRef"))
    if pid:
        REPO_BY_PID.setdefault(pid, []).append(doc)

ALLOC_RAW = INGESTED["src_hr_capacity.allocations"].copy()
ALLOC_RAW["pid"] = ALLOC_RAW["projcode"].map(norm_code)
ALLOC_RAW["pct"] = ALLOC_RAW["allocationpct"].map(parse_number)
ALLOC_MONTHS = CONFIG["capacity"]["allocationMonths"]
ALLOC = ALLOC_RAW[ALLOC_RAW["pid"].notna()].copy()
alloc_recent = ALLOC[ALLOC["monthstart"].isin(ALLOC_MONTHS)]
alloc_fte = alloc_recent.groupby(["pid", "skillcode"])["pct"].sum().div(100 * len(ALLOC_MONTHS)).rename("fte").reset_index()
alloc_primary = alloc_fte.sort_values("fte", ascending=False).drop_duplicates("pid").set_index("pid")

COST_RAW = INGESTED["src_cost.project_cost_monthly"].copy()
COST_RAW["pid"] = COST_RAW["projectcode"].map(norm_code)
COST = COST_RAW[COST_RAW["pid"].notna()].copy()
COST["budget"] = COST["budgetusd"].map(parse_number)
cost_annual = COST.groupby("pid")["budget"].sum()

XL_RAW = INGESTED["src_excel_intake.intake_10_signals"].copy()
SIGNAL_COLS = list(XL_RAW.columns[6:16])
XL_RAW["pid"] = XL_RAW["project_id"].map(norm_code)
XL = XL_RAW[XL_RAW["pid"].notna()].drop_duplicates("pid").set_index("pid")
skill_parts = XL[SIGNAL_COLS[4]].map(lambda v: None if is_blank(v) else [part.strip() for part in str(v).split(":", 1)])
XLD = pd.DataFrame(index=XL.index)
XLD["golive"] = XL[SIGNAL_COLS[0]].map(parse_date)
XLD["value"] = XL[SIGNAL_COLS[1]].map(business_value)
XLD["sponsor_code"] = XL[SIGNAL_COLS[2]].map(sponsor_code_from_excel)
XLD["reg"] = XL[SIGNAL_COLS[3]].map(yes_no)
XLD["skill"] = skill_parts.map(lambda parts: None if parts is None or len(parts) < 2 else skill_code_from_name(parts[0]))
XLD["fte"] = skill_parts.map(lambda parts: None if parts is None or len(parts) < 2 else parse_number(parts[1]))
XLD["cost"] = XL[SIGNAL_COLS[5]].map(parse_money)
XLD["deps"] = XL[SIGNAL_COLS[6]].map(parse_number)
XLD["risk"] = XL[SIGNAL_COLS[7]].map(risk_level)
XLD["dt"] = XL[SIGNAL_COLS[8]].map(yes_no)
XLD["effort"] = XL[SIGNAL_COLS[9]].map(parse_number)
XLD["bu"] = XL["business_unit"].map(canon_bu)
XLD["site"] = XL["site"]
XLD["portfolio"] = XL["portfolio"]
XLD["name"] = XL["project_name"]
XLD["sponsor"] = XL["sponsor_name"].map(norm_person)

# %%
EDGES = []
for doc in REPO_DOCS:
    source_pid = norm_code(doc.get("projectRef"))
    if source_pid is None or doc.get("docType") != "DependencyRegister":
        continue
    for dependency in doc.get("dependencies") or []:
        target = norm_code(dependency.get("dependsOnProject"))
        EDGES.append((source_pid, target, dependency.get("linkType") or "FinishToStart", "bu_repositories"))
for issue in JIRA_RAW:
    source_pid = KEY_TO_PID.get(issue["key"])
    for link in (issue.get("fields") or {}).get("issuelinks") or []:
        if (link.get("type") or {}).get("name") == "Blocks":
            target = KEY_TO_PID.get((link.get("outwardIssue") or {}).get("key"))
            if source_pid and target:
                EDGES.append((source_pid, target, "Blocks", "jira"))
for pid, row in TR.iterrows():
    for code in str(row.get("depends_on_codes") or "").split(","):
        target = norm_code(code)
        if target:
            EDGES.append((pid, target, "FinishToStart", "bu_trackers"))
edge_df = pd.DataFrame(EDGES, columns=["from_id", "to_id", "relationship", "source"]).dropna()
edge_df = edge_df[edge_df["from_id"] != edge_df["to_id"]]
edge_table = edge_df.groupby(["from_id", "to_id"]).agg(
    relationship_type=("relationship", "first"),
    evidence_source=("source", lambda s: ",".join(sorted(set(s)))),
    evidence_count=("source", "size"),
).reset_index()
out_degree = edge_table.groupby("from_id")["to_id"].nunique()

SS_PIDS = set(SS["pid"])
ALLOC_PIDS = set(ALLOC["pid"])
DEC_PIDS = set(DEC["pid"])
ALL_IDS = sorted(set(PV.index) | set(PA.index) | set(ado_agg.index) | set(jira_agg.index) | set(msp_summary.index) | set(SS_PIDS) | set(TR.index) | set(cost_annual.index) | set(XLD.index) | set(alloc_primary.index) | set(DEC_PIDS) | set(REPO_BY_PID.keys()))
print(f"canonical project IDs: {len(ALL_IDS)}")
assert len(ALL_IDS) == 100, f"expected 100 projects, found {len(ALL_IDS)}"
