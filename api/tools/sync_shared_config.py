"""Copies the shared configs named in api/config/api.json into api/config/shared.

Runs at package time: uv run python -m tools.sync_shared_config. With --check nothing is copied, and the
command fails when a copy differs from its repository source.
"""

import argparse
import json
import shutil
import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = API_ROOT.parent
API_SETTINGS_FILE = API_ROOT / "config" / "api.json"


def sync(check_only: bool = False) -> list[str]:
    settings = json.loads(API_SETTINGS_FILE.read_text(encoding="utf-8"))
    shared = settings["sharedConfig"]
    target_dir = API_ROOT / shared["defaultDirectory"]
    problems: list[str] = []
    for spec in shared["files"].values():
        source = REPO_ROOT / spec["repoSource"]
        target = target_dir / spec["fileName"]
        if check_only:
            if not target.is_file() or target.read_bytes() != source.read_bytes():
                problems.append(f"{target} differs from {source}")
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
        print(f"copied {source} -> {target}")
    return problems


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Copy shared configs into api/config/shared.")
    parser.add_argument("--check", action="store_true", help="fail if the copies differ from the repository sources")
    args = parser.parse_args(argv)
    problems = sync(check_only=args.check)
    for problem in problems:
        print(problem, file=sys.stderr)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
