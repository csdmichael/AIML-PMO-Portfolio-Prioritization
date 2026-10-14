#!/usr/bin/env python3
"""Deploys Fabric items from config: folders, notebooks, and the PMO Full Pipeline. Optionally runs them.

Workspace and lakehouse IDs come from infra/config/pmo-deployment.json. Folder names, notebook names, and the pipeline
definition come from config/fabric-items.json. Tokens come from `az account get-access-token`.

Usage:
  python deploy_fabric_items.py --scope all
  python deploy_fabric_items.py --scope notebooks --keys feature-engineering
  python deploy_fabric_items.py --run feature-engineering --run inference-predictions
  python deploy_fabric_items.py --run pipeline
"""

from __future__ import annotations

import argparse
import base64
import json
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
ITEMS = json.loads((REPO / "config" / "fabric-items.json").read_text(encoding="utf-8"))
DEPLOYMENT = json.loads((REPO / "infra" / "config" / "pmo-deployment.json").read_text(encoding="utf-8"))
ENTRY = json.loads((REPO / "config" / "data-entry.json").read_text(encoding="utf-8"))
API = ITEMS["api"]["baseUrl"]
WORKSPACE_ID = DEPLOYMENT["fabric"]["workspaceId"]
ML_FOLDER_NAME = ITEMS["mlNotebooksFolder"]
POLL = ITEMS["longRunning"]


def token() -> str:
    result = subprocess.run(
        ["az", "account", "get-access-token", "--resource", ITEMS["api"]["tokenResource"], "--query", "accessToken", "-o", "tsv"],
        capture_output=True, text=True, check=True, shell=sys.platform == "win32",
    )
    return result.stdout.strip()


TOKEN = token()


