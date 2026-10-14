# %% [markdown]
# ## Clusters, SHAP drivers, predictions, and the portfolio export
# The UI reads `Files/exports/portfolio.json`. Field names follow the UI contract (camelCase, booleans, ISO dates).

# %%
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

FILLED = X.fillna(X.median())
SCALED = StandardScaler().fit_transform(FILLED)
CLUSTERING = CONFIG["clustering"]
KMEANS = KMeans(n_clusters=CLUSTERING["k"], random_state=CLUSTERING["seed"], n_init=10).fit(SCALED)
CLUSTER_NAME = {}
for cluster in range(CLUSTERING["k"]):
    order = np.argsort(-np.abs(KMEANS.cluster_centers_[cluster]))[: CLUSTERING["topFeaturesForName"]]
    CLUSTER_NAME[cluster] = CLUSTERING["nameSeparator"].join(LABEL_BY_FEATURE[FEATURE_NAMES[i]] for i in order)
CLUSTER_IDS = pd.Series(KMEANS.labels_, index=X.index)
P["cluster_id"] = CLUSTER_IDS
P["cluster_name"] = CLUSTER_IDS.map(CLUSTER_NAME)
CLUSTERS = pd.DataFrame({"project_id": X.index, "cluster_id": KMEANS.labels_, "cluster_name": P["cluster_name"].values})
write_table(CLUSTERS, "gold.project_clusters")

# %%
SHAP_DF = pd.DataFrame(SHAP, index=X.index, columns=FEATURE_NAMES)
TOP_DRIVERS, SHAP_ROWS = {}, []
for pid in X.index:
    values = SHAP_DF.loc[pid]
    order = values.abs().sort_values(ascending=False).index.tolist()
    drivers = []
    for rank, feature in enumerate(order, start=1):
        shap_value = float(values[feature])
        direction = "increases" if shap_value >= 0 else "decreases"
        raw = X.loc[pid, feature]
        feature_value = None if pd.isna(raw) else float(raw)
        SHAP_ROWS.append((pid, P.at[pid, "ml_tier"], rank, feature, LABEL_BY_FEATURE[feature], shap_value, feature_value, direction))
        drivers.append({"signalKey": feature, "signalLabel": LABEL_BY_FEATURE[feature], "shapValue": round(shap_value, 4), "direction": direction, "featureValue": feature_value})
    TOP_DRIVERS[pid] = drivers
SHAP_TABLE = pd.DataFrame(SHAP_ROWS, columns=["project_id", "predicted_tier", "rank", "signal_key", "signal_label", "shap_value", "feature_value", "direction"])
write_table(SHAP_TABLE, "gold.project_shap_drivers")

# %%
SOURCE_KEYS = {"planview": "planview", "powerapps": "powerapps", "ado": "ado", "jira": "jira", "ms_project": "msProject", "smartsheet": "smartsheet", "bu_trackers": "buTrackers", "bu_repositories": "buRepositories", "hr_capacity": "hrCapacity", "cost": "cost", "excel_intake": "excelIntake"}
SOURCE_FLAGS = {pid: {} for pid in X.index}
for row in COVERAGE.itertuples():
    SOURCE_FLAGS[row.project_id][SOURCE_KEYS[row.source_name]] = bool(row.present)
SOURCES_TOTAL = len(SOURCE_KEYS)
SOURCES_PRESENT = {pid: sum(flags.values()) for pid, flags in SOURCE_FLAGS.items()}
DATA_ISSUES = DQ[DQ["passed"] == 0].groupby("project_id")["check_id"].apply(lambda s: sorted(set(s))).to_dict()
PORTFOLIO_CODE = dict(zip(P.index, P["portfolio_code"]))
CROSS_LINKS = pd.concat([DEPS.loc[DEPS["is_cross_portfolio"] == 1, "from_project_id"], DEPS.loc[DEPS["is_cross_portfolio"] == 1, "to_project_id"]]).value_counts().to_dict()
TIER_KEYS = ["mustDoNow", "proceed", "canWait", "deprioritize"]
PROB_COLUMNS = ["prob_must_do_now", "prob_proceed", "prob_can_wait", "prob_deprioritize"]
for i, column in enumerate(PROB_COLUMNS):
    P[column] = P[f"prob_{i}"]
