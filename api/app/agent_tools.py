"""Read-only, bounded queries over the approved OneLake portfolio export."""

import json
import logging
import math
import os
from typing import Any, Literal
from uuid import uuid4

import jwt
from pydantic import BaseModel, ConfigDict, Field

from app.problems import ProblemError

logger = logging.getLogger("pmo.api.agent.tools")
TOOL_NAME = "query_portfolio"


class PortfolioQuery(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: Literal["projects", "budgetByBusinessUnit", "capacity"]
    projectIds: list[str] = Field(max_length=25)
    tier: Literal["", "Must-do-now", "Proceed", "Can wait", "Deprioritize"]
    businessUnit: str = Field(max_length=120)
    limit: int = Field(ge=1, le=25)
    includeDetails: bool


def tool_definition() -> dict[str, Any]:
    schema = PortfolioQuery.model_json_schema()
    schema.pop("title", None)
    return {
        "type": "function", "name": TOOL_NAME,
        "description": (
            "Read approved Fabric OneLake portfolio evidence. Projects are ordered by priorityScore descending "
            "(source order breaks ties). Filters are exact matches; empty filters mean all approved records. "
            "budgetByBusinessUnit computes exact USD totals/counts; capacity returns skill supply/demand. "
            "includeDetails adds recorded SHAP drivers, rules and dependency links, not inferred causes. "
            "Results are bounded; never treat returned rows as the entire portfolio when truncated is true."
        ),
        "parameters": schema, "strict": True,
    }


def query_portfolio(snapshot: Any, query: PortfolioQuery) -> dict[str, Any]:
    if not isinstance(snapshot, dict) or not isinstance(snapshot.get("projects"), list):
        raise ProblemError(502, "The OneLake portfolio snapshot is invalid.", slug="upstream-failure")
    projects = snapshot["projects"]
    if any(not isinstance(p, dict) or not isinstance(p.get("projectId"), str) for p in projects):
        raise ProblemError(502, "The OneLake portfolio has invalid project records.", slug="upstream-failure")
    # A project ranking needs only scores; a budget rollup needs cost. A gap in an unused field is not fatal.
    required = {"projects": ("priorityScore",), "budgetByBusinessUnit": ("costEstimateUsd",)}.get(query.kind, ())
    scope = [
        p for p in projects
        if (not query.projectIds or p["projectId"] in query.projectIds)
        and (not query.businessUnit or p.get("businessUnit") == query.businessUnit)
    ]
    if any(
        isinstance(p.get(field), bool) or not isinstance(p.get(field), (int, float)) or not math.isfinite(p[field])
        for p in scope for field in required
    ):
        raise ProblemError(502, "OneLake numeric evidence is invalid.", slug="upstream-failure")
    selected = [
        p for p in projects
        if (not query.projectIds or p["projectId"] in query.projectIds)
        and (not query.tier or p.get("finalTier") == (
            "Candidate to deprioritize" if query.tier == "Deprioritize" else query.tier
        ))
        and (not query.businessUnit or p.get("businessUnit") == query.businessUnit)
    ]
    if query.kind == "projects":
        selected = sorted(selected, key=lambda p: p["priorityScore"], reverse=True)
        fields = (
            "projectId", "projectName", "portfolio", "businessUnit", "finalTier", "priorityScore",
            "businessValue", "costEstimateUsd", "confidenceScore", "recommendedAction", "regulatorySecurity",
        )
        records = [{key: p[key] for key in fields if key in p} for p in selected[:query.limit]]
        if query.includeDetails:
            for record, project in zip(records, selected, strict=False):
                for key, limit in (("topDrivers", 10), ("ruleOverrides", 5), ("coupledProjects", 10)):
                    record[key] = project.get(key, [])[:limit]
        source_ids = [p["projectId"] for p in selected[:query.limit]]
        total = len(selected)
    elif query.kind == "budgetByBusinessUnit":
        groups: dict[str, dict[str, Any]] = {}
        for project in selected:
            unit = project.get("businessUnit", "Unspecified")
            group = groups.setdefault(unit, {"businessUnit": unit, "costEstimateUsd": 0, "projectCount": 0})
            group["costEstimateUsd"] += project["costEstimateUsd"]
            group["projectCount"] += 1
        records = sorted(groups.values(), key=lambda row: row["costEstimateUsd"], reverse=True)[:query.limit]
        units = {r["businessUnit"] for r in records}
        source_ids = [p["projectId"] for p in selected if p.get("businessUnit", "Unspecified") in units]
        total = len(groups)
    else:
        if query.projectIds or query.tier or query.businessUnit:
            raise ProblemError(422, "Capacity queries do not support project filters.", slug="validation-error")
        capacity = snapshot.get("capacityBySkill")
        if not isinstance(capacity, list):
            raise ProblemError(502, "Capacity evidence is unavailable in OneLake.", slug="upstream-failure")
        records = capacity[:query.limit]
        source_ids = []
        total = len(capacity)
    result = {
        "queryId": str(uuid4()),
        "source": "fabric-onelake", "path": "Files/exports/portfolio.json",
        "generatedAtUtc": snapshot.get("generatedAtUtc"), "asOfDate": snapshot.get("asOfDate"),
        "kind": query.kind, "records": records, "sourceProjectIds": source_ids,
        "totalMatching": total, "truncated": total > len(records),
    }
    if len(json.dumps(result).encode("utf-8")) > 64000:
        raise ProblemError(502, "The Fabric query result exceeds the evidence size limit. Narrow the query.", slug="upstream-failure")
    return result


class ToolTokenVerifier:
    """Validate the same workload token at the backend, not just at APIM."""

    def __init__(self) -> None:
        self.tenant = os.environ.get("PMO_TOOL_TENANT_ID", "")
        self.audience = os.environ.get("PMO_TOOL_AUDIENCE", "")
        self.caller = os.environ.get("PMO_TOOL_CALLER_OBJECT_ID", "")
        self.callers = {value.strip() for value in self.caller.split(",") if value.strip()}
        self.jwks = jwt.PyJWKClient(
            f"https://login.microsoftonline.com/{self.tenant}/discovery/v2.0/keys",
            timeout=10,
        ) if self.tenant else None

    def verify(self, authorization: str) -> None:
        if not self.jwks or not self.audience or not self.caller:
            raise ProblemError(503, "Fabric query tool identity is not configured.", slug="service-unavailable")
        if not authorization.startswith("Bearer "):
            raise ProblemError(401, "A workload bearer token is required.", slug="unauthorized")
        token = authorization.removeprefix("Bearer ")
        try:
            key = self.jwks.get_signing_key_from_jwt(token)
            claims = jwt.decode(
                token, key.key, algorithms=["RS256"], audience=self.audience,
                issuer=f"https://login.microsoftonline.com/{self.tenant}/v2.0",
                options={"require": ["exp", "iat", "aud", "iss", "tid", "oid"]},
            )
            if claims["tid"] != self.tenant or claims["oid"] not in self.callers or "Portfolio.Query" not in claims.get("roles", []):
                logger.warning(
                    "Tool caller rejected: oid=%s allowed=%s role_present=%s",
                    claims["oid"], claims["oid"] in self.callers, "Portfolio.Query" in claims.get("roles", []),
                )
                raise jwt.InvalidTokenError("Caller lacks the tool permission")
        except jwt.PyJWKClientConnectionError as error:
            logger.error("Tool token signing keys unavailable")
            raise ProblemError(503, "Tool identity validation is unavailable.", slug="service-unavailable") from error
        except jwt.PyJWTError as error:
            logger.warning("Rejected Fabric tool workload token (%s)", type(error).__name__)
            raise ProblemError(403, "The workload is not authorized to query Fabric.", slug="forbidden") from error
