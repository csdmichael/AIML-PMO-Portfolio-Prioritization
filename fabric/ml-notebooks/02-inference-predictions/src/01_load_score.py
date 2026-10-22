# %% [markdown]
# # 02 Inference and predictions
# Loads the gold features and the model saved by notebook 01, scores every project with calibrated probabilities and
# SHAP attributions, applies the configured rules, and writes the predictions and the portfolio export used by the UI.

# %%
import json
import math
import datetime as dt
from pathlib import Path

import joblib
import lightgbm as lgb
import numpy as np
import pandas as pd
from pyspark.sql.types import BooleanType, DoubleType, LongType, StringType, StructField, StructType, TimestampType

LAKE = Path("/lakehouse/default")
CFG_DIR = LAKE / "Files" / "config"
EXPORTS = LAKE / "Files" / "exports"
MODELS = LAKE / "Files" / "models"
EXPORTS.mkdir(parents=True, exist_ok=True)
CONFIG = json.loads((CFG_DIR / "ml-model.json").read_text(encoding="utf-8"))
ENTRY_CONFIG = json.loads((CFG_DIR / "data-entry.json").read_text(encoding="utf-8"))
CONFIG["mappings"]["sponsorLevel"].update(ENTRY_CONFIG["options"].get("sponsorLevelScores", {}))
PORTFOLIO_CFG = json.loads((EXPORTS / "analysis-portfolios.json").read_text(encoding="utf-8"))
SCORED_AT = dt.datetime.now(dt.timezone.utc).replace(tzinfo=None)
TIERS = CONFIG["tiers"]["order"]
FEATURE_NAMES = json.loads((MODELS / "feature_names.json").read_text(encoding="utf-8"))
LABEL_BY_FEATURE = {f["name"]: f["label"] for f in CONFIG["features"]}
MAP = CONFIG["mappings"]
SPONSOR_NAME_BY_CODE = {code: name for name, code in MAP["sponsorLevel"].items()}
RISK_NAME_BY_CODE = {code: name for name, code in MAP["riskRating"].items()}


def is_blank(value):
    if value is None:
        return True
    if isinstance(value, str):
        return value.strip() == ""
    try:
        return bool(pd.isna(value))
    except (TypeError, ValueError):
        return False


def clean(value):
    if isinstance(value, dict):
        return {k: clean(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [clean(v) for v in value]
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating, float)):
        return None if math.isnan(float(value)) else float(value)
    if isinstance(value, (np.bool_,)):
        return bool(value)
    if isinstance(value, pd.Timestamp):
        return None if pd.isna(value) else value.strftime("%Y-%m-%d")
    return value


def write_table(pdf, name):
    columns, data = [], {}
    for column in pdf.columns:
        series = pdf[column]
        if series.dtype.kind == "b":
            kind, values = BooleanType(), [None if is_blank(v) else bool(v) for v in series]
        elif series.dtype.kind in "iu":
            kind, values = LongType(), [None if is_blank(v) else int(v) for v in series]
        elif series.dtype.kind == "f":
            kind, values = DoubleType(), [None if is_blank(v) else float(v) for v in series]
        elif series.dtype.kind == "M":
            kind, values = TimestampType(), [None if is_blank(v) else pd.Timestamp(v).to_pydatetime() for v in series]
        else:
            kind, values = StringType(), [None if is_blank(v) else str(v) for v in series]
        columns.append(StructField(column, kind, True))
        data[column] = values
    rows = list(zip(*[data[c] for c in pdf.columns]))
    spark.createDataFrame(rows, schema=StructType(columns)).write.mode("overwrite").saveAsTable(name)
    print(f"{name}: {len(pdf)} rows")


CANON = spark.table("silver.project_canonical").toPandas()
FEATURES = spark.table("gold.project_features").toPandas()
DQ = spark.table("gold.dq_checks").toPandas()
COVERAGE = spark.table("gold.source_coverage").toPandas()
DEPS = spark.table("gold.project_dependencies").toPandas()
METRICS = spark.table("gold.model_metrics").toPandas()
ROSTER = spark.table("src_hr_roster.employees").toPandas()
ALLOC = spark.table("src_hr_capacity.allocations").toPandas()

BOOSTER = lgb.Booster(model_file=str(MODELS / CONFIG["model"]["classifier"]["boosterFile"]))
CALIBRATED = joblib.load(MODELS / CONFIG["model"]["calibration"]["calibratedFile"])

X = FEATURES.set_index("project_id")[FEATURE_NAMES].astype(float).sort_index()
PROBA = np.zeros((len(X), len(TIERS)))
PROBA[:, CALIBRATED.classes_] = CALIBRATED.predict_proba(X)
PRED_INDEX = PROBA.argmax(1)
CERTAINTY = PROBA.max(1)

N_FEATURES = len(FEATURE_NAMES)
N_CLASSES = BOOSTER.num_model_per_iteration()
CONTRIB = BOOSTER.predict(X.values, pred_contrib=True).reshape(len(X), N_CLASSES, N_FEATURES + 1)
SHAP = np.array([CONTRIB[i, PRED_INDEX[i], :N_FEATURES] for i in range(len(X))])
print(f"scored {len(X)} projects; tier counts: {pd.Series([TIERS[i] for i in PRED_INDEX]).value_counts().to_dict()}")
