#!/usr/bin/env python3
"""Builds Jupyter notebooks (nbformat 4) from percent-format source parts.

Reads notebook definitions from config/fabric-items.json and the Fabric IDs from infra/config/pmo-deployment.json.
Each notebook's sourceParts folder holds *.py files; they are concatenated in name order and split into cells
at lines starting with '# %%'. A '# %% [markdown]' cell keeps its comment lines as markdown text.

Usage:
  python build_notebooks.py --all
  python build_notebooks.py --key feature-engineering
  python build_notebooks.py --all --check   (validate only, write nothing)
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
ITEMS = json.loads((REPO / "config" / "fabric-items.json").read_text(encoding="utf-8"))
DEPLOYMENT = json.loads((REPO / "infra" / "config" / "pmo-deployment.json").read_text(encoding="utf-8"))
MARKER = "# %%"
MARKDOWN_MARKER = "# %% [markdown]"
KERNELSPEC = {"name": "synapse_pyspark", "display_name": "Synapse PySpark", "language": "python"}


def split_cells(text: str) -> list[dict]:
    cells: list[dict] = []
    current_kind, current_lines = None, []

    def flush() -> None:
        if current_kind is None:
            return
        lines = current_lines
        while lines and lines[-1].strip() == "":
            lines = lines[:-1]
        if current_kind == "markdown":
            body = [line[2:] if line.startswith("# ") else line.lstrip("#") for line in lines]
            source = [line + "\n" for line in body]
        else:
            source = [line + "\n" for line in lines]
        if source:
            source[-1] = source[-1].rstrip("\n")
        cells.append({
            "cell_type": current_kind,
            "metadata": {},
            "source": source,
            **({"execution_count": None, "outputs": []} if current_kind == "code" else {}),
        })

    for raw in text.splitlines():
        if raw.strip() == MARKDOWN_MARKER:
            flush()
            current_kind, current_lines = "markdown", []
        elif raw.strip() == MARKER:
            flush()
            current_kind, current_lines = "code", []
        else:
            if current_kind is None:
                current_kind, current_lines = "code", []
            current_lines.append(raw)
    flush()
    return cells


def build(notebook: dict, check_only: bool) -> None:
    parts_dir = REPO / notebook["sourceParts"]
    parts = sorted(parts_dir.glob("*.py"))
    if not parts:
        raise SystemExit(f"No source parts found in {notebook['sourceParts']}")
    text = "\n".join(part.read_text(encoding="utf-8") for part in parts) + "\n"
    cells = split_cells(text)
    lakehouse = {
        "default_lakehouse": DEPLOYMENT["fabric"]["lakehouseId"],
        "default_lakehouse_name": DEPLOYMENT["fabric"]["lakehouseName"],
        "default_lakehouse_workspace_id": DEPLOYMENT["fabric"]["workspaceId"],
    }
    document = {
        "nbformat": 4,
        "nbformat_minor": 5,
        "metadata": {"kernelspec": KERNELSPEC, "language_info": {"name": "python"}, "dependencies": {"lakehouse": lakehouse}},
        "cells": cells,
    }
    serialized = json.dumps(document, indent=1, ensure_ascii=False)
    if check_only:
        json.loads(serialized)
        print(f"ok   {notebook['key']}: {len(cells)} cells from {len(parts)} parts")
        return
    target = REPO / notebook["localPath"]
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(serialized + "\n", encoding="utf-8")
    print(f"built {notebook['localPath']}: {len(cells)} cells from {len(parts)} parts")


def main() -> None:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--all", action="store_true")
    group.add_argument("--key")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    selected = [n for n in ITEMS["notebooks"] if args.all or n["key"] == args.key]
    if not selected:
        sys.exit(f"No notebook with key {args.key!r}")
    for notebook in selected:
        build(notebook, args.check)


if __name__ == "__main__":
    main()
