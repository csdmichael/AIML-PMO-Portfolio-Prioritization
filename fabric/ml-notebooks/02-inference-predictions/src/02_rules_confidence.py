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
P["priority_score"] = [
    round(CONFIG["priority"]["scale"] * sum(PROBA[i, t] * PRIORITY_WEIGHT[TIERS[t]] for t in range(len(TIERS))), CONFIG["priority"]["decimals"])
    for i in range(len(P))
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