RISK_TEXT = {pid: (RISK_NAME_BY_CODE.get(int(v)) if not is_blank(v) else None) for pid, v in P["risk"].items()}
P["rule_overrides"] = ["; ".join(OVERRIDES[pid]) for pid in P.index]
P["top_drivers"] = ["; ".join(f"{d['signalLabel']} ({d['shapValue']:+.2f})" for d in TOP_DRIVERS[pid][:3]) for pid in P.index]
P["data_issues"] = ["; ".join(DATA_ISSUES.get(pid, [])) for pid in P.index]

PREDICTIONS = pd.DataFrame({
    "project_id": P.index,
    "project_name": P["project_name"].values,
    "portfolio_key": P["portfolio_key"].values,
    "portfolio_name": P["portfolio_name"].values,
    "portfolio_code": P["portfolio_code"].values,
    "portfolio_role": P["portfolio_role"].values,
    "program_name": P["program_name"].values,
    "program_code": P["program_code"].values,
    "business_unit": P["business_unit"].values,
    "site": P["site"].values,
    "project_manager": P["project_manager"].values,
    "executive_sponsor": P["executive_sponsor"].values,
    "sponsor_level": P["sponsor_level"].values,
    "project_status": P["project_status"].values,
    "go_live_date": pd.to_datetime(P["go_live_date"]).values,
    "months_to_go_live": P["months"].values,
    "business_value": P["business_value"].astype(float).values,
    "regulatory_security": P["regulatory"].values,
    "dt_alignment": P["dt_alignment"].fillna(0).astype(int).values,
    "protected_program": P["protected"].values,
    "primary_skill": P["primary_skill"].values,
    "skill_demand_fte": P["skill_demand_fte"].astype(float).values,
    "cost_estimate_usd": P["cost_usd"].astype(float).values,
    "dependency_count": P["dependencies"].astype(float).values,
    "risk_rating": [RISK_TEXT[pid] for pid in P.index],
    "effort_person_weeks": P["effort_person_weeks"].astype(float).values,
    "sources_present": [SOURCES_PRESENT[pid] for pid in P.index],
    "sources_total": SOURCES_TOTAL,
    "completeness": P["completeness"].values,
    "quality": P["quality"].values,
    "model_certainty": P["model_certainty"].values,
    "confidence_score": P["confidence_score"].values,
    "confidence_level": P["confidence_level"].values,
    "ml_tier": P["ml_tier"].values,
    "final_tier": P["final_tier"].values,
    "prob_must_do_now": P["prob_must_do_now"].values,
    "prob_proceed": P["prob_proceed"].values,
    "prob_can_wait": P["prob_can_wait"].values,
    "prob_deprioritize": P["prob_deprioritize"].values,
    "priority_score": P["priority_score"].values,
    "rule_overrides": P["rule_overrides"].values,
    "recommended_action": P["recommended_action"].values,
    "cluster_name": P["cluster_name"].values,
    "top_drivers": P["top_drivers"].values,
    "data_issues": P["data_issues"].values,
    "cross_portfolio_link_count": [int(CROSS_LINKS.get(pid, 0)) for pid in P.index],
    "last_scored_utc": pd.Timestamp(SCORED_AT),
})
write_table(PREDICTIONS, "gold.project_predictions")
PREDICTIONS.to_csv(EXPORTS / "project_predictions.csv", index=False)

