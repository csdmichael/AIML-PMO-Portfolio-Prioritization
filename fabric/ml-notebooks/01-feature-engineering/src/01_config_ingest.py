# %% [markdown]
# # 01 Feature engineering and training
# Ingests every raw extract into its own `src_<source>` schema, builds the canonical project model with provenance,
# data-quality checks, the dependency graph, features, and the priority-tier model. Thresholds, mappings, and
# rules come from `Files/config`, not from this notebook.

# %%
try:
    import lightgbm  # noqa: F401
except ImportError:
    import subprocess
    import sys

    subprocess.run([sys.executable, "-m", "pip", "install", "-q", "lightgbm"], check=False)

# %%
import ast
import json
import math
import re
import uuid
import datetime as dt
from pathlib import Path
import xml.etree.ElementTree as ET

import numpy as np
import pandas as pd
from pyspark.sql.types import StructType, StructField, StringType

LAKE = Path("/lakehouse/default")
CFG_DIR = LAKE / "Files" / "config"
CONFIG = json.loads((CFG_DIR / "ml-model.json").read_text(encoding="utf-8"))
BASE_SPONSOR_NAMES = {score: name for name, score in CONFIG["mappings"]["sponsorLevel"].items()}
ENTRY_CONFIG = json.loads((CFG_DIR / "data-entry.json").read_text(encoding="utf-8"))
CONFIG["mappings"]["sponsorLevel"].update(ENTRY_CONFIG["options"].get("sponsorLevelScores", {}))
SOURCES = json.loads((CFG_DIR / "data-sources.json").read_text(encoding="utf-8"))
PORTFOLIO_CFG = json.loads((CFG_DIR / "portfolios.json").read_text(encoding="utf-8"))
RAW = LAKE / SOURCES["lakehouseRawRoot"]
EXPORTS = LAKE / "Files" / "exports"
MODELS = LAKE / "Files" / "models"
EXPORTS.mkdir(parents=True, exist_ok=True)
MODELS.mkdir(parents=True, exist_ok=True)
AS_OF = pd.Timestamp(CONFIG["asOfDate"])
RUN_ID = str(uuid.uuid4())
TIERS = CONFIG["tiers"]["order"]
MAP = CONFIG["mappings"]

# %%
for src in SOURCES["sources"]:
    spark.sql(f"CREATE SCHEMA IF NOT EXISTS {src['lakehouseSchema']}")
for schema in ("silver", "gold"):
    spark.sql(f"CREATE SCHEMA IF NOT EXISTS {schema}")


def clean_name(name):
    return re.sub(r"[^0-9a-zA-Z]+", "_", str(name)).strip("_").lower()


def parse_msproject(path):
    ns = {"p": "http://schemas.microsoft.com/project"}
    tags = ["UID", "ID", "Name", "Summary", "OutlineLevel", "Start", "Finish", "Duration", "PercentComplete", "Work", "Milestone", "Text1"]
    rows = []
    for task in ET.parse(path).getroot().findall(".//p:Task", ns):
        row = {tag: task.findtext(f"p:{tag}", default=None, namespaces=ns) for tag in tags}
        row["PredecessorUID"] = ";".join(link.findtext("p:PredecessorUID", default="", namespaces=ns) for link in task.findall("p:PredecessorLink", ns))
        rows.append(row)
    return pd.DataFrame(rows)


def read_extract(rel_path, table):
    path = RAW / rel_path
    suffix = path.suffix.lower()
    if suffix == ".csv":
        df = pd.read_csv(path, dtype=str, keep_default_na=False)
    elif suffix == ".xlsx":
        df = pd.read_excel(path, sheet_name=table.get("sheet", 0), header=table.get("headerRow", 1) - 1, dtype=str)
    elif suffix == ".json":
        payload = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(payload, dict) and "value" in payload:
            records = payload["value"]
        elif isinstance(payload, dict) and "issues" in payload:
            records = payload["issues"]
        else:
            records = payload
        df = pd.json_normalize(records)
    elif suffix == ".xml":
        df = parse_msproject(path)
    else:
        raise ValueError(f"Unsupported extract: {rel_path}")
    df["source_file"] = path.name
    return df


def is_blank(value):
    if value is None:
        return True
    if isinstance(value, str):
        return value.strip() == ""
    try:
        return bool(pd.isna(value))
    except (TypeError, ValueError):
        return False


def stringify(df):
    out = pd.DataFrame(index=df.index)
    for column in df.columns:
        out[clean_name(column)] = df[column].map(lambda v: None if is_blank(v) else str(v))
    return out


INGESTED = {}
for src in SOURCES["sources"]:
    for table in src["tables"]:
        frames = [read_extract(rel, table) for rel in table["files"]]
        pdf = stringify(pd.concat(frames, ignore_index=True))
        name = f"{src['lakehouseSchema']}.{table['name']}"
        schema = StructType([StructField(c, StringType(), True) for c in pdf.columns])
        spark.createDataFrame(pdf.astype(object).where(pd.notnull(pdf), None), schema=schema).write.mode("overwrite").saveAsTable(name)
        INGESTED[name] = pdf
        print(f"{name}: {len(pdf)} rows, {len(pdf.columns)} columns")
