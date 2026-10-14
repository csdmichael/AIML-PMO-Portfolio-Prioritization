import csv
import json
import random
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent

portfolios_cfg = json.loads((REPO / "config" / "portfolios.json").read_text(encoding="utf-8"))
data_entry_cfg = json.loads((REPO / "config" / "data-entry.json").read_text(encoding="utf-8"))

options = data_entry_cfg["options"]
business_units = options["businessUnits"]
sites = options["sites"]
skills = [s["displayName"] for s in options["skills"]]
sponsor_levels = options["sponsorLevels"]
risk_ratings = options["riskRatings"]
statuses = options["projectStatuses"]
relationship_types = options["relationshipTypes"]

# Read existing planview projects
planview_projects = {}
pv_path = REPO / "data" / "planview" / "planview_portfolio_export_2026-10-12.csv"
if pv_path.exists():
    with open(pv_path, "r", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            code = r["ProjectCode"].strip().upper()
            if not code.startswith("GIS-") and code.startswith("GIS"):
                code = "GIS-" + code[3:]
            planview_projects[code] = r

# Read project names from ms_project or generate realistic titles
titles_by_num = {
    1: "Edge Network Segmentation Refresh",
    2: "Resilient Datacenter Consolidation Rollout",
    3: "Resilient Model Registry Migration",
    4: "Identity-Led API Gateway Program",
    5: "Resilient API Gateway Phase 2",
    6: "Unified Cloud Landing Zone Hardening",
    7: "Automated Endpoint Hardening Upgrade",
    8: "Next-Gen Key Vault Migration Program",
    9: "Zero-Trust Microsegmentation for Fab Floor",
    10: "Resilient Collaboration Platform Program",
    11: "Resilient Service Desk Automation Upgrade",
    12: "Resilient Key Vault Migration Rollout",
    13: "Resilient Key Vault Migration Program",
    14: "Privileged Access Management (PAM) Expansion",
    15: "Security Operations SIEM/SOAR Automation",
    16: "Enterprise Cloud Posture Management",
    17: "Threat Intelligence Exchange Platform",
    18: "Automated Vulnerability Patch Orchestration",
    19: "Next-Gen Access Certification Rollout",
    20: "Next-Gen SIEM Modernization Upgrade",
    21: "Hardware Security Module (HSM) Fleet Refresh",
    22: "Enterprise Data Loss Prevention (DLP) Wave 3",
    23: "Next-Gen Service Desk Automation Migration",
    24: "Cloud-First Backup Resilience Rollout",
    25: "Unified Model Registry Refresh",
    26: "Cloud Security Boundary Enforcement",
    27: "Edge Data Catalog Refresh",
    28: "Identity Governance & Lifecycle Automation",
    29: "Zero-Trust Service Desk Automation Program",
    30: "Identity-Led Identity Federation Program",
    31: "Secure Data Catalog Program",
    32: "Cloud-First Data Catalog Upgrade",
    33: "Secure Patch Orchestration Refresh",
    34: "Secure Service Desk Automation Rollout",
    35: "Enterprise Ticketing Integration Upgrade",
    36: "Cyber Defense SOC Playbook Orchestration",
    37: "Zero Trust Network Access (ZTNA) Deployment",
    38: "Secure Cloud DevOps Pipeline Verification",
    39: "Third-Party Risk Assessment Engine",
    40: "Cryptographic Asset Discovery & Audit",
    41: "Core MES Fab Yield Telemetry Connector",
    42: "Wafer Chamber Metrology Stream Processing",
    43: "Global ERP Supply Chain Inventory Bridge",
    44: "Supplier Portal Modernization & EDI Hub",
    45: "Customer Services Remote Diagnostics API",
    46: "Enterprise Master Data Management Service",
    47: "HR Onboarding Workflow Digital Assistant",
    48: "Finance Billing & Revenue Recognition Engine",
    49: "Production Dispatch Automation Service",
    50: "Tool Calibration Event Dispatcher",
    51: "Engineering Change Order (ECO) Pipeline",
    52: "Automated Regression Test Harness for MES",
    53: "B2B Customer Order Tracking Gateway",
    54: "Logistics Freight Cost Optimization Engine",
    55: "Global Asset Tracking & RFID Integration",
    56: "Field Service Mobile App Backend V2",
    57: "Corporate Portal Unified Search Index",
    58: "Enterprise Notification & Alert Dispatcher",
    59: "Real-time Defect Classification Service",
    60: "Product Lifecycle Management (PLM) Connector",
    61: "Global SD-WAN Branch Modernization",
    62: "Multi-Cloud Transit Network Backbone",
    63: "High-Performance Compute Cluster Expansion",
    64: "Disaster Recovery Storage Replication Hub",
    65: "Global Virtual Desktop Infrastructure (VDI)",
    66: "Automated Server Patching & Compliance Guard",
    67: "Edge Compute Gateway for Cleanroom Robots",
    68: "Enterprise Unified Storage Tiering",
    69: "Corporate DNS & DHCP Infrastructure Modernization",
    70: "Zero Trust Wi-Fi 6E Fab Deployment",
    71: "Hybrid Cloud Container Mesh Infrastructure",
    72: "Database Fleet Autonomous Backup & Restore",
    73: "Global Datacenter Power & Cooling Telemetry",
    74: "Colocation Datacenter Migration Wave 4",
    75: "Campus Fiber Network Spine-Leaf Upgrade",
    76: "Wafer Defect Computer Vision Inspection AI",
    77: "Generative AI Knowledge Assistant for Fab Engineers",
    78: "Predictive Equipment Maintenance Anomaly Detector",
    79: "Supply Chain Disruption Forecasting Model",
    80: "Automated Recipe Optimization Deep Learning",
    81: "Enterprise LLM Model Serving Gateway",
    82: "AI-Powered Contract Review & Compliance Scanner",
    83: "Autonomous Robotic Process AI Co-Pilot",
    84: "Smart Energy Consumption Optimizer for Cleanrooms",
    85: "AI Model Safety, Guardrails & Governance Suite",
    86: "OneLake Enterprise Data Foundation & Catalog",
    87: "Direct Lake Power BI Executive KPI Semantic Model",
    88: "Real-Time Sensor Telemetry Lakehouse Pipeline",
    89: "Global Financial Performance Direct Lake Model",
    90: "Customer Warranty Claims Analytics Engine",
    91: "Supply Chain Multi-Tier Lead-Time Analytics",
    92: "Fab Yield Variance Statistical Analytics",
    93: "Workforce Skill Demand & Capacity Forecaster",
    94: "Corporate ESG & Carbon Footprint Reporter",
    95: "Enterprise Master Data Lakehouse Mesh",
    96: "IoT Fleet Telemetry Streaming with Kafka",
    97: "Sales Pipeline Win-Rate Predictive Analytics",
    98: "Procurement Spend Optimization & Anomaly Scanner",
    99: "Asset Depreciation & CapEx Forecast Lakehouse",
    100: "Automated Executive Boardroom BI Direct Lake Pack"
}

managers = [
    "Mateo Okafor", "Owen Brandt", "Avery Romero", "Samuel Haddad", "Grace Lindqvist",
    "Jordan Okafor", "Isabel Brandt", "Chloe Lindqvist", "Mateo Schmidt", "Tariq Aziz",
    "Yara Walsh", "Carlos Moreno", "Isabel Okafor", "Elena Rostova", "Marcus Chen",
    "Sophia Patel", "Liam O'Connor", "Maya Lin", "Lucas Silva", "Amira Khan"
]

sponsors = [
    "Hannah Tanaka", "Leila Iyer", "Lucas Schmidt", "Yara Haddad", "Ethan Novak",
    "Dmitri Nakamura", "Priya Aziz", "Jordan Ferreira", "Samuel Lindqvist", "Ingrid Iyer",
    "Priya Reyes", "Avery Bauer", "Victor Cruz", "Nadia Al-Mansoor", "Klaus Weber"
]

rng = random.Random(20261012)

portfolio_assignments = [
    ("IT InfoSec", 1, 40),
    ("IT Software Development", 41, 60),
    ("IT Infrastructure", 61, 75),
    ("AI Team", 76, 85),
    ("Data and Analytics", 86, 100),
]

projects = []

for port_name, start_id, end_id in portfolio_assignments:
    for i in range(start_id, end_id + 1):
        pid = f"GIS-{i:04d}"
        pname = titles_by_num.get(i, f"Project {pid}")
        pv = planview_projects.get(pid, {})
        
        bu = pv.get("BusinessUnit") or rng.choice(business_units)
        site = pv.get("Site") or rng.choice(sites)
        pm = pv.get("ProjectManager") or rng.choice(managers)
        sponsor = pv.get("ExecutiveSponsor", "").replace('"', '') or rng.choice(sponsors)
        if "," in sponsor:
            parts = [p.strip() for p in sponsor.split(",")]
            sponsor = f"{parts[1]} {parts[0]}" if len(parts) > 1 else sponsor
            
        s_level = rng.choices(["Executive", "Director", "Manager"], weights=[0.4, 0.4, 0.2])[0]
        status = pv.get("ProjectStatus") or rng.choices(["Active", "Planning", "On Hold"], weights=[0.55, 0.35, 0.10])[0]
        
        # go live date
        months = rng.randint(4, 34)
        year = 2026 + (months // 12)
        month = 1 + (months % 12)
        day = rng.randint(1, 28)
        go_live = f"{year}-{month:02d}-{day:02d}"
        
        val = int(pv.get("BenefitScore") or rng.choices([3, 4, 5, 2, 1], weights=[0.3, 0.3, 0.2, 0.15, 0.05])[0])
        regulatory = i in [1, 7, 14, 20, 28, 41, 48, 62, 70, 78, 85, 94] or (i % 7 == 0)
        dt = i in [4, 5, 12, 19, 23, 27, 42, 43, 76, 77, 78, 86, 87, 88] or (i % 3 == 0)
        protected = i in [4, 7, 14, 20, 29, 41, 76, 86] or (regulatory and val >= 4)
        
        skill = pv.get("PrimarySkill") or rng.choice(skills)
        fte = round(float(pv.get("SkillDemandFTE") or rng.uniform(2.0, 12.0)), 1)
        
        # cost estimate
        raw_cost = pv.get("EstimatedCostUSD", "")
        if "M" in raw_cost:
            cost = int(float(raw_cost.replace("M", "")) * 1000000)
        elif raw_cost.isdigit():
            cost = int(raw_cost)
        else:
            cost = rng.choice([450000, 780000, 1250000, 1800000, 2400000, 3200000, 4800000, 6500000])
            
        deps = int(pv.get("DependencyCount") or rng.randint(0, 4))
        raw_risk = pv.get("RiskLevel", "")
        if raw_risk in ["Med", "M"]:
            risk = "Medium"
        elif raw_risk in ["Low", "L"]:
            risk = "Low"
        elif raw_risk in ["High", "H"]:
            risk = "High"
        elif raw_risk in ["Crit", "Critical"]:
            risk = "Critical"
        elif raw_risk in ["Low", "Medium", "High", "Critical"]:
            risk = raw_risk
        else:
            risk = rng.choices(["Low", "Medium", "High", "Critical"], weights=[0.35, 0.35, 0.2, 0.1])[0]
        effort = rng.randint(25, 220)
        
        # Sources
        present_count = rng.randint(6, 11)
        sources_flags = {
            "planview": True if pid in planview_projects else (rng.random() < 0.8),
            "powerapps": rng.random() < 0.75,
            "ado": rng.random() < 0.65,
            "jira": rng.random() < 0.55,
            "msProject": rng.random() < 0.50,
            "smartsheet": rng.random() < 0.60,
            "buTrackers": rng.random() < 0.70,
            "buRepositories": rng.random() < 0.65,
            "hrCapacity": rng.random() < 0.80,
            "cost": rng.random() < 0.75,
            "excelIntake": rng.random() < 0.30,
        }
        actual_present = sum(1 for v in sources_flags.values() if v)
        
        completeness = round(min(1.0, max(0.4, actual_present / 11.0 + rng.uniform(-0.05, 0.05))), 2)
        quality = round(rng.uniform(0.75, 0.98), 2)
        certainty = round(rng.uniform(0.70, 0.95), 2)
        conf_score = round(100.0 * (0.45 * completeness + 0.35 * quality + 0.20 * certainty), 1)
        conf_level = "High" if conf_score >= 75.0 else ("Medium" if conf_score >= 50.0 else "Low")
        
        # Priority logic
        score_base = (val * 16) + (20 if regulatory else 0) + (15 if protected else 0) + (10 if dt else 0)
        score_base += (25 - min(25, months)) + (15 if s_level == "Executive" else (10 if s_level == "Director" else 5))
        score_base -= (10 if risk == "Critical" else (5 if risk == "High" else 0))
        score_base += rng.uniform(-8, 8)
        priority_score = round(max(20.0, min(98.5, score_base)), 1)
        
        # Tier determination
        if regulatory or protected or priority_score >= 80:
            final_tier = "Must-do-now"
            ml_tier = "Must-do-now" if (priority_score >= 75) else "Proceed"
            recommended_action = "Protect slot" if protected else "Proceed"
        elif priority_score >= 60:
            final_tier = "Proceed"
            ml_tier = "Proceed"
            recommended_action = "Proceed" if fte <= 8 else "Add capacity"
        elif priority_score >= 42:
            final_tier = "Can wait"
            ml_tier = "Can wait"
            recommended_action = "Re-sequence"
        else:
            final_tier = "Candidate to deprioritize"
            ml_tier = "Candidate to deprioritize"
            recommended_action = "Pause or divert skills"
            
        # Overrides & Rules
        overrides = []
        if regulatory:
            overrides.append("R1 Regulatory First")
        if s_level == "Executive" and final_tier != "Must-do-now":
            overrides.append("R2 Executive Sponsorship")
        if protected:
            overrides.append("R3 Protected Program")
        if deps >= 3:
            overrides.append("R5 Cross-Portfolio Critical Path")
            
        cluster_name = "Platform" if ("Platform" in pname or "Cloud" in pname or "Network" in pname) else (
            "Analytics" if ("Analytics" in pname or "Data" in pname or "AI" in pname or "Model" in pname) else (
                "Security" if ("Security" in pname or "Zero" in pname or "Identity" in pname or "SIEM" in pname) else "Core IT"
            )
        )
        
        drivers = [
            {
                "signalKey": "business_value",
                "signalLabel": "Business Value",
                "shapValue": round(val * 0.18, 2),
                "direction": "increases" if val >= 3 else "decreases",
                "featureValue": val,
            },
            {
                "signalKey": "timing_urgency",
                "signalLabel": "Timing Urgency",
                "shapValue": round((36 - months) * 0.02, 2),
                "direction": "increases" if months <= 18 else "decreases",
                "featureValue": months,
            },
            {
                "signalKey": "regulatory_security",
                "signalLabel": "Regulatory / Security",
                "shapValue": 0.45 if regulatory else -0.12,
                "direction": "increases" if regulatory else "decreases",
                "featureValue": 1 if regulatory else 0,
            },
            {
                "signalKey": "cost_usd",
                "signalLabel": "Cost Magnitude",
                "shapValue": round(-0.05 * (cost / 1000000.0), 2),
                "direction": "decreases" if cost > 2000000 else "increases",
                "featureValue": cost,
            }
        ]
        
        data_issues = []
        if actual_present < 7:
            data_issues.append("Sparse cross-system presence (< 7 sources)")
        if months > 30 and final_tier == "Must-do-now":
            data_issues.append("Long horizon for Must-do-now tier (> 30 months)")
        if deps > 3:
            data_issues.append("High upstream dependency entanglement")
            
        prob_must = round(0.75 if final_tier == "Must-do-now" else (0.15 if final_tier == "Proceed" else 0.05), 2)
        prob_proceed = round(0.65 if final_tier == "Proceed" else (0.15 if final_tier == "Must-do-now" else 0.20), 2)
        prob_wait = round(0.65 if final_tier == "Can wait" else 0.10, 2)
        prob_deprioritize = round(1.0 - (prob_must + prob_proceed + prob_wait), 2)
        if prob_deprioritize < 0:
            prob_deprioritize = 0.05
            
        projects.append({
            "projectId": pid,
            "projectName": pname,
            "portfolio": port_name,
            "businessUnit": bu,
            "site": site,
            "projectManager": pm,
            "executiveSponsor": sponsor,
            "sponsorLevel": s_level,
            "projectStatus": status,
            "goLiveDate": go_live,
            "monthsToGoLive": months,
            "businessValue": val,
            "regulatorySecurity": regulatory,
            "dtAlignment": dt,
            "protectedProgram": protected,
            "primarySkill": skill,
            "skillDemandFte": fte,
            "costEstimateUsd": cost,
            "dependencyCount": deps,
            "riskRating": risk,
            "effortPersonWeeks": effort,
            "sourcesPresent": actual_present,
            "sourcesTotal": 11,
            "sources": sources_flags,
            "completeness": completeness,
            "quality": quality,
            "modelCertainty": certainty,
            "confidenceScore": conf_score,
            "confidenceLevel": conf_level,
            "mlTier": ml_tier,
            "finalTier": final_tier,
            "tierProbabilities": {
                "mustDoNow": prob_must,
                "proceed": prob_proceed,
                "canWait": prob_wait,
                "deprioritize": prob_deprioritize,
            },
            "priorityScore": priority_score,
            "ruleOverrides": overrides,
            "recommendedAction": recommended_action,
            "cluster": cluster_name,
            "topDrivers": drivers,
            "dataIssues": data_issues,
        })

capacity_skills = [
    {"skill": "Application Development", "supplyFte": 48.0, "demandFte": 56.4, "gapFte": -8.4, "projectsInDemand": 26},
    {"skill": "Network Engineering", "supplyFte": 36.0, "demandFte": 32.1, "gapFte": 3.9, "projectsInDemand": 18},
    {"skill": "Cloud and Infrastructure", "supplyFte": 40.0, "demandFte": 45.8, "gapFte": -5.8, "projectsInDemand": 21},
    {"skill": "Data Engineering", "supplyFte": 28.0, "demandFte": 34.2, "gapFte": -6.2, "projectsInDemand": 15},
    {"skill": "Cybersecurity", "supplyFte": 24.0, "demandFte": 22.5, "gapFte": 1.5, "projectsInDemand": 14},
    {"skill": "Unified Communications", "supplyFte": 20.0, "demandFte": 18.2, "gapFte": 1.8, "projectsInDemand": 9},
    {"skill": "Integration (iPaaS)", "supplyFte": 16.0, "demandFte": 19.4, "gapFte": -3.4, "projectsInDemand": 11},
    {"skill": "Project Management", "supplyFte": 22.0, "demandFte": 20.1, "gapFte": 1.9, "projectsInDemand": 12},
]

clusters = [
    {"clusterId": 1, "name": "Platform", "projectCount": 32, "avgConfidence": 81.4},
    {"clusterId": 2, "name": "Analytics & AI", "projectCount": 28, "avgConfidence": 84.1},
    {"clusterId": 3, "name": "Security & Identity", "projectCount": 24, "avgConfidence": 79.8},
    {"clusterId": 4, "name": "Core Enterprise IT", "projectCount": 16, "avgConfidence": 76.5},
]

rules = [
    {"ruleId": "R1", "name": "Regulatory or Security First", "condition": "regulatory_security == True", "action": "Elevate to Must-do-now tier", "enabled": True},
    {"ruleId": "R2", "name": "Executive Sponsorship Protection", "condition": "sponsor_level == 'Executive' AND business_value >= 4", "action": "Guard from Candidate to deprioritize", "enabled": True},
    {"ruleId": "R3", "name": "Protected Strategic Program", "condition": "protected_program == True", "action": "Lock priority slot; prevent deferral", "enabled": True},
    {"ruleId": "R4", "name": "Deprioritize Guard on Active", "condition": "project_status == 'Active' AND months_to_go_live <= 6", "action": "Do not deprioritize without VP escalation", "enabled": True},
    {"ruleId": "R5", "name": "Cross-Portfolio Critical Path", "condition": "dependency_count >= 3", "action": "Re-sequence successors; highlight coupling", "enabled": True},
]

metrics = {
    "algorithm": "LightGBM + CalibratedClassifierCV (Platt)",
    "accuracyCv": 0.914,
    "macroF1Cv": 0.892,
    "logLossCv": 0.284,
    "trainingRows": 100,
    "features": [
        "timing_urgency", "business_value", "sponsor_priority", "regulatory_security",
        "skill_demand", "cost_usd", "dependencies", "risk", "dt_alignment", "effort_person_weeks"
    ]
}

decisions = [
    {"projectId": "GIS-0001", "action": "Approve", "reason": "Edge network security essential for Singapore fab expansion and regulatory compliance.", "timestamp": "2026-10-13T10:15:00Z"},
    {"projectId": "GIS-0004", "action": "Approve", "reason": "Critical API gateway program with high sponsor backing; slot protected.", "timestamp": "2026-10-13T11:30:00Z"},
    {"projectId": "GIS-0007", "action": "Approve", "reason": "Endpoint hardening upgrade approved with Q4 2027 delivery target.", "timestamp": "2026-10-13T14:20:00Z"},
    {"projectId": "GIS-0010", "action": "Adjust", "reason": "Paused for skills reallocation to GIS-0001; adjusted tier to Can wait.", "timestamp": "2026-10-13T15:45:00Z"},
    {"projectId": "GIS-0014", "action": "Approve", "reason": "Privileged access management is corporate zero trust prerequisite.", "timestamp": "2026-10-13T16:10:00Z"},
    {"projectId": "GIS-0020", "action": "Approve", "reason": "SIEM upgrade approved under Information Security portfolio.", "timestamp": "2026-10-13T17:00:00Z"},
    {"projectId": "GIS-0034", "action": "Reject", "reason": "High risk, low sponsor certainty; recommended candidate for deprioritization.", "timestamp": "2026-10-14T08:30:00Z"},
    {"projectId": "GIS-0041", "action": "Approve", "reason": "MES yield telemetry connector aligned with Digital Transformation core goals.", "timestamp": "2026-10-14T09:00:00Z"},
    {"projectId": "GIS-0062", "action": "Approve", "reason": "Multi-cloud transit backbone funded; proceed immediately.", "timestamp": "2026-10-14T09:45:00Z"},
    {"projectId": "GIS-0076", "action": "Approve", "reason": "Wafer defect CV vision model demonstrated 98% recall; high business value.", "timestamp": "2026-10-14T10:15:00Z"},
    {"projectId": "GIS-0086", "action": "Approve", "reason": "OneLake enterprise data foundation approved by CIO Council.", "timestamp": "2026-10-14T11:00:00Z"},
    {"projectId": "GIS-0092", "action": "Adjust", "reason": "Adjusted timeline to sync with Fab Operations yield calibration cycle.", "timestamp": "2026-10-14T11:30:00Z"}
]

dataset = {
    "generatedAtUtc": "2026-10-14T07:00:00Z",
    "asOfDate": "2026-10-12",
    "source": "OneLake Fabric Gold (Gold.PMO_Predictions)",
    "projects": projects,
    "capacityBySkill": capacity_skills,
    "clusters": clusters,
    "rules": rules,
    "modelMetrics": metrics
}

clean_portfolios = []
for p in portfolios_cfg["portfolios"]:
    clean_p = {
        "key": p["key"],
        "displayName": p["displayName"],
        "code": p["code"],
        "role": p["role"],
        "programs": [{"key": prog["key"], "name": prog.get("displayName") or prog.get("name", "")} for prog in p.get("programs", [])]
    }
    clean_portfolios.append(clean_p)

clean_uploads = {
    "maxFilesPerSourcePerProject": 5,
    "maxFileBytes": 10485760,
    "acceptedBySource": {
      "planview": { "extensions": [".csv", ".xlsx"] },
      "ado": { "extensions": [".csv"] },
      "jira": { "extensions": [".json"] },
      "ms_project": { "extensions": [".xml"] },
      "smartsheet": { "extensions": [".csv"] },
      "excel_intake": { "extensions": [".xlsx"] }
    }
}

ts_content = f"""// Auto-generated comprehensive sample dataset for PMO Portfolio Prioritization
// Guarantees all UI screens have full 100-project data across all devices

import {{ PortfolioDataset, LocalDecision }} from '../models/portfolio.models';
import {{ OptionsResponse, PortfolioItem }} from '../models/api.models';

export const SAMPLE_PORTFOLIO_DATASET: PortfolioDataset = {json.dumps(dataset, indent=2)};

export const SAMPLE_DECISIONS: LocalDecision[] = {json.dumps(decisions, indent=2)};

export const SAMPLE_OPTIONS_RESPONSE: OptionsResponse = {{
  schemaVersion: 1,
  description: "Shared PMO data-entry contract",
  projectIdPattern: "^GIS-\\\\d{{4}}$",
  options: {json.dumps(options, indent=2)},
  projectFields: {json.dumps(data_entry_cfg["projectFields"], indent=2)},
  portfolioFields: [
    {{ key: "key", label: "Portfolio Key", type: "string", required: true }},
    {{ key: "displayName", label: "Display Name", type: "string", required: true }},
    {{ key: "code", label: "Code", type: "string", required: true }},
    {{ key: "role", label: "Role", type: "select", options: ["main", "coupled"], required: true }}
  ],
  uploads: {json.dumps(clean_uploads, indent=2)},
  quickAdd: {{
    limits: {{
      maxProjectNameChars: 120,
      minDescriptionChars: 20,
      maxDescriptionChars: 4000,
      maxDocuments: 5,
      maxDocumentBytes: 10485760,
      acceptedDocumentExtensions: [".docx", ".pdf", ".txt", ".xlsx", ".pptx"]
    }},
    evidenceLevels: ["Explicit", "Inferred", "Default"]
  }}
}};

export const SAMPLE_PORTFOLIOS: PortfolioItem[] = {json.dumps(clean_portfolios, indent=2)};
"""

out_file = REPO / "ui" / "src" / "app" / "data" / "sample-portfolio.data.ts"
out_file.parent.mkdir(parents=True, exist_ok=True)
out_file.write_text(ts_content, encoding="utf-8")
print(f"Generated {out_file} with {len(projects)} projects.")
