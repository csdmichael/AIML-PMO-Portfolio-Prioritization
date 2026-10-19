# %% [markdown]
# ## Features, labels, rules, and the priority-tier model
# Features use only observed signals. The PMO decision history is the training label. The model is LightGBM with
# calibrated probabilities. A multinomial logistic regression is the baseline.

# %%
FEATURE_NAMES = [f["name"] for f in CONFIG["features"]]
TIER_INDEX = {tier: i for i, tier in enumerate(TIERS)}


def urgency(months):
    if is_blank(months):
        return None
    horizon = CONFIG["urgency"]["horizonMonths"]
    return min(1.0, max(0.0, (horizon - months) / horizon))


feat = pd.DataFrame({"project_id": CANON["project_id"]})
feat["timing_urgency"] = CANON["months_to_go_live"].map(urgency).astype(float)
feat["business_value"] = CANON["business_value"].astype(float)
feat["sponsor_priority"] = CANON["sponsor_priority"].astype(float)
feat["regulatory_security"] = CANON["regulatory_security"].astype(float)
feat["user_base"] = CANON["user_base"].map(lambda v: 0.0 if is_blank(v) else math.log10(max(1.0, float(v)))).astype(float)
feat["skill_demand"] = CANON["skill_demand_fte"].astype(float)
feat["cost_log10"] = CANON["cost_usd"].map(lambda v: None if is_blank(v) else math.log10(float(v))).astype(float)
feat["dependencies"] = CANON["dependencies"].astype(float)
feat["risk"] = CANON["risk"].astype(float)
feat["dt_alignment"] = CANON["dt_alignment"].astype(float)
feat["effort"] = CANON["effort_person_weeks"].astype(float)
dq_summary = DQ.groupby("project_id").agg(passed=("passed", "sum"), evaluated=("passed", "size")).reset_index()
feat = feat.merge(dq_summary, on="project_id", how="left")
feat["quality"] = (feat["passed"] / feat["evaluated"]).fillna(0.0)
feat["completeness"] = CANON["signals_present"].values / len(CONFIG["features"])
weights = CONFIG["model"]["sampleWeight"]
feat["sample_weight"] = weights["base"] + weights["completenessQualityWeight"] * feat["completeness"] * feat["quality"]
feat = feat.drop(columns=["passed", "evaluated"])
write_table(feat, "gold.project_features")

# %%
DEC_LABELS = DEC.assign(review_date=DEC["review_date"].map(parse_date)).sort_values("review_date").drop_duplicates("pid", keep="last")
LABELS = DEC_LABELS.rename(columns={"pid": "project_id"})[["project_id", "review_date", "decision_tier"]]
LABELS = LABELS[LABELS["decision_tier"].isin(TIERS)].reset_index(drop=True)
write_table(LABELS, "gold.pmo_decision_labels")

RULES = pd.DataFrame(
    [(r["id"], r["name"], bool(r["enabled"]), json.dumps(r["when"]), json.dumps(r["then"]), r["owner"]) for r in CONFIG["rules"]],
    columns=["rule_id", "rule_name", "enabled", "when_json", "then_json", "owner"],
)
write_table(RULES, "gold.pmo_rules")

# %%
import lightgbm as lgb
import joblib
from sklearn.calibration import CalibratedClassifierCV
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, log_loss
from sklearn.model_selection import StratifiedKFold
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

train = feat.merge(LABELS[["project_id", "decision_tier"]], on="project_id", how="inner")
X = train[FEATURE_NAMES].astype(float)
y = train["decision_tier"].map(TIER_INDEX).astype(int).to_numpy()
sample_weight = train["sample_weight"].to_numpy()
class_counts = np.bincount(y, minlength=len(TIERS))
min_class = int(class_counts[class_counts > 0].min())
cv_cfg = CONFIG["model"]["crossValidation"]
folds = max(cv_cfg["minFoldsWhenClassSmall"], min(cv_cfg["folds"], min_class))
params = CONFIG["model"]["classifier"]["params"]
skf = StratifiedKFold(n_splits=folds, shuffle=True, random_state=params["random_state"])


def full_proba(model, rows):
    proba = np.zeros((rows.shape[0], len(TIERS)))
    proba[:, model.classes_] = model.predict_proba(rows)
    return proba


