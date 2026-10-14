#!/usr/bin/env python3
"""Generates deterministic synthetic PMO source extracts under data/.

Names, rates, counts, and labels come from JSON config. The ground-truth tiers are kept in memory and are never written.
Run: python generate_pmo_data.py
"""

from __future__ import annotations

import csv
import datetime as dt
import json
import math
import random
from pathlib import Path
from xml.etree import ElementTree as ET

import openpyxl

HERE = Path(__file__).resolve().parent
REPO = HERE.parent


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


GEN = load(HERE / "config" / "data-generation.json")
PORTFOLIO_CFG = load(REPO / "config" / "portfolios.json")
PORTFOLIOS = PORTFOLIO_CFG["portfolios"]
COUPLING = PORTFOLIO_CFG["coupling"]
OPTIONS = load(REPO / "config" / "data-entry.json")["options"]
SOURCES = {s["key"]: s for s in load(REPO / "config" / "data-sources.json")["sources"]}
OUT = REPO / GEN["outputRoot"]
ASOF = dt.date.fromisoformat(GEN["asOfDate"])
RNG = random.Random(GEN["seed"])
MSG = GEN["messiness"]
INC = GEN["inclusion"]
DIST = GEN["distributions"]
TIERS = GEN["decisionTiers"]
RISK = GEN["riskNames"]
SKILLS = {s["key"]: s for s in OPTIONS["skills"]}
BU_CODES = GEN["businessUnitCodes"]
MS_NS = "http://schemas.microsoft.com/project"
MAP = GEN["mappings"]
SPONSOR_LEVEL_CODE = MAP["sponsorLevelCodes"]
SPONSOR_LEVEL_TEXT = MAP["powerAppsSponsorLevel"]
SPONSOR_LEVEL_SHORT = MAP["excelSponsorLevel"]
EXCEL_VALUE_TEXT = MAP["excelValueText"]
ROSTER: list[dict] = []
USED_NAMES: set[str] = set()


def chance(share: float) -> bool:
    return RNG.random() < share


def pick_weighted(weights: dict):
    keys = list(weights)
    return RNG.choices(keys, weights=[weights[k] for k in keys], k=1)[0]


def lognormal(cfg: dict) -> float:
    value = cfg["median"] * math.exp(cfg["sigma"] * RNG.gauss(0, 1))
    return min(cfg["max"], max(cfg["min"], value))


def zscores(values: list[float]) -> list[float]:
    mean = sum(values) / len(values)
    sd = (sum((v - mean) ** 2 for v in values) / len(values)) ** 0.5 or 1.0
    return [(v - mean) / sd for v in values]


def mdy(d: dt.date) -> str:
    return d.strftime("%m/%d/%Y")


def dmy(d: dt.date) -> str:
    return d.strftime("%d-%b-%y")


def fiscal_label(d: dt.date) -> str:
    fy = d.year + 1 if d.month >= 7 else d.year
    quarter = ((d.month - 7) % 12) // 3 + 1
    return f"FY{fy % 100:02d} Q{quarter}"


def random_date(start: dt.date, end: dt.date) -> dt.date:
    return start + dt.timedelta(days=RNG.randint(0, (end - start).days))


def utc_stamp(d: dt.date) -> str:
    return f"{d.isoformat()}T{RNG.randint(8, 17):02d}:{RNG.randint(0, 59):02d}:00Z"


def fmt_cost(cost: float) -> str:
    return f"${cost:,.0f}" if chance(0.5) else f"{cost / 1e6:.2f}M"


def last_first(name: str) -> str:
    first, last = name.split(" ", 1)
    return f"{last}, {first}"


