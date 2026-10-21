"""AI recommendations: the pmo-recommendation-agent researches OneLake evidence and returns a generic report.

The report has no fixed sections or content. The agent chooses the sections and items from the evidence, and the page
renders whatever comes back. Every cited project must be one the OneLake tool returned in this run.
"""

import json
import logging
from typing import Any, Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.agent import AgentRun, clean_web_urls
from app.agent_context import agent_options, render_lines
from app.container import Services
from app.files import utc_now
from app.problems import ProblemError
from app.recommendation_policy import candidate_project, new_project
from app.routes.deps import get_services

logger = logging.getLogger("pmo.api.recommendations")
router = APIRouter(prefix="/recommendations", tags=["recommendations"])


class RecommendationMetric(BaseModel):
    model_config = ConfigDict(extra="forbid")
    label: str = Field(min_length=1, max_length=60)
    value: str = Field(min_length=1, max_length=120)


class RecommendationAction(BaseModel):
    """A write that a person runs from the page. Only these two types exist."""

    model_config = ConfigDict(extra="forbid")
    id: str = Field(min_length=1, max_length=60)
    label: str = Field(min_length=1, max_length=60)
    type: Literal["addProject", "recordDecision"]
    payload: dict[str, Any]


class RecommendationItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(min_length=1, max_length=60)
    title: str = Field(min_length=1, max_length=160)
    subtitle: str | None = Field(default=None, max_length=240)
    summary: str = Field(min_length=1, max_length=1200)
    badges: list[str] = Field(default_factory=list, max_length=6)
    metrics: list[RecommendationMetric] = Field(default_factory=list, max_length=8)
    sourceProjectIds: list[str] = Field(default_factory=list, max_length=25)
    sourceUrls: list[str] = Field(default_factory=list)
    actions: list[RecommendationAction] = Field(default_factory=list, max_length=3)


class RecommendationSection(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(min_length=1, max_length=60)
    title: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=400)
    items: list[RecommendationItem] = Field(default_factory=list)


class RecommendationDraft(BaseModel):
    """The contract the agent must return. The API adds the generation metadata."""

    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=1, max_length=160)
    summary: str = Field(min_length=1, max_length=2000)
    sections: list[RecommendationSection] = Field(default_factory=list)
    sourceProjectIds: list[str] = Field(default_factory=list, max_length=25)
    sourceUrls: list[str] = Field(default_factory=list)


class RecommendationReport(RecommendationDraft):
    generatedAtUtc: str
    portfolioKey: str | None = None
    query: str | None = None
    provenance: dict[str, Any]


class ResearchQueryRequest(BaseModel):
    query: str = Field(min_length=3, max_length=1000)
    portfolioKey: str | None = None


@router.get(
    "/cached",
    response_model=RecommendationReport | None,
    operation_id="getCachedPortfolioRecommendations",
    summary="Last saved OneLake recommendation report for this portfolio and question, or null on a cache miss",
)
def get_cached_recommendations(
    portfolioKey: str | None = Query(None),
    query: str | None = Query(None, min_length=3, max_length=1000),
    services: Services = Depends(get_services),
) -> dict[str, Any] | None:
    cached = services.recommendation_cache.read(portfolio_key=portfolioKey, query=query.strip() if query else None)
    if cached is None:
        return None
    try:
        report = RecommendationReport.model_validate(cached)
    except ValidationError as exc:
        logger.error("The saved recommendation report does not match the report contract")
        raise ProblemError(502, "The saved recommendation report is invalid.", slug="upstream-failure") from exc
    _check_policy(report, services, portfolioKey)
    return report.model_dump()


@router.get(
    "",
    response_model=RecommendationReport,
    operation_id="getPortfolioRecommendations",
    summary="Run the recommendation agent and save its grounded report to OneLake",
)
def get_recommendations(
    portfolioKey: str | None = Query(None, description="Limit the report to one portfolio"),
    services: Services = Depends(get_services),
) -> dict[str, Any]:
    return _report(services, focus=None, portfolio_key=portfolioKey)