lgb_scores, lr_scores = [], []
for train_idx, test_idx in skf.split(X, y):
    gbm = lgb.LGBMClassifier(**params)
    gbm.fit(X.iloc[train_idx], y[train_idx], sample_weight=sample_weight[train_idx])
    proba = full_proba(gbm, X.iloc[test_idx])
    lgb_scores.append((accuracy_score(y[test_idx], proba.argmax(1)), f1_score(y[test_idx], proba.argmax(1), average="macro", zero_division=0), log_loss(y[test_idx], proba, labels=list(range(len(TIERS))))))
    baseline = make_pipeline(SimpleImputer(strategy="median"), StandardScaler(), LogisticRegression(max_iter=CONFIG["model"]["baseline"]["maxIter"], C=1 / CONFIG["model"]["baseline"]["regParam"]))
    baseline.fit(X.iloc[train_idx], y[train_idx], logisticregression__sample_weight=sample_weight[train_idx])
    base_proba = np.zeros((len(test_idx), len(TIERS)))
    base_proba[:, baseline.classes_] = baseline.predict_proba(X.iloc[test_idx])
    lr_scores.append((accuracy_score(y[test_idx], base_proba.argmax(1)), f1_score(y[test_idx], base_proba.argmax(1), average="macro", zero_division=0), log_loss(y[test_idx], base_proba, labels=list(range(len(TIERS))))))

lgb_mean = np.mean(lgb_scores, axis=0)
lr_mean = np.mean(lr_scores, axis=0)
final_gbm = lgb.LGBMClassifier(**params)
final_gbm.fit(X, y, sample_weight=sample_weight)
calibration_cv = max(2, min(CONFIG["model"]["calibration"]["cv"], min_class))
calibrated = CalibratedClassifierCV(estimator=lgb.LGBMClassifier(**params), method=CONFIG["model"]["calibration"]["method"], cv=calibration_cv)
calibrated.fit(X, y, sample_weight=sample_weight)
final_gbm.booster_.save_model(str(MODELS / CONFIG["model"]["classifier"]["boosterFile"]))
joblib.dump(calibrated, MODELS / CONFIG["model"]["calibration"]["calibratedFile"])
(MODELS / "feature_names.json").write_text(json.dumps(FEATURE_NAMES), encoding="utf-8")

now = dt.datetime.now(dt.timezone.utc).replace(tzinfo=None)
metric_rows = []
for model_name, scores in ((CONFIG["mlflow"]["modelName"] + "_lightgbm", lgb_mean), ("logistic_regression_baseline", lr_mean)):
    for metric_name, value in zip(["accuracy_cv", "macro_f1_cv", "log_loss_cv"], scores):
        metric_rows.append((model_name, metric_name, float(value), RUN_ID, now))
metric_rows.append((CONFIG["mlflow"]["modelName"] + "_lightgbm", "training_rows", float(len(train)), RUN_ID, now))
METRICS = pd.DataFrame(metric_rows, columns=["model_name", "metric_name", "metric_value", "run_id", "recorded_utc"])
write_table(METRICS, "gold.model_metrics")

try:
    import mlflow
    mlflow.set_experiment(CONFIG["mlflow"]["experiment"])
    with mlflow.start_run(run_name="priority_tier_training"):
        mlflow.log_metrics({f"{row.model_name}.{row.metric_name}": row.metric_value for row in METRICS.itertuples()})
except Exception as error:
    print(f"MLflow logging skipped: {error}")

# %%
summary = {
    "runId": RUN_ID,
    "projects": int(len(CANON)),
    "sourcesIngested": len(INGESTED),
    "tablesWritten": ["silver.project_canonical", "silver.signal_provenance", "gold.source_coverage", "gold.dq_checks", "gold.project_dependencies", "gold.project_features", "gold.pmo_decision_labels", "gold.pmo_rules", "gold.model_metrics"],
    "crossPortfolioDependencies": int(DEP["is_cross_portfolio"].sum()),
    "dependencyEdges": int(len(DEP)),
    "trainingRows": int(len(train)),
    "classCounts": {TIERS[i]: int(c) for i, c in enumerate(class_counts)},
    "cvFolds": int(folds),
    "lightgbmCv": {"accuracy": float(lgb_mean[0]), "macroF1": float(lgb_mean[1]), "logLoss": float(lgb_mean[2])},
    "baselineCv": {"accuracy": float(lr_mean[0]), "macroF1": float(lr_mean[1]), "logLoss": float(lr_mean[2])},
    "dqFailedChecks": int((DQ["passed"] == 0).sum()),
    "signalsPresentDistribution": {int(k): int(v) for k, v in CANON["signals_present"].value_counts().sort_index().items()},
}
(EXPORTS / "notebook01_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
print(json.dumps(summary, indent=2))