# %%
def coupled_for(pid):
    items = []
    for row in DEPS.itertuples():
        if row.from_project_id == pid:
            other, direction = row.to_project_id, "predecessor"
        elif row.to_project_id == pid:
            other, direction = row.from_project_id, "successor"
        else:
            continue
        items.append({
            "projectId": other,
            "projectName": P.at[other, "project_name"] if other in P.index else None,
            "portfolioCode": PORTFOLIO_CODE.get(other),
            "relationshipType": row.relationship_type,
            "direction": direction,
            "isCrossPortfolio": bool(row.is_cross_portfolio),
        })
    return items


def project_record(pid):
    r = P.loc[pid]
    tier_probabilities = {key: clean(r[column]) for key, column in zip(TIER_KEYS, PROB_COLUMNS)}
    return {
        "projectId": pid,
        "projectName": r["project_name"],
        "portfolioKey": r["portfolio_key"],
        "portfolio": r["portfolio_name"],
        "portfolioCode": r["portfolio_code"],
        "portfolioRole": r["portfolio_role"],
        "programCode": r["program_code"],
        "program": r["program_name"],
        "businessUnit": r["business_unit"],
        "site": r["site"],
        "projectManager": r["project_manager"],
        "executiveSponsor": r["executive_sponsor"],
        "sponsorLevel": r["sponsor_level"],
        "projectStatus": r["project_status"],
        "goLiveDate": clean(pd.to_datetime(r["go_live_date"])) if not is_blank(r["go_live_date"]) else None,
        "monthsToGoLive": clean(r["months"]),
        "businessValue": clean(r["business_value"]),
        "regulatorySecurity": bool(r["regulatory"]),
        "dtAlignment": bool(r["dt_alignment"]) if not is_blank(r["dt_alignment"]) else False,
        "protectedProgram": bool(r["protected"]),
        "primarySkill": r["primary_skill"],
        "skillDemandFte": clean(r["skill_demand_fte"]),
        "costEstimateUsd": clean(r["cost_usd"]),
        "dependencyCount": clean(r["dependencies"]),
        "riskRating": RISK_TEXT[pid],
        "effortPersonWeeks": clean(r["effort_person_weeks"]),
        "sourcesPresent": SOURCES_PRESENT[pid],
        "sourcesTotal": SOURCES_TOTAL,
        "sources": SOURCE_FLAGS[pid],
        "completeness": clean(r["completeness"]),
        "quality": clean(r["quality"]),
        "modelCertainty": clean(r["model_certainty"]),
        "confidenceScore": clean(r["confidence_score"]),
        "confidenceLevel": r["confidence_level"],
        "mlTier": r["ml_tier"],
        "finalTier": r["final_tier"],
        "tierProbabilities": tier_probabilities,
        "priorityScore": clean(r["priority_score"]),
        "ruleOverrides": OVERRIDES[pid],
        "recommendedAction": r["recommended_action"],
        "cluster": r["cluster_name"],
        "topDrivers": TOP_DRIVERS[pid],
        "dataIssues": DATA_ISSUES.get(pid, []),
        "crossPortfolioLinkCount": int(CROSS_LINKS.get(pid, 0)),
        "coupledProjects": coupled_for(pid),
    }


def metric(model, name):
    rows = METRICS[(METRICS["model_name"] == model) & (METRICS["metric_name"] == name)]
    return float(rows["metric_value"].iloc[0]) if len(rows) else None


