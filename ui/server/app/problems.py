"""RFC 9457 problem documents for the errors this host answers itself."""

from __future__ import annotations

from http import HTTPStatus

from starlette.responses import JSONResponse

PROBLEM_MEDIA_TYPE = "application/problem+json"
UNTYPED_PROBLEM = "about:blank"


def problem_response(status: int, detail: str, instance: str) -> JSONResponse:
    body = {
        "type": UNTYPED_PROBLEM,
        "title": HTTPStatus(status).phrase,
        "status": status,
        "detail": detail,
        "instance": instance,
    }
    return JSONResponse(body, status_code=status, media_type=PROBLEM_MEDIA_TYPE)
