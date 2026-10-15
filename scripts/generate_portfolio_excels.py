"""
Generates per-portfolio Excel files from the sample portfolio dataset.
Outputs to data/portfolios/ and ui/src/assets/data/portfolios/.
"""

import json
import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sample_data_file = os.path.join(root_dir, "ui", "src", "app", "data", "sample-portfolio.data.ts")

    with open(sample_data_file, "r", encoding="utf-8") as f:
        text = f.read()

    idx_start = text.find('"projects": [')
    idx_end = text.find('],\n  "capacityBySkill":')
    if idx_start == -1 or idx_end == -1:
        raise ValueError("Could not locate projects array in sample-portfolio.data.ts")

    projects_json = text[idx_start + len('"projects": '):idx_end + 1]
    projects = json.loads(projects_json)

    out_dirs = [
        os.path.join(root_dir, "data", "portfolios"),
        os.path.join(root_dir, "ui", "src", "assets", "data", "portfolios"),
    ]
    for d in out_dirs:
        os.makedirs(d, exist_ok=True)

    headers = [
        ("projectId", "Project ID"),
        ("projectName", "Project Name"),
        ("portfolio", "Portfolio"),
        ("businessUnit", "Business Unit"),
        ("site", "Site"),
        ("projectManager", "Project Manager"),
        ("executiveSponsor", "Executive Sponsor"),
        ("sponsorLevel", "Sponsor Level"),
        ("projectStatus", "Project Status"),
        ("goLiveDate", "Go-Live Date"),
        ("monthsToGoLive", "Months to Go-Live"),
        ("businessValue", "Business Value (1-5)"),
        ("regulatorySecurity", "Regulatory / Security"),
        ("dtAlignment", "Digital Transformation"),
        ("protectedProgram", "Protected Program"),
        ("primarySkill", "Primary Skill"),
        ("skillDemandFte", "Skill Demand (FTE)"),
        ("costEstimateUsd", "Cost Estimate (USD)"),
        ("dependencyCount", "Dependency Count"),
        ("riskRating", "Risk Rating"),
        ("effortPersonWeeks", "Effort (Person-Weeks)"),
        ("completeness", "Completeness"),
        ("quality", "Quality"),
        ("modelCertainty", "Model Certainty"),
        ("confidenceScore", "Confidence Score"),
        ("confidenceLevel", "Confidence Level"),
        ("mlTier", "ML Tier"),
        ("finalTier", "Final Tier"),
        ("priorityScore", "Priority Score"),
        ("recommendedAction", "Recommended Action"),
        ("cluster", "Cluster"),
        ("ruleOverrides", "Rule Overrides"),
        ("topDrivers", "Top Drivers"),
        ("dataIssues", "Data Issues"),
        ("sourcesPresent", "Sources Present"),
    ]

    def make_excel(filename, project_list, title):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = title[:31]

        header_fill = PatternFill(start_color="0078D4", end_color="0078D4", fill_type="solid")
        header_font = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
        data_font = Font(name="Segoe UI", size=10)
        border_thin = Border(
            left=Side(style="thin", color="E0E0E0"),
            right=Side(style="thin", color="E0E0E0"),
            top=Side(style="thin", color="E0E0E0"),
            bottom=Side(style="thin", color="E0E0E0"),
        )

        for col_idx, (_, label) in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_idx, value=label)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center")

        for row_idx, p in enumerate(project_list, 2):
            for col_idx, (k, _) in enumerate(headers, 1):
                val = p.get(k)
                if k == "ruleOverrides" and isinstance(val, list):
                    val = "; ".join(str(x) for x in val)
                elif k == "dataIssues" and isinstance(val, list):
                    val = "; ".join(str(x) for x in val)
                elif k == "topDrivers" and isinstance(val, list):
                    val = "; ".join(
                        f"{d.get('signalLabel')} ({d.get('shapValue'):+.2f})"
                        for d in val
                        if isinstance(d, dict)
                    )

                cell = ws.cell(row=row_idx, column=col_idx, value=val)
                cell.font = data_font
                cell.border = border_thin
                if isinstance(val, (int, float)):
                    cell.alignment = Alignment(horizontal="right")
                elif isinstance(val, bool):
                    cell.alignment = Alignment(horizontal="center")

        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

        for d in out_dirs:
            target_path = os.path.join(d, filename)
            wb.save(target_path)
        print(f"Generated {filename} ({len(project_list)} projects)")

    by_portfolio = {}
    for p in projects:
        pf = p["portfolio"]
        by_portfolio.setdefault(pf, []).append(p)

    file_map = {
        "IT InfoSec": "portfolio_it_infosec.xlsx",
        "IT Software Development": "portfolio_it_software_development.xlsx",
        "IT Infrastructure": "portfolio_it_infrastructure.xlsx",
        "AI Team": "portfolio_ai_team.xlsx",
        "Data and Analytics": "portfolio_data_and_analytics.xlsx",
    }

    for pf_name, p_list in by_portfolio.items():
        fname = file_map.get(pf_name, f"portfolio_{pf_name.lower().replace(' ', '_')}.xlsx")
        make_excel(fname, p_list, pf_name)

    make_excel("portfolio_all_100_projects.xlsx", projects, "All Portfolios")
    print("Done generating portfolio Excel files.")

if __name__ == "__main__":
    main()
