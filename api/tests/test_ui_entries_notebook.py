import ast
import datetime as dt
import json
from pathlib import Path

import pytest

from app.priority_scoring import (
    ScoringEvidenceError,
    blend_priority_score,
    compute_field_weighted_score,
    saved_ml_base_score,
)
from tests.test_project_changes import export_document, pending_entry
from app.config import load_config

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "fabric" / "ml-notebooks" / "01-feature-engineering" / "src" / "03_ui_entries.py"


def helpers():
    tree = ast.parse(SOURCE.read_text(encoding="utf-8"))
    definitions = [node for node in tree.body if isinstance(node, ast.FunctionDef)]
    namespace = {"json": json, "dt": dt}
    exec(compile(ast.Module(body=definitions, type_ignores=[]), str(SOURCE), "exec"), namespace)
    return namespace


def inputs():
    config = load_config()
    model = json.loads((ROOT / "config" / "ml-model.json").read_text(encoding="utf-8"))
    portfolios = {item["key"]: item for item in export_document(config)["portfolios"]}
    return pending_entry(config), portfolios, model


def test_entered_project_preserves_real_scoring_inputs_and_receives_the_shared_weighted_priority():
    entry, portfolios, model = inputs()
    merge = helpers()["merge_ui_analysis_inputs"]
    rows, affected = merge([], {entry["projectId"]: entry}, {}, portfolios, model)
    row = rows[0]
    assert row["project_id"] == entry["projectId"]
    assert row["user_base"] == entry["userBase"]
    assert row["business_value"] == entry["businessValue"]
    assert row["sponsor_priority"] == model["mappings"]["sponsorLevel"][entry["sponsorLevel"]]
    assert row["regulatory_security"] == 1
    assert row["primary_skill"] == model["mappings"]["skillNames"][entry["primarySkill"]]
    assert row["program_name"] == "Zero Trust and Identity"
    assert "user_base" in affected[entry["projectId"]]
    weights = json.loads((ROOT / "config" / "priority-weights.json").read_text(encoding="utf-8"))["defaultWeights"]
    weighted = compute_field_weighted_score(row, weights, model)
    ml = saved_ml_base_score({"tierProbabilities": {
        "mustDoNow": 0.1, "proceed": 0.6, "canWait": 0.2, "deprioritize": 0.1,
    }}, model)
    assert 0 <= blend_priority_score(ml, weighted, None) <= 100
    assert blend_priority_score(ml, weighted, 95) == 95
    assert "decision_tier" not in row


def test_missing_user_base_remains_missing_instead_of_receiving_a_generated_default():
    entry, portfolios, model = inputs()
    entry["userBase"] = None
    rows, _ = helpers()["merge_ui_analysis_inputs"]([], {entry["projectId"]: entry}, {}, portfolios, model)
    assert rows[0]["user_base"] is None
    weights = json.loads((ROOT / "config" / "priority-weights.json").read_text(encoding="utf-8"))["defaultWeights"]
    with pytest.raises(ScoringEvidenceError, match="userBase"):
        compute_field_weighted_score(rows[0], weights, model)


def test_lifecycle_edits_win_and_deleted_projects_are_not_resurrected_but_soft_deletes_remain_restorable():
    entry, portfolios, model = inputs()
    merge = helpers()["merge_ui_analysis_inputs"]
    pid = entry["projectId"]
    rows, _ = merge([], {pid: entry}, {pid: {"values": {"businessValue": 5}, "resetRevision": "r1"}}, portfolios, model)
    assert rows[0]["business_value"] == 5
    assert rows[0]["analysis_reset_revision"] == "r1"
    assert merge(rows, {pid: entry}, {pid: {"deleted": True}}, portfolios, model)[0] == []
    assert len(merge(rows, {pid: entry}, {pid: {"isDeleted": True}}, portfolios, model)[0]) == 1


def test_dependency_lists_become_numeric_features_and_persisted_graph_evidence():
    entry, portfolios, model = inputs()
    pid = entry["projectId"]
    entry["dependencies"] = [{"projectId": "GIS-0001", "relationshipType": "Finish-to-Start"}]
    functions = helpers()
    rows, _ = functions["merge_ui_analysis_inputs"]([], {pid: entry}, {}, portfolios, model)
    assert rows[0]["dependencies"] == 1
    edges, replaced = functions["ui_dependency_edges"]({pid: entry}, {})
    assert replaced == {pid}
    assert edges == [{
        "from_id": pid, "to_id": "GIS-0001", "relationship_type": "Finish-to-Start",
        "evidence_source": "ui_entries", "evidence_count": 1,
    }]
    assert functions["ui_dependency_edges"]({pid: entry}, {pid: {"values": {"dependencies": []}}}) == ([], {pid})


def test_custom_sponsor_level_and_fractional_score_reach_the_ml_features():
    entry, portfolios, model = inputs()
    entry["sponsorLevel"] = "CEO"
    model["mappings"]["sponsorLevel"]["CEO"] = 4.5
    rows, _ = helpers()["merge_ui_analysis_inputs"]([], {entry["projectId"]: entry}, {}, portfolios, model)
    assert rows[0]["sponsor_priority"] == 4.5
    assert rows[0]["sponsor_level_name"] == "CEO"


def test_loader_reads_saved_entries_manual_portfolios_and_only_changes_matching_the_reset(tmp_path):
    entry, portfolios, _ = inputs()
    contract = json.loads((ROOT / "config" / "data-entry.json").read_text(encoding="utf-8"))
    project_folder = tmp_path / contract["lake"]["manualProjectsFolder"]
    project_folder.mkdir(parents=True)
    portfolio_folder = tmp_path / contract["lake"]["manualPortfoliosFolder"]
    portfolio_folder.mkdir(parents=True)
    (project_folder / f'{entry["projectId"]}.json').write_text(json.dumps(entry), encoding="utf-8")
    manual = {"key": "manual", "displayName": "Manual", "code": "MAN", "role": "coupled", "programs": []}
    (portfolio_folder / "manual.json").write_text(json.dumps(manual), encoding="utf-8")
    reset = {"portfolios": [], "records": {entry["projectId"]: {"resetRevision": "new", "replacement": entry}}}
    (project_folder.parent / "project_resets.json").write_text(json.dumps(reset), encoding="utf-8")
    changes = project_folder.parent / "project_changes"
    changes.mkdir()
    (changes / f'{entry["projectId"]}.json').write_text(json.dumps({
        "projectId": entry["projectId"], "resetRevision": "old", "values": {"businessValue": 1},
    }), encoding="utf-8")
    portfolio_config = {"portfolios": list(portfolios.values())}
    loaded, loaded_changes, loaded_portfolios = helpers()["read_ui_analysis_inputs"](tmp_path, contract, portfolio_config)
    assert loaded[entry["projectId"]] == entry
    assert loaded_changes[entry["projectId"]]["resetRevision"] == "new"
    assert loaded_portfolios["manual"] == manual
    assert manual in portfolio_config["portfolios"]


def test_loader_rejects_a_mismatched_entry_id_instead_of_silently_scoring_another_project(tmp_path):
    entry, portfolios, _ = inputs()
    contract = json.loads((ROOT / "config" / "data-entry.json").read_text(encoding="utf-8"))
    folder = tmp_path / contract["lake"]["manualProjectsFolder"]
    folder.mkdir(parents=True)
    (folder / "wrong.json").write_text(json.dumps(entry), encoding="utf-8")
    with pytest.raises(ValueError, match="filename"):
        helpers()["read_ui_analysis_inputs"](tmp_path, contract, {"portfolios": list(portfolios.values())})
