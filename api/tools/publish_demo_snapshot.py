"""Capture the verified repository-generated demo export without changing active projects.

Run from api/: uv run python -m tools.publish_demo_snapshot --confirm-synthetic
The dedicated snapshot is create-only; subsequent runs validate and preserve it.
"""

import argparse
import importlib.util
from pathlib import Path
from typing import Any

from app.config import REPO_ROOT
from app.container import build_services
from app.demo_data import validate_snapshot
from app.files import utc_now
from app.system_settings import read_settings


def generated_project_names(generator_path: Path) -> dict[str, str]:
    spec = importlib.util.spec_from_file_location("pmo_demo_generator", generator_path)
    if spec is None or spec.loader is None:
        raise RuntimeError("The repository demo generator could not be loaded")
    generator = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(generator)
    projects = generator.build_projects(*generator.build_roster())
    return {project["id"]: project["name"] for project in projects}


def verify_demo_names(export: dict[str, Any], expected: dict[str, str]) -> dict[str, str]:
    projects = export.get("projects") or []
    actual = {project["projectId"]: project.get("projectName") for project in projects}
    if actual.keys() != expected.keys() or len(projects) != len(expected):
        raise RuntimeError("The export does not match the repository-generated synthetic project IDs")
    if any(name is not None and name != expected[project_id] for project_id, name in actual.items()):
        raise RuntimeError("The export contains project names that differ from the repository-generated synthetic data")
    restored = {}
    for project in projects:
        if project.get("projectName") is None:
            restored[project["projectId"]] = expected[project["projectId"]]
            project["projectName"] = expected[project["projectId"]]
    return restored


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--confirm-synthetic", action="store_true", help="Confirm this environment contains synthetic demo data")
    args = parser.parse_args()
    if not args.confirm_synthetic:
        parser.error("--confirm-synthetic is required; an arbitrary production export must never become the demo source")
    services = build_services()
    if not read_settings(services.config, services.lake).isDemoEnvironment:
        raise RuntimeError("Snapshot publication is permitted only in demo mode")
    destination = services.paths.demo_source()
    existing = services.lake.read_json(destination)
    if existing is not None:
        snapshot = validate_snapshot(existing[0], services.config)
        print(f"Preserved existing approved snapshot: {len(snapshot.export.projects)} projects at {destination}")
        return
    source_path = services.paths.portfolio_export()
    found = services.lake.read_json(source_path)
    if found is None:
        raise RuntimeError(f"The Fabric portfolio export is missing at {source_path}")
    export, etag = found
    expected = generated_project_names(REPO_ROOT / services.config.api.demo.generatorFile)
    restored = verify_demo_names(export, expected)
    snapshot = validate_snapshot({
        "isSynthetic": True, "capturedAtUtc": utc_now(), "sourceExportPath": source_path,
        "sourceExportEtag": etag, "restoredProjectNames": restored, "export": export,
    }, services.config)
    actual = {project.projectId: project.projectName for project in snapshot.export.projects}
    if actual != expected:
        raise RuntimeError("The export does not exactly match the 100 repository-generated synthetic project IDs and names; no snapshot was published")
    services.lake.write_json(destination, snapshot.model_dump())
    saved = services.lake.read_json(destination)
    if saved is None or saved[0] != snapshot.model_dump():
        raise RuntimeError("The saved demo snapshot could not be verified")
    print(f"Published and verified {len(actual)} synthetic projects at {destination}. Active projects were not changed.")
    if restored:
        print("Restored missing names from the deterministic source generator for: " + ", ".join(sorted(restored)))


if __name__ == "__main__":
    main()
