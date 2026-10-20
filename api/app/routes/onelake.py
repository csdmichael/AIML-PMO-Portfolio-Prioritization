"""OneLake dataset API for the UI.

The UI names a dataset by key from config/onelake-datasets.json. A client never supplies a lakehouse path, so the API
cannot be pointed at other files. Updating an existing dataset requires the ETag from the last read, so two editors
cannot overwrite each other silently.
"""

import json
from typing import Any

from fastapi import APIRouter, Body, Depends, Header, Response
from pydantic import BaseModel

from app.container import Services
from app.contracts import OneLakeDataset
from app.problems import FieldIssue, ProblemError
from app.routes.deps import get_services

router = APIRouter(prefix="/onelake", tags=["onelake"])


class DatasetSummary(BaseModel):
    key: str
    label: str
    description: str
    path: str
    shape: str
    access: str
    requiredFields: list[str]
    maxBytes: int


class DatasetList(BaseModel):
    items: list[DatasetSummary]
    count: int


class DatasetView(DatasetSummary):
    exists: bool
    etag: str | None = None
    data: Any = None


def _dataset(services: Services, key: str) -> OneLakeDataset:
    for dataset in services.config.onelake_datasets.datasets:
        if dataset.key == key:
            return dataset
    raise ProblemError(404, f"{key} is not a dataset the UI can use. See GET /v1/onelake/datasets.", slug="not-found")


def _summary(dataset: OneLakeDataset) -> dict[str, Any]:
    return {
        "key": dataset.key,
        "label": dataset.label,
        "description": dataset.description,
        "path": dataset.path,
        "shape": dataset.shape,
        "access": dataset.access,
        "requiredFields": dataset.requiredFields,
        "maxBytes": dataset.maxBytes,
    }


def _check_body(dataset: OneLakeDataset, body: Any) -> None:
    if dataset.shape == "array":
        if not isinstance(body, list) or any(not isinstance(record, dict) for record in body):
            raise ProblemError(422, f"{dataset.label} must be a JSON array of objects.", slug="validation-failed")
        records = body
    else:
        if not isinstance(body, dict):
            raise ProblemError(422, f"{dataset.label} must be a JSON object.", slug="validation-failed")
        records = [body]
    issues = [
        FieldIssue(field, "is required in every record")
        for field in dataset.requiredFields
        if any(record.get(field) in (None, "") for record in records)
    ]
    if issues:
        raise ProblemError(422, f"{dataset.label} is missing required fields.", slug="validation-failed", errors=issues)


@router.get(
    "/datasets",
    response_model=DatasetList,
    operation_id="listOneLakeDatasets",
    summary="Datasets the UI can read or write in OneLake",
)
def list_datasets(services: Services = Depends(get_services)) -> dict[str, Any]:
    items = [_summary(dataset) for dataset in services.config.onelake_datasets.datasets]
    return {"items": items, "count": len(items)}


@router.get(
    "/datasets/{datasetKey}",
    response_model=DatasetView,
    operation_id="getOneLakeDataset",
    summary="Read one OneLake dataset with the ETag needed to update it",
)
def get_dataset(datasetKey: str, response: Response, services: Services = Depends(get_services)) -> dict[str, Any]:
    dataset = _dataset(services, datasetKey)
    found = services.lake.read_json(dataset.path)
    if found is None:
        return {**_summary(dataset), "exists": False, "etag": None, "data": None}
    data, etag = found
    response.headers["ETag"] = f'"{etag}"'
    return {**_summary(dataset), "exists": True, "etag": etag, "data": data}


@router.put(
    "/datasets/{datasetKey}",
    response_model=DatasetView,
    operation_id="putOneLakeDataset",
    summary="Replace one readWrite OneLake dataset",
)
def put_dataset(
    datasetKey: str,
    response: Response,
    body: Any = Body(...),
    if_match: str | None = Header(None, alias="If-Match"),
    services: Services = Depends(get_services),
) -> dict[str, Any]:
    dataset = _dataset(services, datasetKey)
    if dataset.access != "readWrite":
        raise ProblemError(403, f"{dataset.label} is read-only through this API.", slug="forbidden")
    _check_body(dataset, body)
    size = len(json.dumps(body, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
    if size > dataset.maxBytes:
        raise ProblemError(413, f"{dataset.label} is {size} bytes; the limit is {dataset.maxBytes}.", slug="payload-too-large")
    current = services.lake.read_json(dataset.path)
    if current is None:
        etag = services.lake.write_json(dataset.path, body)
    else:
        if not if_match:
            raise ProblemError(428, "Send the ETag from the last read in If-Match to update this dataset.", slug="precondition-required")
        etag = services.lake.write_json(dataset.path, body, etag=if_match.strip('"'))
    response.headers["ETag"] = f'"{etag}"'
    return {**_summary(dataset), "exists": True, "etag": etag, "data": body}