def call(method: str, url: str, body: dict | None = None):
    data = None if body is None else json.dumps(body).encode("utf-8")
    request = urllib.request.Request(url, data=data, method=method, headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            payload = response.read()
            location = response.headers.get("Location")
            status = response.status
    except urllib.error.HTTPError as error:
        raise SystemExit(f"{method} {url} failed: {error.code} {error.read().decode('utf-8', 'replace')[:800]}")
    parsed = json.loads(payload) if payload else {}
    return status, parsed, location


def wait_operation(location: str) -> dict:
    for _ in range(POLL["maxAttempts"]):
        time.sleep(POLL["pollSeconds"])
        _, operation, _ = call("GET", location)
        if operation.get("status") in ("Succeeded", "Completed"):
            _, result, _ = call("GET", location + "/result")
            return result
        if operation.get("status") in ("Failed", "Cancelled"):
            raise SystemExit(f"Operation failed: {json.dumps(operation)[:800]}")
    raise SystemExit(f"Timed out waiting for {location}")


def list_items(path: str) -> list[dict]:
    _, payload, _ = call("GET", f"{API}/workspaces/{WORKSPACE_ID}/{path}")
    return payload.get("value", [])


def ensure_folder(display: str, parent_id: str | None, existing: list[dict]) -> str:
    match = next((f for f in existing if f["displayName"] == display and f.get("parentFolderId") == parent_id), None)
    if match:
        return match["id"]
    body = {"displayName": display}
    if parent_id:
        body["parentFolderId"] = parent_id
    _, created, _ = call("POST", f"{API}/workspaces/{WORKSPACE_ID}/folders", body)
    existing.append(created)
    print(f"folder created: {display}")
    return created["id"]


def ensure_folders() -> dict[str, str]:
    existing = list_items("folders")
    ids: dict[str, str] = {}
    for top in ITEMS["workspaceFolders"]:
        top_id = ensure_folder(top["displayName"], None, existing)
        ids[top["key"]] = top_id
        for child in top.get("children", []):
            ids[child["key"]] = ensure_folder(child["displayName"], top_id, existing)
    return ids


def definition(parts: list[tuple[str, bytes]], fmt: str | None = None) -> dict:
    result = {"parts": [{"path": path, "payload": base64.b64encode(data).decode("ascii"), "payloadType": "InlineBase64"} for path, data in parts]}
    if fmt:
        result["format"] = fmt
    return result


def upsert(kind: str, display: str, folder_id: str, parts: list[tuple[str, bytes]], fmt: str | None = None) -> str:
    existing = next((i for i in list_items(kind) if i["displayName"] == display), None)
    if existing:
        url = f"{API}/workspaces/{WORKSPACE_ID}/{kind}/{existing['id']}/updateDefinition"
        status, _, location = call("POST", url, {"definition": definition(parts, fmt)})
        if status == 202 and location:
            wait_operation(location)
        print(f"{kind} updated: {display}")
        return existing["id"]
    body = {"displayName": display, "folderId": folder_id, "definition": definition(parts, fmt)}
    status, created, location = call("POST", f"{API}/workspaces/{WORKSPACE_ID}/{kind}", body)
    if status == 202 and location:
        created = wait_operation(location)
    print(f"{kind} created: {display}")
    return created["id"]


def deploy_notebooks(folder_ids: dict[str, str], keys: set[str] | None) -> dict[str, str]:
    notebook_ids: dict[str, str] = {}
    for notebook in ITEMS["notebooks"]:
        if keys and notebook["key"] not in keys:
            continue
        content = (REPO / notebook["localPath"]).read_bytes()
        notebook_ids[notebook["key"]] = upsert("notebooks", notebook["displayName"], folder_ids[notebook["folderKey"]], [("notebook-content.ipynb", content)], fmt="ipynb")
    return notebook_ids


def deploy_pipeline(folder_ids: dict[str, str], notebook_ids: dict[str, str]) -> str:
    spec = ITEMS["dataPipeline"]
    ids = {}
    for key in spec["notebookKeysInOrder"]:
        if key not in notebook_ids:
            ids[key] = next(n["id"] for n in list_items("notebooks") if n["displayName"] == next(x["displayName"] for x in ITEMS["notebooks"] if x["key"] == key))
        else:
            ids[key] = notebook_ids[key]
    activities, previous = [], None
    for key in spec["notebookKeysInOrder"]:
        name = next(x["displayName"] for x in ITEMS["notebooks"] if x["key"] == key)
        activity = {
            "name": name,
            "type": "TridentNotebook",
            "dependsOn": [] if previous is None else [{"activity": previous, "dependencyConditions": ["Succeeded"]}],
            "policy": {"timeout": "0.12:00:00", "retry": 0, "retryIntervalInSeconds": 30, "secureOutput": False, "secureInput": False},
            "typeProperties": {"notebookId": ids[key], "workspaceId": WORKSPACE_ID},
        }
        activities.append(activity)
        previous = name
    content = json.dumps({"properties": {"activities": activities}}, indent=2).encode("utf-8")
    template = REPO / spec["localPath"]
    template.parent.mkdir(parents=True, exist_ok=True)
    template.write_bytes(content)
    return upsert("dataPipelines", spec["displayName"], folder_ids[spec["folderKey"]], [("pipeline-content.json", content)])


def run_item(kind: str, display: str, job_type: str) -> None:
    item = next((i for i in list_items(kind) if i["displayName"] == display), None)
    if not item:
        raise SystemExit(f"{display} not found in the workspace")
    status, _, location = call("POST", f"{API}/workspaces/{WORKSPACE_ID}/items/{item['id']}/jobs/instances?jobType={job_type}")
    print(f"started {display} ({job_type}), status {status}")
    for _ in range(POLL["maxAttempts"]):
        time.sleep(POLL["pollSeconds"])
        _, job, _ = call("GET", location)
        state = job.get("status")
        if state in ("Completed", "Failed", "Cancelled", "Deduped"):
            print(f"{display}: {state} {json.dumps(job)[:600]}")
            if state != "Completed":
                raise SystemExit(1)
            return
    raise SystemExit(f"Timed out waiting for {display}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--scope", choices=["folders", "notebooks", "pipeline", "all"], default="all")
    parser.add_argument("--keys", nargs="*")
    parser.add_argument("--run", action="append", default=[], help="notebook key or 'pipeline'")
    args = parser.parse_args()
    folders = ensure_folders()
    if args.scope in ("notebooks", "all"):
        notebook_ids = deploy_notebooks(folders, set(args.keys) if args.keys else None)
    else:
        notebook_ids = {}
    if args.scope in ("pipeline", "all"):
        pipeline_id = deploy_pipeline(folders, notebook_ids)
        print(f"pipeline id: {pipeline_id}")
    for target in args.run:
        if target == "pipeline":
            run_item("dataPipelines", ITEMS["dataPipeline"]["displayName"], "Pipeline")
        else:
            notebook = next(n for n in ITEMS["notebooks"] if n["key"] == target)
            run_item("notebooks", notebook["displayName"], "RunNotebook")
    print("done")


if __name__ == "__main__":
    main()
