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
P["sponsor_level"] = P["sponsor_priority"].map(lambda v: None if is_blank(v) else SPONSOR_NAME_BY_CODE.get(int(v)))
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
PRIORITY_WEIGHT = CONFIG["tiers"]["priorityWeight"]
dq_totals = DQ.groupby("project_id")["passed"].agg(["sum", "size"])
P["quality"] = (dq_totals["sum"] / dq_totals["size"]).reindex(P.index).fillna(0.0)
P["completeness"] = P["signals_present"] / len(CONFIG["features"])
P["confidence_score"] = (100 * (WEIGHTS["completeness"] * P["completeness"] + WEIGHTS["quality"] * P["quality"] + WEIGHTS["modelCertainty"] * P["model_certainty"])).round(CONFIG["confidence"]["decimals"])
P["confidence_level"] = P["confidence_score"].map(lambda s: next(level["name"] for level in CONFIG["confidence"]["levels"] if s >= level["minScore"]))

# Load configured field weights from OneLake config or default table
WEIGHTS_FILE = CFG_DIR / "priority-weights.json"
DEFAULT_FIELD_WEIGHTS = {
    "businessValue": 25.0,
    "userBase": 20.0,
    "regulatorySecurity": 15.0,
    "timingUrgency": 15.0,
    "sponsorPriority": 10.0,
    "dtAlignment": 5.0,
    "risk": 5.0,
    "cost": 5.0,
    "dependencies": 0.0,
    "effort": 0.0,
    "skillDemand": 0.0,
}
PROJECT_WEIGHT_OVERRIDES = {}
if WEIGHTS_FILE.exists():
    try:
        pw_cfg = json.loads(WEIGHTS_FILE.read_text(encoding="utf-8"))
        DEFAULT_FIELD_WEIGHTS = pw_cfg.get("defaultWeights", DEFAULT_FIELD_WEIGHTS)
        PROJECT_WEIGHT_OVERRIDES = pw_cfg.get("projectOverrides", {})
    except Exception as exc:
        print(f"Using default priority weights: {exc}")

# Create and persist gold.priority_field_weights table in OneLake
pw_rows = []
for k, v in DEFAULT_FIELD_WEIGHTS.items():
    pw_rows.append(("*", k, k, float(v), True, pd.Timestamp(SCORED_AT)))
for pid, overrides in PROJECT_WEIGHT_OVERRIDES.items():
    for k, v in overrides.items():
        pw_rows.append((pid, k, k, float(v), True, pd.Timestamp(SCORED_AT)))
PW_DF = pd.DataFrame(pw_rows, columns=["project_id", "field_key", "field_label", "weight_percent", "is_active", "updated_at"])
write_table(PW_DF, "gold.priority_field_weights")


def compute_field_weighted_score(row, weights):
    months_val = float(row.get("months") or 36)
    urgency_val = min(1.0, max(0.0, (CONFIG["urgency"]["horizonMonths"] - months_val) / CONFIG["urgency"]["horizonMonths"]))
    factors = {
        "businessValue": (float(row.get("business_value_num") or 1) / 5.0) * 100.0,
        "userBase": min(100.0, max(0.0, (math.log10(max(1.0, float(row.get("user_base") or 10))) / 5.0) * 100.0)),
        "regulatorySecurity": 100.0 if row.get("regulatory") == 1 else 0.0,
        "timingUrgency": urgency_val * 100.0,
        "sponsorPriority": (float(row.get("sponsor_priority") or 1) / 4.0) * 100.0,
        "dtAlignment": 100.0 if row.get("dt_alignment") else 0.0,
        "risk": (float(row.get("risk") or 1) / 4.0) * 100.0,
        "cost": min(100.0, max(0.0, ((math.log10(max(1000.0, float(row.get("cost_usd") or 10000))) - 4.0) / 3.0) * 100.0)),
        "dependencies": min(100.0, float(row.get("dependencies") or 0) * 20.0),
        "effort": min(100.0, float(row.get("effort_person_weeks") or 0) * 2.5),
        "skillDemand": min(100.0, float(row.get("skill_demand_fte") or 0) * 10.0),
    }
    total_w = sum(weights.values()) or 1.0
    score = sum(factors.get(k, 0.0) * weights.get(k, 0.0) for k in weights) / total_w
    return round(score, 1)


ml_base_scores = [
    round(CONFIG["priority"]["scale"] * sum(PROBA[i, t] * PRIORITY_WEIGHT[TIERS[t]] for t in range(len(TIERS))), CONFIG["priority"]["decimals"])
    for i in range(len(P))
]
P["field_weighted_score"] = [
    compute_field_weighted_score(row, PROJECT_WEIGHT_OVERRIDES.get(pid, DEFAULT_FIELD_WEIGHTS))
    for pid, row in P.iterrows()
]
P["priority_score"] = [
    round(0.4 * ml + 0.6 * fw, 1)
    for ml, fw in zip(ml_base_scores, P["field_weighted_score"])
]
P["priority_score"] = [max(score, FLOORS[pid]) if FLOORS[pid] else score for pid, score in zip(P.index, P["priority_score"])]

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
