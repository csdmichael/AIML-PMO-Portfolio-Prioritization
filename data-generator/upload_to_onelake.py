#!/usr/bin/env python3
"""Uploads data/ to Files/raw/<folder>/ and config/*.json to Files/config/ in the Fabric lakehouse (OneLake).

Targets come from infra/config/pmo-deployment.json (workspace and lakehouse) and config/fabric-items.json (OneLake
endpoint and lake folders). Auth uses DefaultAzureCredential. Each upload is verified by remote size.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from azure.core.exceptions import ResourceExistsError
from azure.identity import DefaultAzureCredential
from azure.storage.filedatalake import DataLakeServiceClient

HERE = Path(__file__).resolve().parent
REPO = HERE.parent


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


DEPLOYMENT = load(REPO / "infra" / "config" / "pmo-deployment.json")
ITEMS = load(REPO / "config" / "fabric-items.json")
SOURCES = load(REPO / "config" / "data-sources.json")


def ensure_directory(fs, path: str) -> None:
    parts = path.split("/")
    for depth in range(3, len(parts) + 1):
        try:
            fs.create_directory("/".join(parts[:depth]))
        except ResourceExistsError:
            pass


def upload(fs, remote: str, local: Path) -> int:
    ensure_directory(fs, remote.rsplit("/", 1)[0])
    client = fs.get_file_client(remote)
    with local.open("rb") as handle:
        client.upload_data(handle, overwrite=True)
    size = local.stat().st_size
    remote_size = client.get_file_properties().size
    if remote_size != size:
        sys.exit(f"Size mismatch for {remote}: local {size}, remote {remote_size}")
    return size


def main() -> None:
    lakehouse_root = f"{DEPLOYMENT['fabric']['lakehouseName']}.Lakehouse"
    service = DataLakeServiceClient(account_url=ITEMS["oneLake"]["dfsEndpoint"], credential=DefaultAzureCredential())
    fs = service.get_file_system_client(DEPLOYMENT["fabric"]["workspaceName"])

    data_root = REPO / SOURCES["localRawRoot"]
    raw_root = SOURCES["lakehouseRawRoot"]
    files, total_bytes = 0, 0
    for local in sorted(p for p in data_root.rglob("*") if p.is_file()):
        remote = f"{lakehouse_root}/{raw_root}/{local.relative_to(data_root).as_posix()}"
        total_bytes += upload(fs, remote, local)
        files += 1
        print(f"raw   {remote}")

    config_root = ITEMS["lakehouse"]["configRoot"]
    for local in sorted((REPO / "config").glob("*.json")):
        remote = f"{lakehouse_root}/{config_root}/{local.name}"
        total_bytes += upload(fs, remote, local)
        files += 1
        print(f"config {remote}")

    print(f"uploaded {files} files, {total_bytes} bytes")
    marker = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if marker:
        from datetime import datetime, timezone

        marker.parent.mkdir(parents=True, exist_ok=True)
        marker.write_text(f"{files} files, {total_bytes} bytes, {datetime.now(timezone.utc).isoformat()}\n", encoding="utf-8")


if __name__ == "__main__":
    main()