def write_csv(path: Path, header: list[str], rows: list[list]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(header)
        writer.writerows(rows)


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def write_xlsx(path: Path, sheet: str, rows: list[list]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    workbook = openpyxl.Workbook()
    worksheet = workbook.active
    worksheet.title = sheet
    for row in rows:
        worksheet.append(row)
    workbook.save(path)


def table_path(source_key: str, table: str, file_index: int = 0) -> Path:
    spec = next(t for t in SOURCES[source_key]["tables"] if t["name"] == table)
    return OUT / spec["files"][file_index]


def tracker_path(code: str) -> Path:
    spec = next(t for t in SOURCES["spreadsheets"]["tables"] if t["name"] == "bu_tracker")
    return OUT / next(f for f in spec["files"] if f.endswith(f"_{code}.xlsx"))


def new_person(title: str, level: str, job_level: str, org: str, site: str) -> dict:
    names = GEN["names"]
    while True:
        first = RNG.choice(names["firstNames"])
        last = RNG.choice(names["lastNames"])
        name = f"{first} {last}"
        if name not in USED_NAMES:
            USED_NAMES.add(name)
            break
    person = {
        "number": 10001 + len(ROSTER),
        "name": name,
        "email": f"{first.lower()}.{last.lower()}@{names['emailDomain']}",
        "title": title,
        "level": level,
        "jobLevel": job_level,
        "skill": SKILLS[pick_weighted(DIST["skillWeights"])],
        "org": org,
        "site": site,
    }
    ROSTER.append(person)
    return person


def build_roster() -> tuple[list[dict], list[dict], list[dict]]:
    names, counts = GEN["names"], GEN["roster"]
    bus, sites = OPTIONS["businessUnits"], OPTIONS["sites"]
    executives = [
        new_person(names["executiveTitles"][i % len(names["executiveTitles"])], "Executive", "VP", RNG.choice(bus), RNG.choice(sites))
        for i in range(counts["executives"])
    ]
    directors = [
        new_person(names["directorTitles"][i % len(names["directorTitles"])], "Director", "M3", RNG.choice(bus), RNG.choice(sites))
        for i in range(counts["directors"])
    ]
    pms = [
        new_person(RNG.choice(names["pmTitles"]), "Manager", RNG.choice(["M1", "M2"]), RNG.choice(bus), RNG.choice(sites))
        for _ in range(counts["projectManagers"])
    ]
    for _ in range(counts["engineers"]):
        new_person(RNG.choice(names["engineerTitles"]), "Individual", f"IC{RNG.randint(1, 6)}", RNG.choice(bus), RNG.choice(sites))
    return executives, directors, pms


def pick_go_live_months() -> float:
    buckets = DIST["goLiveBuckets"]
    bucket = RNG.choices(buckets, weights=[b["share"] for b in buckets], k=1)[0]
    return RNG.uniform(bucket["minMonths"], bucket["maxMonths"])


def build_projects(executives: list[dict], directors: list[dict], pms: list[dict]) -> list[dict]:
    names = GEN["names"]
    combos = [(a, n, s) for a in names["adjectives"] for n in names["nouns"] for s in names["suffixes"]]
    RNG.shuffle(combos)
    projects: list[dict] = []
    index = 0
    for portfolio in PORTFOLIOS:
        for _ in range(portfolio["projectCount"]):
            index += 1
            adjective, noun, suffix = combos[index - 1]
            months = pick_go_live_months()
            sponsor = RNG.choice(executives) if chance(0.35) else RNG.choice(directors)
            bu = RNG.choice(OPTIONS["businessUnits"])
            projects.append(
                {
                    "id": f"GIS-{index:04d}",
                    "index": index,
                    "name": f"{adjective} {noun} {suffix}",
                    "portfolio": portfolio,
                    "program": RNG.choice(portfolio["programs"]),
                    "bu": bu,
                    "bu_code": BU_CODES[bu],
                    "site": RNG.choice(OPTIONS["sites"]),
                    "sponsor": sponsor,
                    "sponsor_level": SPONSOR_LEVEL_CODE[sponsor["level"]],
                    "pm": RNG.choice(pms),
                    "status": pick_weighted(DIST["statusWeights"]),
                    "months": months,
                    "go_live": ASOF + dt.timedelta(days=round(months * 30.44)),
                    "value": int(pick_weighted(DIST["value"])),
                    "risk": int(pick_weighted(DIST["risk"])),
                    "reg": 1 if chance(DIST["regulatoryShare"]) else 0,
                    "dt": 1 if chance(DIST["dtShare"]) else 0,
                    "protected": 1 if chance(DIST["protectedShare"]) else 0,
                    "skill": SKILLS[pick_weighted(DIST["skillWeights"])],
                    "fte": round(RNG.uniform(*DIST["fteRange"]), 1),
                    "cost": lognormal(GEN["lognormal"]["cost"]),
                    "effort": round(lognormal(GEN["lognormal"]["effort"]), 1),
                    "strategic": RNG.choice(["DT Initiative", "GIS Priority", "None"]),
                    "excel_only": False,
                    "deps": 0,
                    "edges": [],
                }
            )
    for project in RNG.sample(projects, GEN["excelOnlyCount"]):
        project["excel_only"] = True
    return projects


def build_edges(projects: list[dict]) -> None:
    eligible = [p for p in projects if not p["excel_only"]]
    main = [p for p in eligible if p["portfolio"]["role"] == "main"]
    coupled = [p for p in eligible if p["portfolio"]["role"] == "coupled"]
    relationship_types = OPTIONS["relationshipTypes"]
    for project in eligible:
        if project["portfolio"]["role"] == "main":
            low, high = COUPLING["linksFromMainProjectMin"], COUPLING["linksFromMainProjectMax"]
            pool = coupled
        else:
            low, high = COUPLING["linksFromCoupledProjectMin"], COUPLING["linksFromCoupledProjectMax"]
            same_portfolio = [q for q in coupled if q["portfolio"]["key"] == project["portfolio"]["key"]]
            pool = main if chance(0.7) else same_portfolio
        candidates = [q for q in pool if q is not project]
        count = min(RNG.randint(low, high), len(candidates))
        for target in RNG.sample(candidates, count):
            project["edges"].append({"to": target["id"], "type": RNG.choice(relationship_types)})
    for project in projects:
        project["deps"] = len(project["edges"])


def assign_inclusion(projects: list[dict]) -> None:
    portfolio_sources = ("planview", "ado", "jira", "ms_project")
    for project in projects:
        flags = {key: (not project["excel_only"]) and chance(share) for key, share in INC.items()}
        if not project["excel_only"] and not any(flags[key] for key in portfolio_sources):
            flags["planview"] = True
        if not project["excel_only"] and not any(flags.values()):
            flags["planview"] = True
        project["inc"] = flags


def score_and_truth(projects: list[dict]) -> None:
    weights = GEN["latentScore"]["weights"]
    horizon = GEN["latentScore"]["urgencyHorizonMonths"]
    z_value = zscores([p["value"] for p in projects])
    z_sponsor = zscores([p["sponsor_level"] for p in projects])
    z_cost = zscores([math.log(p["cost"]) for p in projects])
    z_deps = zscores([p["deps"] for p in projects])
    z_risk = zscores([p["risk"] for p in projects])
    z_effort = zscores([p["effort"] for p in projects])
    for i, p in enumerate(projects):
        urgency = min(1.0, max(0.0, (horizon - p["months"]) / horizon))
        p["latent"] = (
            weights["value"] * z_value[i]
            + weights["sponsor"] * z_sponsor[i]
            + weights["regulatory"] * p["reg"]
            + weights["dt"] * p["dt"]
            + weights["urgency"] * urgency
            + weights["cost"] * z_cost[i]
            + weights["dependencies"] * z_deps[i]
            + weights["risk"] * z_risk[i]
            + weights["effort"] * z_effort[i]
            + RNG.gauss(0, GEN["latentScore"]["noiseSigma"])
        )
    cut = GEN["tierCutoffs"]
    n = len(projects)
    ranked = sorted(projects, key=lambda p: -p["latent"])
    top = {p["id"] for p in ranked[: round(n * cut["mustDoNowTopShare"])]}
    bottom_candidate = {p["id"] for p in ranked[-round(n * cut["candidateBottomShare"]):]}
    bottom_can_wait = {p["id"] for p in ranked[-round(n * cut["canWaitBottomShare"]):]}
    for p in projects:
        if (p["reg"] == 1 and p["months"] <= 18) or (p["sponsor_level"] == 4 and p["value"] >= 4) or p["id"] in top:
            p["truth_tier"] = TIERS[0]
        elif p["id"] in bottom_candidate or (p["status"] == "On Hold" and p["risk"] >= cut["deprioritizeOnHoldRisk"]):
            p["truth_tier"] = TIERS[3]
        elif p["months"] >= cut["canWaitMonthsFrom"] or p["id"] in bottom_can_wait:
            p["truth_tier"] = TIERS[2]
        else:
            p["truth_tier"] = TIERS[1]


def write_planview(projects: list[dict]) -> None:
    header = ["PortfolioItemId", "ProjectCode", "ProjectName", "Portfolio", "ProgramName", "BusinessUnit", "Site", "ProjectManager", "ExecutiveSponsor", "ExecutiveSponsorEmail", "ProjectStatus", "PlannedGoLive", "BenefitScore", "EstimatedCostUSD", "RiskLevel", "DependencyCount", "ProtectedProgram", "StrategicTag", "PrimarySkill", "SkillDemandFTE"]
    rows = []
    for p in projects:
        if not p["inc"]["planview"]:
            continue
        code = p["id"].lower().replace("-", "") if chance(MSG["planviewCode"]) else p["id"]
        bu = p["bu"].lower() if chance(MSG["planviewBusinessUnit"]) else p["bu"]
        sponsor = last_first(p["sponsor"]["name"]) if chance(MSG["sponsorLastFirst"]) else p["sponsor"]["name"]
        cost = fmt_cost(p["cost"]) if chance(MSG["planviewCostString"]) else str(round(p["cost"]))
        go_live = "" if chance(MSG["planviewBlankGoLive"]) else mdy(p["go_live"])
        benefit = "" if chance(MSG["planviewBlankBenefit"]) else str(p["value"])
        risk = RISK[p["risk"] - 1]
        if chance(MSG["planviewRiskAbbrev"]):
            risk = {"Medium": "Med", "High": "Hi"}.get(risk, risk)
        if chance(MSG["planviewBlankRisk"]):
            risk = ""
        deps = "" if chance(MSG["planviewBlankDeps"]) else str(p["deps"])
        rows.append([
            f"PV-{10000 + p['index']}", code, p["name"], p["portfolio"]["displayName"], p["program"]["displayName"],
            bu, p["site"], p["pm"]["name"], sponsor, p["sponsor"]["email"], p["status"], go_live, benefit, cost,
            risk, deps, "Y" if p["protected"] else "N", p["strategic"], p["skill"]["displayName"], f"{p['fte']:.1f}",
        ])
    write_csv(table_path("planview", "portfolio_items"), header, rows)


def powerapps_record(p: dict, seq: int, resubmission: bool) -> dict:
    submitted = random_date(dt.date(2026, 1, 5), dt.date(2026, 9, 30))
    if resubmission:
        submitted = random_date(submitted, dt.date(2026, 10, 10))
    code = p["id"].lower().replace("-", "") if chance(MSG["powerappsCode"]) else p["id"]
    return {
        "cr5f2_intakerequestid": f"INT-2026-{seq:04d}",
        "cr5f2_projectcode": code,
        "cr5f2_requesttitle": p["name"],
        "cr5f2_businessunit": p["bu"],
        "cr5f2_requestedby": p["pm"]["name"],
        "cr5f2_sponsoremail": p["sponsor"]["email"],
        "cr5f2_sponsorlevel": SPONSOR_LEVEL_TEXT[p["sponsor"]["level"]],
        "cr5f2_businessvalue": "High" if p["value"] >= 4 else ("Medium" if p["value"] == 3 else "Low"),
        "cr5f2_regulatorycompliance": bool(p["reg"]),
        "cr5f2_dtinitiative": bool(p["dt"]),
        "cr5f2_targetgolive": p["go_live"].isoformat(),
        "cr5f2_estimatedcostk": round(p["cost"] / 1000),
        "cr5f2_submittedon": utc_stamp(submitted),
        "cr5f2_status": RNG.choice(["Submitted", "Under Review", "Approved"]),
    }


def write_powerapps(projects: list[dict]) -> None:
    records, seq = [], 0
    for p in projects:
        if not p["inc"]["powerapps"]:
            continue
        seq += 1
        records.append(powerapps_record(p, seq, resubmission=False))
        if chance(MSG["powerappsResubmission"]):
            seq += 1
            records.append(powerapps_record(p, seq, resubmission=True))
    payload = {"@odata.context": GEN["sourceContext"]["powerapps"], "value": records}
    write_json(table_path("powerapps", "intake_requests"), payload)


def write_ado(projects: list[dict]) -> None:
    header = ["ID", "Work Item Type", "Title", "State", "Area Path", "Iteration Path", "Story Points", "Priority", "Tags", "Custom.ProjectCode", "Created Date", "Target Date"]
    rows, item_id = [], 20000
    for p in projects:
        if not p["inc"]["ado"]:
            continue
        for k in range(RNG.randint(3, 9)):
            item_id += 1
            kind = "Epic" if k == 0 else RNG.choice(GEN["workItemTypes"])
            tags = [t for t, flag in (("dt-initiative", p["dt"]), ("regulatory", p["reg"]), ("network", p["skill"]["key"] == "NET"), ("data", p["skill"]["key"] == "DATA")) if flag]
            code = p["id"].lower().replace("-", "") if chance(MSG["adoCode"]) else p["id"]
            created = random_date(dt.date(2026, 2, 1), dt.date(2026, 9, 30))
            target = "" if chance(MSG["adoBlankTarget"]) else f"{p['go_live'].isoformat()}T00:00:00Z"
            rows.append([
                item_id, kind, f"{p['name']} - {kind} {k}", RNG.choice(GEN["backlogStates"]),
                f"GIS\\{p['portfolio']['code']}\\{p['program']['code']}", f"GIS\\PI-26Q4\\Sprint {RNG.randint(1, 6)}",
                "" if kind == "Epic" or chance(0.10) else RNG.choice([1, 2, 3, 5, 8, 13]), RNG.randint(1, 4),
                ";".join(tags), code, utc_stamp(created), target,
            ])
    write_csv(table_path("ado", "work_items"), header, rows)


def write_jira(projects: list[dict]) -> None:
    issues: list[dict] = []
    counters: dict[str, int] = {}
    by_id = {p["id"]: p for p in projects}

    def next_key(portfolio: dict) -> str:
        prefix = portfolio["jiraProjectKey"]
        counters[prefix] = counters.get(prefix, 1000) + 1
        return f"{prefix}-{counters[prefix]}"

    def make_issue(p: dict, kind: str, summary: str, links: list[str]) -> dict:
        key = next_key(p["portfolio"])
        code = p["id"].lower().replace("-", " ") if chance(MSG["jiraCode"]) else p["id"]
        sprint = None if chance(0.20) else [{"id": RNG.randint(30, 60), "name": f"{p['portfolio']['jiraProjectKey']} Sprint {RNG.randint(10, 20)}", "state": "active"}]
        return {
            "key": key,
            "id": str(10000 + len(issues) + 1),
            "fields": {
                "summary": summary,
                "issuetype": {"name": kind},
                "status": {"name": RNG.choice(GEN["jiraStatuses"])},
                "priority": {"name": RNG.choice(GEN["jiraPriorities"])},
                "labels": ["dt-initiative"] if p["dt"] else [],
                "duedate": None if chance(0.20) else p["go_live"].isoformat(),
                "created": f"{random_date(dt.date(2026, 2, 1), dt.date(2026, 9, 30)).isoformat()}T10:14:00.000+0000",
                "customfield_10050": code,
                "customfield_10016": None if chance(0.15) else RNG.choice([1, 2, 3, 5, 8]),
                "customfield_10020": sprint,
                "issuelinks": [{"type": {"name": "Blocks"}, "outwardIssue": {"key": k}} for k in links],
            },
        }

    stub_for: dict[str, str] = {}
    for p in projects:
        if not p["inc"]["jira"]:
            continue
        count = RNG.randint(3, 12)
        for k in range(count):
            links: list[str] = []
            if k == 0:
                for edge in p["edges"]:
                    target = by_id[edge["to"]]
                    if edge["to"] not in stub_for:
                        stub = make_issue(target, "Story", f"Dependency stub for {target['name']}", [])
                        stub_for[edge["to"]] = stub["key"]
                        issues.append(stub)
                    links.append(stub_for[edge["to"]])
            kind = "Epic" if k == 0 else RNG.choice(GEN["jiraTypes"])
            issues.append(make_issue(p, kind, f"{p['name']} - work item {k + 1}", links))
    write_json(table_path("jira", "issues"), {
        "expand": "schema,names", "startAt": 0, "maxResults": 1000, "total": len(issues), "issues": issues,
    })


def write_ms_project(projects: list[dict]) -> None:
    for portfolio in PORTFOLIOS:
        ET.register_namespace("", MS_NS)
        root = ET.Element(f"{{{MS_NS}}}Project")
        ET.SubElement(root, f"{{{MS_NS}}}Name").text = portfolio["displayName"]
        tasks = ET.SubElement(root, f"{{{MS_NS}}}Tasks")
        uid = 0
        for p in projects:
            if p["portfolio"]["key"] != portfolio["key"] or not p["inc"]["ms_project"]:
                continue
            start = p["go_live"] - dt.timedelta(days=RNG.randint(120, 260))
            uid += 1
            _task(tasks, uid, uid, f"{p['id']} {p['name']}", True, 1, start, p["go_live"], None, 1, 0, p["id"])
            previous = None
            for k in range(RNG.randint(3, 8)):
                uid += 1
                sub_start = start + dt.timedelta(days=k * 14)
                sub_finish = sub_start + dt.timedelta(days=14)
                work_hours = RNG.randint(40, 320)
                _task(tasks, uid, uid, f"{p['id']} work package {k + 1}", False, 2, sub_start, sub_finish, work_hours, RNG.randint(0, 100), 0, p["id"], predecessor=previous)
                previous = uid
        path = OUT / portfolio["msProjectFile"]
        path.parent.mkdir(parents=True, exist_ok=True)
        ET.ElementTree(root).write(path, encoding="utf-8", xml_declaration=True)


def _task(parent, uid, task_id, name, summary, level, start, finish, work_hours, pct, milestone, text1, predecessor=None) -> None:
    task = ET.SubElement(parent, f"{{{MS_NS}}}Task")
    fields = {
        "UID": str(uid), "ID": str(task_id), "Name": name, "Summary": "1" if summary else "0",
        "OutlineLevel": str(level), "Start": f"{start.isoformat()}T08:00:00",
        "Finish": f"{finish.isoformat()}T17:00:00",
        "Duration": f"PT{max(1, (finish - start).days) * 8}H0M0S",
        "PercentComplete": str(pct), "Milestone": str(milestone), "Text1": text1,
    }
    if work_hours is not None:
        fields["Work"] = f"PT{work_hours}H0M0S"
    for key, value in fields.items():
        ET.SubElement(task, f"{{{MS_NS}}}{key}").text = value
    if predecessor is not None:
        link = ET.SubElement(task, f"{{{MS_NS}}}PredecessorLink")
        ET.SubElement(link, f"{{{MS_NS}}}PredecessorUID").text = str(predecessor)
        ET.SubElement(link, f"{{{MS_NS}}}Type").text = "1"


def write_smartsheet(projects: list[dict]) -> None:
    header = ["Row ID", "Project Code", "Milestone / Task", "Row Type", "Owner", "Start", "Finish", "Duration (days)", "% Complete", "RAG", "Predecessors", "Last Modified"]
    rows, row_id = [], 5000
    for p in projects:
        if not p["inc"]["smartsheet"]:
            continue
        code = f"GIS {p['index']:04d}"
        row_id += 1
        milestone_id = row_id
        rag = "" if chance(MSG["smartsheetBlankRag"]) else RNG.choice(GEN["ragValues"])
        modified = f"{RNG.randint(1, 12)}/{RNG.randint(1, 28)}/2026 {RNG.randint(8, 17):02d}:{RNG.randint(0, 59):02d}"
        rows.append([milestone_id, code, "Go-Live", "Milestone", p["pm"]["name"], dmy(p["go_live"]), dmy(p["go_live"]), 0, RNG.choice([0, 25, 50]), rag, "", modified])
        for k in range(RNG.randint(2, 6)):
            row_id += 1
            start = p["go_live"] - dt.timedelta(days=RNG.randint(60, 240) + k * 10)
            finish = start + dt.timedelta(days=RNG.randint(10, 45))
            rows.append([row_id, code, f"Workstream {k + 1}", "Task", p["pm"]["name"], dmy(start), dmy(finish), (finish - start).days, RNG.randint(0, 100), rag, str(milestone_id) if k == 0 else "", modified])
    write_csv(table_path("smartsheet", "milestones"), header, rows)


def write_trackers(projects: list[dict]) -> None:
    wb = GEN["workbook"]
    for code in ("FAB-OPS", "SPE", "DT", "SUPPLY"):
        rows = [[f"{wb['trackerTitlePrefix']} - {code}"], [], wb["trackerHeader"]]
        for p in projects:
            if p["bu_code"] != code or not p["inc"]["bu_trackers"]:
                continue
            code_cell = p["id"].lower().replace("-", "") if chance(MSG["trackerCode"]) else p["id"]
            reg = ("Yes" if p["reg"] else "No") if chance(MSG["trackerRegulatoryYesNo"]) else ("Y" if p["reg"] else "N")
            depends = ", ".join(e["to"] for e in p["edges"])
            rows.append([code_cell, p["name"], p["pm"]["name"], fiscal_label(p["go_live"]), round(p["cost"] / 1000), reg, depends, RNG.choice(["On track", "Watch: vendor lead time", "At risk: staffing", "Dependency slip"])])
        write_xlsx(tracker_path(code), "Tracker", rows)


def write_decisions(projects: list[dict], decision_makers: list[dict]) -> None:
    window = GEN["decisionReviewWindow"]
    start, end = dt.date.fromisoformat(window["start"]), dt.date.fromisoformat(window["end"])
    rows = [GEN["workbook"]["decisionHeader"]]
    sample = RNG.sample(projects, GEN["decisionHistoryCount"])
    for p in sample:
        tier = p["truth_tier"]
        if chance(GEN["labelNoise"]):
            index = TIERS.index(tier)
            options = [j for j in (index - 1, index + 1) if 0 <= j < len(TIERS)]
            tier = TIERS[RNG.choice(options)]
        rows.append([random_date(start, end).isoformat(), p["id"], tier, RNG.choice(decision_makers)["name"], RNG.choice(GEN["rationales"])])
    write_xlsx(table_path("spreadsheets", "pmo_decisions"), "Decisions", rows)


def write_bu_repositories(projects: list[dict]) -> None:
    libraries = GEN["libraries"]
    documents, doc_id = [], 0
    for p in projects:
        if not p["inc"]["bu_repositories"]:
            continue
        for k in range(RNG.randint(2, 8)):
            doc_id += 1
            lib = RNG.choice(libraries)
            ref = p["id"].lower() + " " if chance(MSG["docRefMessy"]) else p["id"]
            doc = {
                "documentId": f"DOC-{doc_id:06d}",
                "library": lib["library"],
                "fileName": f"{p['id']}_{lib['fileStem']}_{k + 1}.docx",
                "projectRef": ref,
                "docType": lib["docType"],
                "ownerEmail": p["pm"]["email"],
                "lastModifiedUtc": utc_stamp(random_date(dt.date(2026, 3, 1), dt.date(2026, 10, 10))),
                "complianceTags": [],
                "riskItems": [],
                "dependencies": [],
            }
            if lib["docType"] == "Compliance" and p["reg"]:
                doc["complianceTags"] = RNG.sample(GEN["complianceTags"], RNG.randint(1, 2))
            if lib["docType"] == "RiskRegister":
                severity_rank = max(1, min(4, p["risk"] + RNG.choice([-1, 0, 0, 1])))
                doc["riskItems"] = [{"riskId": f"R-{p['index']:04d}-{n + 1:02d}", "severity": RISK[severity_rank - 1], "status": RNG.choice(["Open", "Closed"])} for n in range(RNG.randint(1, 3))]
            if lib["docType"] == "DependencyRegister":
                doc["dependencies"] = [{"dependsOnProject": e["to"], "linkType": e["type"]} for e in p["edges"]]
            documents.append(doc)
    write_json(table_path("bu_repositories", "documents"), documents)


def write_hr(projects: list[dict]) -> None:
    capacity = GEN["capacity"]
    start = dt.date.fromisoformat(capacity["startMonth"])
    months = []
    for k in range(capacity["months"]):
        month_index = start.month - 1 + k
        months.append(dt.date(start.year + month_index // 12, month_index % 12 + 1, 1))
    roster_rows = []
    executive_numbers = [e["number"] for e in ROSTER if e["level"] == "Executive"]
    for e in ROSTER:
        manager = "" if chance(GEN["roster"]["managerNumberBlankShare"]) else str(RNG.choice(executive_numbers))
        hire = random_date(dt.date.fromisoformat(GEN["roster"]["hireDateRange"][0]), dt.date.fromisoformat(GEN["roster"]["hireDateRange"][1]))
        roster_rows.append([
            str(e["number"]), e["name"], e["email"], e["title"], e["jobLevel"], e["skill"]["displayName"], e["org"], e["site"],
            manager, mdy(hire), "Contractor" if chance(GEN["roster"]["contractorShare"]) else "Full-time",
        ])
    write_csv(table_path("hr_roster", "employees"), ["EmployeeNumber", "DisplayName", "WorkEmail", "JobTitle", "JobLevel", "SkillFamily", "OrgUnit", "Location", "ManagerNumber", "HireDate", "EmploymentType"], roster_rows)
    by_skill: dict[str, list[dict]] = {}
    for p in projects:
        by_skill.setdefault(p["skill"]["key"], []).append(p)
    alloc_rows = []
    for e in ROSTER:
        emp_id = f"E{e['number']:05d}"
        pool = by_skill.get(e["skill"]["key"], [])
        for month in months:
            if not chance(capacity["monthActiveShare"]):
                continue
            targets = (RNG.sample(pool, min(len(pool), RNG.randint(1, 2))) if pool and not chance(capacity["bauShare"]) else [])
            if not targets:
                targets = [None]
            share = 100 // len(targets)
            for target in targets:
                alloc_rows.append([
                    emp_id, target["id"] if target else RNG.choice(["BAU", "ADMIN"]), e["skill"]["key"],
                    RNG.choice(capacity["phases"]), month.isoformat(), share, RNG.choice(capacity["capacityHours"]),
                ])
    write_csv(table_path("hr_capacity", "allocations"), ["EmpID", "ProjCode", "SkillCode", "Phase", "MonthStart", "AllocationPct", "CapacityHours"], alloc_rows)


def write_cost(projects: list[dict]) -> None:
    rows = []
    for p in projects:
        if not p["inc"]["cost"]:
            continue
        code = p["id"].lower().replace("-", "") if chance(MSG["costCode"]) else p["id"]
        for k in range(12):
            budget = round(p["cost"] * 0.9 / 12 * RNG.uniform(0.9, 1.1))
            rows.append([
                f"CC-{4400 + p['index'] % 40}", f"IO-{100000 + p['index']}", code, f"FY2027-P{k + 1:02d}", budget,
                round(budget * RNG.uniform(0.5, 1.05)), round(budget * RNG.uniform(0.9, 1.1)),
                RNG.choice(["CapEx", "OpEx"]), "USD",
            ])
    write_csv(table_path("cost", "project_cost_monthly"), ["CostCenter", "CostObject", "ProjectCode", "FiscalPeriod", "BudgetUSD", "ActualUSD", "ForecastUSD", "CapexOpex", "Currency"], rows)


def write_excel_intake(projects: list[dict]) -> None:
    wb = GEN["workbook"]
    rows = [wb["intakeIdentifierHeader"] + wb["intakeSignalHeader"]]
    for p in projects:
        if not p["excel_only"]:
            continue
        blank = lambda value: "" if chance(MSG["excelBlank"]) else value  # noqa: E731
        go_live = p["go_live"].isoformat() if chance(0.6) else fiscal_label(p["go_live"])
        value = f"{p['value']} - {EXCEL_VALUE_TEXT[str(p['value'])]}" if chance(0.4) else p["value"]
        if chance(MSG["excelVariant"]):
            reg = "TRUE" if p["reg"] else "FALSE"
        else:
            reg = "Y" if p["reg"] else "N"
        cost = f"${round(p['cost'] / 1000)}K" if chance(0.5) else round(p["cost"])
        rows.append([
            p["id"], p["name"], p["portfolio"]["displayName"], p["bu"], p["site"], p["sponsor"]["name"],
            blank(go_live), blank(value), blank(SPONSOR_LEVEL_SHORT[p["sponsor"]["level"]]), blank(reg),
            blank(f"{p['skill']['displayName']}: {p['fte']:.1f}"), blank(cost), p["deps"],
            blank(RISK[p["risk"] - 1]), blank("Y" if p["dt"] else "N"), blank(p["effort"]),
        ])
    write_xlsx(table_path("excel_intake", "intake_10_signals"), "Intake", rows)


def write_summary(projects: list[dict]) -> None:
    index = {p["id"]: p for p in projects}
    cross = sum(1 for p in projects for e in p["edges"] if index[e["to"]]["portfolio"]["key"] != p["portfolio"]["key"])
    summary = {
        "projects": len(projects),
        "excelOnly": sum(1 for p in projects if p["excel_only"]),
        "multiSource": sum(1 for p in projects if not p["excel_only"]),
        "portfolios": {port["key"]: sum(1 for p in projects if p["portfolio"]["key"] == port["key"]) for port in PORTFOLIOS},
        "crossPortfolioEdges": cross,
        "inclusionCounts": {key: sum(1 for p in projects if p["inc"][key]) for key in INC},
    }
    print(json.dumps(summary, indent=2))


def main() -> None:
    executives, directors, pms = build_roster()
    projects = build_projects(executives, directors, pms)
    build_edges(projects)
    assign_inclusion(projects)
    score_and_truth(projects)
    write_planview(projects)
    write_powerapps(projects)
    write_ado(projects)
    write_jira(projects)
    write_ms_project(projects)
    write_smartsheet(projects)
    write_trackers(projects)
    write_decisions(projects, executives + directors)
    write_bu_repositories(projects)
    write_hr(projects)
    write_cost(projects)
    write_excel_intake(projects)
    write_summary(projects)


if __name__ == "__main__":
    main()
