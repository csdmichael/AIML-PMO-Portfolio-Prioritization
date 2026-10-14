# %% [markdown]
# ## Normalization helpers
# Codes, names, dates, money, yes/no, and risk values are normalized here. Mappings come from `ml-model.json`.

# %%
from pyspark.sql.types import BooleanType, DoubleType, LongType, TimestampType


def parse_fiscal(value):
    if is_blank(value):
        return None
    match = re.search(r"FY\s*(\d{2})\s*Q([1-4])", str(value).upper())
    if not match:
        return None
    fiscal_year, quarter = 2000 + int(match.group(1)), int(match.group(2))
    start = pd.Timestamp(year=fiscal_year - 1, month=7, day=1) + pd.DateOffset(months=3 * (quarter - 1))
    return (start + pd.DateOffset(months=3) - pd.Timedelta(days=1)).normalize()


def norm_code(value):
    if is_blank(value):
        return None
    compact = re.sub(r"[\s_]", "", str(value).strip().upper())
    match = re.fullmatch(r"GIS-?(\d{4})", compact)
    return f"GIS-{match.group(1)}" if match else None


def norm_person(value):
    if is_blank(value):
        return None
    text = " ".join(str(value).split())
    if "," in text:
        last, first = [part.strip() for part in text.split(",", 1)]
        text = f"{first} {last}"
    return text


def parse_date(value):
    if is_blank(value):
        return None
    text = str(value).strip()
    for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%d-%b-%y", "%m/%d/%Y %H:%M", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S"):
        try:
            return pd.Timestamp(dt.datetime.strptime(text, fmt)).normalize()
        except ValueError:
            continue
    return parse_fiscal(text)


def parse_number(value):
    if is_blank(value):
        return None
    try:
        return float(str(value).strip().replace(",", ""))
    except ValueError:
        return None


def parse_money(value):
    if is_blank(value):
        return None
    text = str(value).strip().upper().replace("$", "").replace(",", "")
    scale = 1.0
    if text.endswith("M"):
        scale, text = 1e6, text[:-1]
    elif text.endswith("K"):
        scale, text = 1e3, text[:-1]
    number = parse_number(text)
    return None if number is None else number * scale


def yes_no(value):
    if is_blank(value):
        return None
    return MAP["yesNo"].get(str(value).strip().upper())


def risk_level(value):
    if is_blank(value):
        return None
    text = str(value).strip().lower()
    for name, code in MAP["riskRating"].items():
        if name.lower() == text or (len(text) >= 2 and name.lower().startswith(text)):
            return code
    return MAP["ragToRisk"].get(str(value).strip().title())


def business_value(value):
    if is_blank(value):
        return None
    text = str(value).strip()
    lead = re.match(r"(\d)", text)
    if lead:
        return int(lead.group(1))
    return MAP["businessValueText"].get(text.title())


def sponsor_code(level_name):
    return MAP["sponsorLevel"].get(level_name) if level_name else None


def sponsor_code_from_powerapps(value):
    return sponsor_code(MAP["powerAppsSponsorLevel"].get(str(value).strip())) if not is_blank(value) else None


def sponsor_code_from_excel(value):
    return sponsor_code(MAP["excelSponsorLevel"].get(str(value).strip())) if not is_blank(value) else None


def sponsor_code_from_roster(job_level):
    if is_blank(job_level):
        return None
    return MAP["rosterJobLevelSponsor"].get(str(job_level).strip(), MAP["defaultSponsorLevel"])


ROSTER = INGESTED["src_hr_roster.employees"].copy()
KNOWN_BU = {}
for value in pd.concat([ROSTER["orgunit"], INGESTED["src_powerapps.intake_requests"]["cr5f2_businessunit"], INGESTED["src_excel_intake.intake_10_signals"]["business_unit"]]).dropna():
    KNOWN_BU.setdefault(str(value).strip().lower(), str(value).strip())


def canon_bu(value):
    if is_blank(value):
        return None
    return KNOWN_BU.get(str(value).strip().lower(), str(value).strip())


ROSTER_BY_NAME = {str(r["displayname"]).strip().lower(): r for r in ROSTER.to_dict("records") if not is_blank(r["displayname"])}
PORTFOLIOS = PORTFOLIO_CFG["portfolios"]
PORTFOLIO_BY_NAME = {p["displayName"]: p for p in PORTFOLIOS}
PORTFOLIO_BY_KEY = {p["key"]: p for p in PORTFOLIOS}
PORTFOLIO_BY_CODE = {p["code"]: p for p in PORTFOLIOS}
PROGRAM_CODE = {(p["displayName"], prog["displayName"]): prog["code"] for p in PORTFOLIOS for prog in p["programs"]}
JIRA_PREFIX_TO_KEY = {p["jiraProjectKey"]: p["key"] for p in PORTFOLIOS}
MSPROJECT_FILE_TO_KEY = {Path(p["msProjectFile"]).name: p["key"] for p in PORTFOLIOS}
SKILL_NAMES = MAP["skillNames"]
SKILL_CODE_BY_NAME = {name.lower(): code for code, name in SKILL_NAMES.items()}


def skill_code_from_name(name):
    if is_blank(name):
        return None
    text = str(name).strip().lower()
    if text in SKILL_CODE_BY_NAME:
        return SKILL_CODE_BY_NAME[text]
    matches = [code for code, label in SKILL_NAMES.items() if label.lower().startswith(text) or text.startswith(label.lower())]
    return matches[0] if matches else None


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
    return len(pdf)
