"""RFC 9457 problem documents. Every error response from the API uses this shape."""

import logging
from dataclasses import dataclass
from http import HTTPStatus
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict
from starlette.exceptions import HTTPException as StarletteHTTPException

PROBLEM_MEDIA_TYPE = "application/problem+json"
_LOCATION_KINDS = frozenset({"body", "query", "path", "header", "cookie", "form"})
logger = logging.getLogger("pmo.api")


@dataclass(frozen=True)
class FieldIssue:
    field: str
    message: str


class ProblemError(Exception):
    def __init__(
        self,
        status: int,
        detail: str,
        *,
        slug: str,
        errors: list[FieldIssue] | None = None,
        extensions: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(detail)
        self.status = status
        self.detail = detail
        self.slug = slug
        self.errors = list(errors or [])
        self.extensions = dict(extensions or {})
        self.headers = dict(headers or {})


class ProblemField(BaseModel):
    field: str
    message: str


class ProblemDocument(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: str
    title: str
    status: int
    detail: str
    instance: str
    errors: list[ProblemField] | None = None


def status_title(status: int) -> str:
    try:
        return HTTPStatus(status).phrase
    except ValueError:
        return "Error"


def build_problem(
    *,
    type_base: str,
    status: int,
    slug: str,
    detail: str,
    instance: str,
    errors: list[FieldIssue] | None = None,
    extensions: dict[str, Any] | None = None,
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "type": f"{type_base}{slug}",
        "title": status_title(status),
        "status": status,
        "detail": detail,
        "instance": instance,
    }
    if errors:
        body["errors"] = [{"field": issue.field, "message": issue.message} for issue in errors]
    for name, value in (extensions or {}).items():
        body.setdefault(name, value)
    return body


def problem_response(request: Request, error: ProblemError, *, type_base: str) -> JSONResponse:
    body = build_problem(
        type_base=type_base,
        status=error.status,
        slug=error.slug,
        detail=error.detail,
        instance=request.url.path,
        errors=error.errors,
        extensions=error.extensions,
    )
    return JSONResponse(
        status_code=error.status,
        content=body,
        media_type=PROBLEM_MEDIA_TYPE,
        headers=error.headers or None,
    )


def _field_path(location: Any) -> str:
    return ".".join(str(part) for part in location if part not in _LOCATION_KINDS)


def register_problem_handlers(app: FastAPI, *, type_base: str) -> None:
    @app.exception_handler(ProblemError)
    async def handle_problem(request: Request, error: ProblemError) -> JSONResponse:
        return problem_response(request, error, type_base=type_base)

    @app.exception_handler(RequestValidationError)
    async def handle_validation(request: Request, error: RequestValidationError) -> JSONResponse:
        issues = [FieldIssue(_field_path(item["loc"]), str(item["msg"])) for item in error.errors()]
        problem = ProblemError(422, "The request is not valid.", slug="validation-failed", errors=issues)
        return problem_response(request, problem, type_base=type_base)

    @app.exception_handler(StarletteHTTPException)
    async def handle_http(request: Request, error: StarletteHTTPException) -> JSONResponse:
        detail = error.detail if isinstance(error.detail, str) else status_title(error.status_code)
        slug = status_title(error.status_code).lower().replace(" ", "-")
        problem = ProblemError(error.status_code, detail, slug=slug, headers=error.headers)
        return problem_response(request, problem, type_base=type_base)

    @app.exception_handler(Exception)
    async def handle_unexpected(request: Request, error: Exception) -> JSONResponse:
        logger.exception("Unhandled error for %s", request.url.path)
        problem = ProblemError(500, "An unexpected error occurred.", slug="internal-error")
        return problem_response(request, problem, type_base=type_base)
