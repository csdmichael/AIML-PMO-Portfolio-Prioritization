# %% [markdown]
# ## Rules, confidence, priority, capacity, and actions
# Rules run in `ruleOrder` and change the tier only as their structured conditions allow. Every match is recorded.

# %%
P = CANON.set_index("project_id").sort_index().copy()
P["ml_tier"] = pd.Series([TIERS[i] for i in PRED_INDEX], index=X.index)
P["model_certainty"] = pd.Series(CERTAINTY, index=X.index)
for i in range(len(TIERS)):
    P[f"prob_{i}"] = PROBA[:, i]
P["final_tier"] = P["ml_tier"]
P["sponsor_level"] = P["sponsor_level_name"]
P["months"] = P["months_to_go_live"].astype(float)
P["regulatory"] = P["regulatory_security"].fillna(0).astype(int)
P["protected"] = P["protected_program"].fillna(0).astype(int)
P["business_value_num"] = P["business_value"].astype(float)
cross_inbound = DEPS[DEPS["is_cross_portfolio"] == 1].groupby("to_project_id")["from_project_id"].nunique()
P["cross_successors"] = [int(cross_inbound.get(pid, 0)) for pid in P.index]


def rule_matches(when, row):
    if "regulatorySecurity" in when and row["regulatory"] != when["regulatorySecurity"]:
        return False
    if "monthsToGoLiveMax" in when and not (row["months"] <= when["monthsToGoLiveMax"]):
        return False
    if "tierIn" in when and row["final_tier"] not in when["tierIn"]:
        return False
    if "sponsorLevel" in when and row["sponsor_level"] != when["sponsorLevel"]:
        return False
    if "businessValueMin" in when and not (row["business_value_num"] >= when["businessValueMin"]):
        return False
    if "protectedProgram" in when and row["protected"] != when["protectedProgram"]:
        return False
    if "crossPortfolioSuccessorsMin" in when and row["cross_successors"] < when["crossPortfolioSuccessorsMin"]:
        return False
    return True


RULE_BY_ID = {rule["id"]: rule for rule in CONFIG["rules"]}
TRIGGERS, OVERRIDES, FLOORS = [], {pid: [] for pid in P.index}, {pid: None for pid in P.index}
for rule_id in CONFIG["ruleOrder"]:
    rule = RULE_BY_ID[rule_id]
    if not rule["enabled"]:
        continue
    for pid, row in P.iterrows():
        if not rule_matches(rule["when"], row):
            continue
        TRIGGERS.append((pid, rule_id, 1))
        then = rule["then"]
        if "setTier" in then and P.at[pid, "final_tier"] != then["setTier"]:
            P.at[pid, "final_tier"] = then["setTier"]
            OVERRIDES[pid].append(rule_id)
        if "priorityFloor" in then:
            FLOORS[pid] = max(FLOORS[pid] or 0, then["priorityFloor"])
            if rule_id not in OVERRIDES[pid]:
                OVERRIDES[pid].append(rule_id)
RULE_TRIGGERS = pd.DataFrame(TRIGGERS, columns=["project_id", "rule_id", "triggered"])
print(f"rule triggers: {RULE_TRIGGERS['rule_id'].value_counts().to_dict()}")

# %%
WEIGHTS = CONFIG["confidence"]["weights"]
dq_totals = DQ.groupby("project_id")["passed"].agg(["sum", "size"])
P["quality"] = (dq_totals["sum"] / dq_totals["size"]).reindex(P.index).fillna(0.0)
P["completeness"] = P["signals_present"] / len(CONFIG["features"])
P["confidence_score"] = (100 * (WEIGHTS["completeness"] * P["completeness"] + WEIGHTS["quality"] * P["quality"] + WEIGHTS["modelCertainty"] * P["model_certainty"])).round(CONFIG["confidence"]["decimals"])
P["confidence_level"] = P["confidence_score"].map(lambda s: next(level["name"] for level in CONFIG["confidence"]["levels"] if s >= level["minScore"]))

