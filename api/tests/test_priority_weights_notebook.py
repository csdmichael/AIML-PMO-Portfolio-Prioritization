import ast
import importlib.util
import json
from pathlib import Path

from app.priority_scoring import PRIORITY_WEIGHTS_PATH, priority_weight_settings

ROOT = Path(__file__).resolve().parents[2]
NOTEBOOK = ROOT / "fabric" / "ml-notebooks" / "02-inference-predictions"


class SourcePath:
    def __init__(self, path, files):
        self.path, self.files = path, files

    def __truediv__(self, part):
        return SourcePath(f"{self.path}/{part}", self.files)

    def exists(self):
        return self.path in self.files

    def read_text(self, **kwargs):
        return json.dumps(self.files[self.path])


def test_notebook_uses_the_runtime_json_records_and_never_republishes_a_separate_weight_table():
    source = (NOTEBOOK / "src" / "02_rules_confidence.py").read_text(encoding="utf-8")
    tree = ast.parse(source)
    wanted = {"WEIGHTS_FILE", "RUNTIME_WEIGHTS_FILE", "pw_cfg", "pw_records", "DEFAULT_FIELD_WEIGHTS"}
    assignments = [
        node for node in tree.body if isinstance(node, ast.Assign)
        and any(isinstance(child, ast.Name) and child.id in wanted for target in node.targets for child in ast.walk(target))
    ]
    assert len(assignments) == 5
    base = json.loads((ROOT / "config" / "priority-weights.json").read_text(encoding="utf-8"))
    files = {
        "lake/Files/config/priority-weights.json": base,
        f"lake/{PRIORITY_WEIGHTS_PATH}": [
            {"scope": "portfolio", "portfolio_key": "alpha", "field_key": "businessValue", "weight_percent": 70},
            {"project_id": "A-1", "field_key": "userBase", "weight_percent": 30},
        ],
    }
    namespace = {
        "json": json, "CFG_DIR": SourcePath("lake/Files/config", files), "LAKE": SourcePath("lake", files),
        "PRIORITY_WEIGHTS_PATH": PRIORITY_WEIGHTS_PATH, "priority_weight_settings": priority_weight_settings,
    }
    exec(compile(ast.Module(body=assignments, type_ignores=[]), str(NOTEBOOK), "exec"), namespace)
    assert namespace["PORTFOLIO_WEIGHT_OVERRIDES"] == {"alpha": {"businessValue": 70}}
    assert namespace["PROJECT_WEIGHT_OVERRIDES"] == {"A-1": {"userBase": 30}}
    assert namespace["DEFAULT_FIELD_WEIGHTS"] == base["defaultWeights"]
    assert "gold.priority_field_weights" not in source
    assert "RUNTIME_WEIGHTS_FILE.write" not in source


def test_notebook_builder_includes_the_same_pure_scorer_as_the_api(capsys):
    path = ROOT / "fabric" / "scripts" / "build_notebooks.py"
    spec = importlib.util.spec_from_file_location("weight_notebook_builder", path)
    builder = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(builder)
    assert builder.SHARED_SOURCE_PARTS["inference-predictions"] == [ROOT / "api" / "app" / "priority_scoring.py"]
    notebook = next(item for item in builder.ITEMS["notebooks"] if item["key"] == "inference-predictions")
    builder.build(notebook, check_only=True)
    assert "ok   inference-predictions" in capsys.readouterr().out
    for part in (NOTEBOOK / "src").glob("*.py"):
        ast.parse(part.read_text(encoding="utf-8"))


def test_shared_scoring_injection_does_not_add_cells_to_unrelated_notebooks(capsys):
    path = ROOT / "fabric" / "scripts" / "build_notebooks.py"
    spec = importlib.util.spec_from_file_location("unrelated_notebook_builder", path)
    builder = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(builder)
    notebook = next(item for item in builder.ITEMS["notebooks"] if item["key"] == "feature-engineering")
    parts = sorted((ROOT / notebook["sourceParts"]).glob("*.py"))
    original_cells = builder.split_cells("\n".join(part.read_text(encoding="utf-8") for part in parts) + "\n")
    builder.build(notebook, check_only=True)
    assert f"{len(original_cells)} cells" in capsys.readouterr().out