LGB_MODEL = CONFIG["mlflow"]["modelName"] + "_lightgbm"
PORTFOLIO_JSON = {
    "generatedAtUtc": SCORED_AT.strftime("%Y-%m-%dT%H:%M:%SZ"),
    "asOfDate": CONFIG["asOfDate"],
    "source": "pmo_lakehouse / gold.project_predictions",
    "mainPortfolio": {"key": PORTFOLIO_CFG["mainPortfolioKey"], "displayName": next(p["displayName"] for p in PORTFOLIO_CFG["portfolios"] if p["key"] == PORTFOLIO_CFG["mainPortfolioKey"])},
    "portfolios": [
        {"key": p["key"], "displayName": p["displayName"], "code": p["code"], "role": p["role"], "projectCount": p["projectCount"], "programs": [{"key": g["key"], "code": g["code"], "displayName": g["displayName"]} for g in p["programs"]]}
        for p in PORTFOLIO_CFG["portfolios"]
    ],
    "projects": [project_record(pid) for pid in X.index],
    "capacityBySkill": [
        {"skill": row.skill, "skillCode": row.skill_code, "supplyFte": clean(row.supply_fte), "demandFte": clean(row.demand_fte), "gapFte": clean(row.gap_fte), "projectsInDemand": int(row.projects_in_demand)}
        for row in CAPACITY.itertuples()
    ],
    "clusters": [
        {"clusterId": int(c), "name": CLUSTER_NAME[c], "projectCount": int((CLUSTER_IDS == c).sum()), "avgConfidence": clean(P.loc[CLUSTER_IDS[CLUSTER_IDS == c].index, "confidence_score"].mean())}
        for c in range(CLUSTERING["k"])
    ],
    "rules": [{"ruleId": r["id"], "name": r["name"], "condition": r["when"], "action": r["then"], "enabled": r["enabled"]} for r in CONFIG["rules"]],
    "modelMetrics": {
        "algorithm": CONFIG["model"]["classifier"]["algorithm"],
        "accuracyCv": metric(LGB_MODEL, "accuracy_cv"),
        "macroF1Cv": metric(LGB_MODEL, "macro_f1_cv"),
        "logLossCv": metric(LGB_MODEL, "log_loss_cv"),
        "trainingRows": int(metric(LGB_MODEL, "training_rows") or 0),
        "features": FEATURE_NAMES,
        "baseline": {
            "algorithm": CONFIG["model"]["baseline"]["algorithm"],
            "accuracyCv": metric("logistic_regression_baseline", "accuracy_cv"),
            "macroF1Cv": metric("logistic_regression_baseline", "macro_f1_cv"),
            "logLossCv": metric("logistic_regression_baseline", "log_loss_cv"),
        },
    },
}
PORTFOLIO_PATH = EXPORTS / CONFIG["exports"]["portfolioJson"]
PORTFOLIO_PATH.write_text(json.dumps(clean(PORTFOLIO_JSON), indent=2, allow_nan=False), encoding="utf-8")
check = json.loads(PORTFOLIO_PATH.read_text(encoding="utf-8"))
assert len(check["projects"]) == len(X.index), "portfolio.json project count mismatch"
REQUIRED_KEYS = {"projectId", "projectName", "portfolio", "businessUnit", "confidenceScore", "confidenceLevel", "finalTier", "topDrivers", "coupledProjects", "sources"}
assert all(REQUIRED_KEYS.issubset(p.keys()) for p in check["projects"]), "portfolio.json is missing required keys"
print(f"portfolio.json written: {len(check['projects'])} projects -> {PORTFOLIO_PATH}")

# %%
summary = {
    "runId": CONFIG["asOfDate"],
    "scoredAtUtc": SCORED_AT.isoformat(),
    "projects": int(len(X.index)),
    "tierCounts": {tier: int((P["final_tier"] == tier).sum()) for tier in TIERS},
    "mlTierCounts": {tier: int((P["ml_tier"] == tier).sum()) for tier in TIERS},
    "confidenceLevelCounts": {level["name"]: int((P["confidence_level"] == level["name"]).sum()) for level in CONFIG["confidence"]["levels"]},
    "rulesFired": RULE_TRIGGERS["rule_id"].value_counts().to_dict(),
    "capacityGapFte": {row.skill: clean(row.gap_fte) for row in CAPACITY.itertuples()},
    "clusters": {str(c): CLUSTER_NAME[c] for c in CLUSTER_NAME},
    "shapRows": int(len(SHAP_TABLE)),
    "portfolioJsonBytes": PORTFOLIO_PATH.stat().st_size,
}
(EXPORTS / "notebook02_summary.json").write_text(json.dumps(clean(summary), indent=2), encoding="utf-8")
print(json.dumps(clean(summary), indent=2))