@router.post(
    "/research",
    response_model=RecommendationReport,
    operation_id="queryResearcherAgent",
    summary="Ask the recommendation agent a research question and save its grounded report to OneLake",
)
def query_researcher_agent(body: ResearchQueryRequest, services: Services = Depends(get_services)) -> dict[str, Any]:
    return _report(services, focus=body.query.strip(), portfolio_key=body.portfolioKey)


def _report(services: Services, *, focus: str | None, portfolio_key: str | None) -> dict[str, Any]:
    revision = services.recommendation_cache.revision()
    settings = services.config.recommendations
    message = render_lines(
        settings.prompt.userTemplate,
        portfolioKey=portfolio_key or "All portfolios",
        focus=focus or settings.defaultFocus,
        contract=json.dumps(RecommendationDraft.model_json_schema(), ensure_ascii=False),
        options=json.dumps(agent_options(services), ensure_ascii=False),
    )
    draft, run = services.recommendation_agent.structured(
        [
            {"role": "system", "content": "\n".join(settings.prompt.system)},
            {"role": "user", "content": message},
        ],
        RecommendationDraft,
    )
    _check_grounding(draft, run)
    _check_policy(draft, services, portfolio_key)
    draft = _tidy(draft, settings.limits.maxSections, settings.limits.maxItemsPerSection)
    report = RecommendationReport.model_validate({
        **draft.model_dump(),
        "generatedAtUtc": utc_now(),
        "portfolioKey": portfolio_key,
        "query": focus,
        "provenance": services.recommendation_agent.provenance(run),
    }).model_dump()
    services.recommendation_cache.save(report, revision=revision)
    return report


def _check_policy(draft: RecommendationDraft, services: Services, portfolio_key: str | None) -> None:
    projects = services.catalog.agent_snapshot()["projects"]
    proposed: set[str] = set()
    for section in draft.sections:
        for item in section.items:
            additions = [action for action in item.actions if action.type == "addProject"]
            targets = {
                str(action.payload.get("projectId")) for action in item.actions if action.type == "recordDecision"
            }
            if not additions:
                targets.update(item.sourceProjectIds)
            for project_id in targets:
                candidate_project(project_id, projects, portfolio_key=portfolio_key, status=502)
            for action in additions:
                if portfolio_key is not None and action.payload.get("portfolioKey") != portfolio_key:
                    raise ProblemError(502, "A new-project recommendation is outside the selected portfolio.", slug="upstream-failure")
                name = new_project(
                    action.payload, projects, planning_status=services.config.data_entry.progress.planningStatus, status=502,
                )
                if name in proposed:
                    raise ProblemError(502, "The assistant proposed the same new project more than once.", slug="upstream-failure")
                proposed.add(name)


def _check_grounding(draft: RecommendationDraft, run: AgentRun) -> None:
    cited = set(draft.sourceProjectIds)
    for section in draft.sections:
        for item in section.items:
            cited.update(item.sourceProjectIds)
            for action in item.actions:
                if action.type == "recordDecision":
                    cited.add(str(action.payload.get("projectId")))
    ungrounded = cited - run.evidence_ids
    if ungrounded:
        logger.error("Recommendation agent cited %d projects that the OneLake tool did not return", len(ungrounded))
        raise ProblemError(
            502, "The recommendation agent cited projects that the OneLake tool did not return. Please retry.", slug="upstream-failure",
        )


def _tidy(draft: RecommendationDraft, max_sections: int, max_items: int) -> RecommendationDraft:
    sections = []
    for section in draft.sections[:max_sections]:
        items = [
            item.model_copy(update={"sourceUrls": clean_web_urls(item.sourceUrls)})
            for item in section.items[:max_items]
        ]
        sections.append(section.model_copy(update={"items": items}))
    return draft.model_copy(update={"sections": sections, "sourceUrls": clean_web_urls(draft.sourceUrls)})
