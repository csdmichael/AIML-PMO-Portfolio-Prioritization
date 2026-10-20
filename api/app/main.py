"""FastAPI application. Routes sit under the configured prefix (/v1). Swagger UI and the OpenAPI document are
served at the configured paths. The unversioned /health route is for platform probes and is not in the schema.
"""

from typing import Any

from azure.core.exceptions import ClientAuthenticationError
from fastapi import FastAPI, Request
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse

from app.config import AppConfig
from app.container import Services, build_services
from app.contracts import FieldRule, static_option_values
from app.onelake import LakeConflict, LakeError, LakeUnavailable
from app.problems import ProblemError, problem_response, register_problem_handlers
from app.routes import admin, agent, agent_tools, capacity, decisions, health, intake, onelake, options, pipeline, portfolio, projects, recommendations, templates, uploads
from app.schemas import body_schema

_VERSIONED_MODULES = (options, portfolio, projects, uploads, pipeline, capacity, decisions, templates, intake, agent, agent_tools, admin, recommendations, onelake)


def _register_upstream_handlers(app: FastAPI, type_base: str) -> None:
    def respond(request: Request, status: int, slug: str, message: str) -> JSONResponse:
        return problem_response(request, ProblemError(status, message, slug=slug), type_base=type_base)

    @app.exception_handler(LakeUnavailable)
    async def lake_unavailable(request: Request, error: LakeUnavailable) -> JSONResponse:
        return respond(request, 503, "service-unavailable", str(error))

    @app.exception_handler(ClientAuthenticationError)
    async def identity_unavailable(request: Request, error: ClientAuthenticationError) -> JSONResponse:
        return respond(request, 503, "service-unavailable", "The API identity could not get a token. Check the sign-in for this environment.")

    @app.exception_handler(LakeConflict)
    async def lake_conflict(request: Request, error: LakeConflict) -> JSONResponse:
        return respond(request, 409, "conflict", str(error))

    @app.exception_handler(LakeError)
    async def lake_error(request: Request, error: LakeError) -> JSONResponse:
        return respond(request, 502, "upstream-failure", str(error))


def _attach_request_schemas(schema: dict[str, Any], config: AppConfig) -> None:
    contract = config.data_entry
    relationship_types = contract.options.relationshipTypes

    def allowed(rule: FieldRule) -> list[str] | None:
        return static_option_values(contract, rule)

    bodies = {
        "createProject": body_schema(contract.projectFields, allowed_for=allowed, relationship_types=relationship_types),
        "createPortfolio": body_schema(contract.portfolioFields, allowed_for=allowed, relationship_types=relationship_types),
    }
    for path_item in schema.get("paths", {}).values():
        if not isinstance(path_item, dict):
            continue
        for operation in path_item.values():
            if isinstance(operation, dict) and operation.get("operationId") in bodies:
                body = bodies[operation["operationId"]]
                operation["requestBody"] = {"required": True, "content": {"application/json": {"schema": body}}}


def _openapi_builder(app: FastAPI, config: AppConfig):
    def build() -> dict[str, Any]:
        if app.openapi_schema is None:
            schema = get_openapi(
                title=app.title,
                version=app.version,
                description=app.description,
                routes=app.routes,
                tags=app.openapi_tags,
            )
            _attach_request_schemas(schema, config)
            app.openapi_schema = schema
        return app.openapi_schema

    return build


def create_app(services: Services | None = None) -> FastAPI:
    services = services or build_services()
    config = services.config
    api = config.api.api
    app = FastAPI(
        title=api.title,
        description=api.description,
        version=api.version,
        docs_url=api.docsPath,
        openapi_url=api.openApiPath,
        openapi_tags=[{"name": tag.name, "description": tag.description} for tag in api.tags],
    )
    app.state.services = services
    register_problem_handlers(app, type_base=config.api.problems.typeBase)
    _register_upstream_handlers(app, config.api.problems.typeBase)
    app.include_router(health.router, include_in_schema=False)
    app.include_router(health.router, prefix=api.routePrefix)
    for module in _VERSIONED_MODULES:
        app.include_router(module.router, prefix=api.routePrefix)
    app.openapi = _openapi_builder(app, config)
    return app


app = create_app()