# Runtime JSON records are authoritative; the config is only the initial fallback.
# The shared scorer is embedded by fabric/scripts/build_notebooks.py.
WEIGHTS_FILE = CFG_DIR / "priority-weights.json"
RUNTIME_WEIGHTS_FILE = LAKE / PRIORITY_WEIGHTS_PATH
pw_cfg = json.loads(WEIGHTS_FILE.read_text(encoding="utf-8"))
pw_records = json.loads(RUNTIME_WEIGHTS_FILE.read_text(encoding="utf-8")) if RUNTIME_WEIGHTS_FILE.exists() else None
DEFAULT_FIELD_WEIGHTS, PORTFOLIO_WEIGHT_OVERRIDES, PROJECT_WEIGHT_OVERRIDES = priority_weight_settings(pw_cfg, pw_records)

ML_BASE_SCORES = {
    pid: saved_ml_base_score(
        {"tierProbabilities": {key: float(PROBA[i, t]) for t, key in enumerate(TIER_PROBABILITY_KEYS)}}, CONFIG,
    )
    for i, pid in enumerate(X.index)
}
EFFECTIVE_FIELD_WEIGHTS, PRIORITY_WEIGHT_SCOPES = {}, {}
FIELD_SCORES, PRIORITY_SCORES, PRIORITY_SCORE_ERRORS = {}, {}, {}
for pid, row in P.iterrows():
    scope, weights = resolve_priority_weights(
        DEFAULT_FIELD_WEIGHTS, PORTFOLIO_WEIGHT_OVERRIDES, PROJECT_WEIGHT_OVERRIDES,
        project_id=pid, portfolio_key=row.get("portfolio_key"),
    )
    EFFECTIVE_FIELD_WEIGHTS[pid], PRIORITY_WEIGHT_SCOPES[pid] = weights, scope
    try:
        FIELD_SCORES[pid] = compute_field_weighted_score(row, weights, CONFIG)
        PRIORITY_SCORES[pid] = blend_priority_score(ML_BASE_SCORES[pid], FIELD_SCORES[pid], FLOORS[pid])
    except ScoringEvidenceError as exc:
        FIELD_SCORES[pid], PRIORITY_SCORES[pid] = None, None
        PRIORITY_SCORE_ERRORS[pid] = str(exc)
P["ml_base_score"] = pd.Series(ML_BASE_SCORES, dtype=float)
P["field_weighted_score"] = pd.Series(FIELD_SCORES, dtype=float)
P["priority_score"] = pd.Series(PRIORITY_SCORES, dtype=float)
P["priority_floor"] = pd.Series(FLOORS, dtype=float)
P["priority_weight_scope"] = pd.Series(PRIORITY_WEIGHT_SCOPES)
P["priority_score_state"] = ["requires-analysis" if pid in PRIORITY_SCORE_ERRORS else "weighted" for pid in P.index]

# %%
SUPPLY_UTIL = CONFIG["capacity"]["supplyUtilization"]
DEMAND_TIERS = CONFIG["capacity"]["demandTiers"]
SKILL_NAMES = MAP["skillNames"]
roster_supply = ROSTER.groupby("skillfamily")["employeenumber"].nunique()
CAPACITY_ROWS = []
for code, name in SKILL_NAMES.items():
    demand_rows = P[P["final_tier"].isin(DEMAND_TIERS) & (P["primary_skill"] == name)]
    supply = float(roster_supply.get(name, 0)) * SUPPLY_UTIL
    demand = float(demand_rows["skill_demand_fte"].fillna(0).sum())
    CAPACITY_ROWS.append((code, name, supply, demand, supply - demand, int(len(demand_rows))))
CAPACITY = pd.DataFrame(CAPACITY_ROWS, columns=["skill_code", "skill", "supply_fte", "demand_fte", "gap_fte", "projects_in_demand"])
GAP_BY_SKILL = dict(zip(CAPACITY["skill"], CAPACITY["gap_fte"]))


def recommended_action(row):
    for rule in CONFIG["recommendedActions"]:
        when = rule["when"]
        if "tier" in when and row["final_tier"] != when["tier"]:
            continue
        if "primarySkillGapFteBelow" in when and not (GAP_BY_SKILL.get(row["primary_skill"], 0.0) < when["primarySkillGapFteBelow"]):
            continue
        return rule["action"]
    return None


P["recommended_action"] = P.apply(recommended_action, axis=1)
write_table(CAPACITY, "gold.capacity_by_skill")
write_table(RULE_TRIGGERS, "gold.rule_triggers")
