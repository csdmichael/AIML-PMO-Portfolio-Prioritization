"""Invoke native Foundry MCP retrieval and validate its OneLake evidence."""

import json
import logging
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Annotated, Any, Literal, NoReturn, TypeVar
from urllib.parse import urlparse

import httpx
from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

from app.auth import CredentialProvider
from app.agent_tools import PortfolioQuery, TOOL_NAME
from app.problems import ProblemError

logger = logging.getLogger("pmo.api.agent")
NonemptyText = Annotated[str, Field(min_length=1)]


def is_web_url(value: str) -> bool:
    parsed = urlparse(value)
    return parsed.scheme in ("http", "https") and bool(parsed.netloc) and len(value) <= 2048


def clean_web_urls(values: list[Any] | None) -> list[str]:
    """Keep only well-formed http(s) URLs, once each, so a malformed citation never reaches the UI."""
    cleaned: list[str] = []
    for value in values or []:
        if isinstance(value, str) and is_web_url(value) and value not in cleaned:
            cleaned.append(value)
    return cleaned[:25]


ModelT = TypeVar("ModelT", bound=BaseModel)
INVALID_RESPONSE = "The Foundry agent returned an invalid or ungrounded response. Please retry."
URL_PATTERN = re.compile(r"https?://[^\s\"'\\<>\]\)]+")


class McpToolSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    type: Literal["mcp"]
    serverLabel: str
    serverUrl: str
    connectionName: str
    allowedTools: list[str]
    requireApproval: str


class BingToolSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    type: Literal["bing_grounding"]
    projectConnectionId: str


class EvidenceSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    onelake: bool
    web: bool


class AgentSettings(BaseModel):
    projectEndpoint: str
    apiVersion: str
    agentName: str
    agentVersion: str
    model: str
    description: str
    tokenScope: str
    timeoutSeconds: float
    maxOutputTokens: int
    instructions: str
    responseStyleInstructions: str | None = None
    reasoningEffort: Literal["none", "minimal", "low", "medium", "high"] | None = None
    tools: list[Annotated[McpToolSettings | BingToolSettings, Field(discriminator="type")]]
    evidence: EvidenceSettings

    @property
    def mcp(self) -> McpToolSettings | None:
        return next((tool for tool in self.tools if isinstance(tool, McpToolSettings)), None)


def load_agent_settings(filename: str = "portfolio-agent.json") -> AgentSettings:
    path = Path(__file__).resolve().parents[1] / "config" / filename
    return AgentSettings.model_validate_json(path.read_text(encoding="utf-8"))


class AgentTable(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str
    headers: list[str] = Field(max_length=20)
    rows: list[list[str]] = Field(max_length=25)

    @model_validator(mode="after")
    def rectangular(self) -> "AgentTable":
        if any(len(row) != len(self.headers) for row in self.rows):
            raise ValueError("Table rows must match the number of headers.")
        return self


class AgentAnswer(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    text: NonemptyText
    tableData: AgentTable
    sourceProjectIds: list[str]


@dataclass(frozen=True)
class AgentRun:
    text: str
    response_id: str
    evidence_ids: frozenset[str]
    query_ids: tuple[str, ...]
    web_searches: int = 0
    web_citations: frozenset[str] = frozenset()


class FoundryAgentClient:
    def __init__(self, settings: AgentSettings, credentials: CredentialProvider) -> None:
        self.settings = settings
        self.credentials = credentials

    def run(self, inputs: list[dict[str, Any]]) -> AgentRun:
        deadline = time.monotonic() + self.settings.timeoutSeconds
        evidence_ids: set[str] = set()
        query_ids: list[str] = []
        result = self._invoke([{"type": "message", **item} for item in inputs], deadline)
        output = result.get("output")
        if (
            result.get("status") != "completed" or not isinstance(output, list)
            or any(not isinstance(item, dict) for item in output)
        ):
            self._invalid_response()
        calls = [item for item in output if item.get("type") == "mcp_call"]
        if len(calls) > 4 or any(
            item.get("type") in ("function_call", "mcp_approval_request") for item in output
        ):
            self._invalid_response()
        # The model may retry after a rejected query; only validated calls can ground the answer.
        failure: ProblemError | None = None
        for call in calls:
            try:
                evidence = self._evidence(call)
            except ProblemError as error:
                failure = error
                continue
            evidence_ids.update(evidence["sourceProjectIds"])
            query_ids.append(evidence["queryId"])
        if self.settings.evidence.onelake and not query_ids:
            raise failure or ProblemError(502, "The OneLake MCP tool returned no evidence.", slug="upstream-failure")
        text = self._output_text(output)
        web_searches, web_citations = self._web_evidence(output)
        if self.settings.evidence.web and not web_searches:
            logger.error("Foundry agent did not use the Bing grounding tool")
            self._invalid_response()
        response_id = result.get("id")
        if not isinstance(response_id, str) or not response_id:
            self._invalid_response()
        logger.info(
            "Foundry agent %s:%s response %s queries %s web searches %s",
            self.settings.agentName, self.settings.agentVersion, response_id, query_ids, web_searches,
        )
        return AgentRun(
            text=text, response_id=response_id, evidence_ids=frozenset(evidence_ids),
            query_ids=tuple(query_ids), web_searches=web_searches, web_citations=frozenset(web_citations),
        )

    def answer(self, question: str, history: list[dict[str, str]]) -> dict[str, Any]:
        inputs = [*history, {"role": "user", "content": question}]
        if self.settings.responseStyleInstructions:
            inputs.insert(0, {"role": "system", "content": self.settings.responseStyleInstructions})
        run = self.run(inputs)
        try:
            answer = AgentAnswer.model_validate_json(run.text)
        except ValidationError as error:
            logger.error("Foundry agent answer did not match the chat contract")
            raise ProblemError(502, INVALID_RESPONSE, slug="upstream-failure") from error
        if not set(answer.sourceProjectIds).issubset(run.evidence_ids):
            logger.error("Foundry agent cited projects that the OneLake tool did not return")
            raise ProblemError(502, INVALID_RESPONSE, slug="upstream-failure")
        return {
            **answer.model_dump(),
            "sourceRecordCount": len(set(answer.sourceProjectIds)),
            "provenance": self.provenance(run),
        }

    def structured(self, inputs: list[dict[str, Any]], model: type[ModelT]) -> tuple[ModelT, AgentRun]:
        run = self.run(inputs)
        try:
            return model.model_validate_json(run.text), run
        except ValidationError as error:
            logger.error("Foundry agent output did not match %s", model.__name__)
            raise ProblemError(502, INVALID_RESPONSE, slug="upstream-failure") from error

    def provenance(self, run: AgentRun) -> dict[str, Any]:
        settings = self.settings
        return {
            "provider": "azure-ai-foundry",
            "agentName": settings.agentName,
            "agentVersion": settings.agentVersion,
            "responseId": run.response_id,
            "groundingSource": "fabric-onelake-via-apim" if settings.evidence.onelake else "bing-web-search",
            "queryIds": list(run.query_ids),
            "webSearches": run.web_searches,
            "webCitations": sorted(run.web_citations)[:25],
        }

    def _evidence(self, call: dict[str, Any]) -> dict[str, Any]:
        try:
            mcp = self.settings.mcp
            if (
                mcp is None or call.get("name") != TOOL_NAME or call.get("server_label") != mcp.serverLabel
                or call.get("status") != "completed" or call.get("error") is not None
            ):
                raise ValueError("MCP call failed or is not allowlisted")
            arguments = json.loads(call["arguments"])
            if not isinstance(arguments, dict):
                raise ValueError("Invalid MCP arguments")
            # APIM exposes the REST request body as one named MCP argument.
            body = arguments.get("body", arguments.get("PortfolioQuery", arguments))
            if isinstance(body, str):
                body = json.loads(body)
            query = PortfolioQuery.model_validate(body)
            if not isinstance(call["output"], str) or len(call["output"].encode("utf-8")) > 128000:
                raise ValueError("MCP evidence exceeds the transport size limit")
            evidence = json.loads(call["output"])
            if isinstance(evidence, dict) and "content" in evidence:
                if evidence.get("isError") or len(evidence["content"]) != 1:
                    raise ValueError("MCP returned an error or unexpected content")
                evidence = json.loads(evidence["content"][0]["text"])
            if (
                not isinstance(evidence, dict) or evidence.get("source") != "fabric-onelake"
                or evidence.get("kind") != query.kind
                or not isinstance(evidence.get("queryId"), str) or not evidence["queryId"]
                or not isinstance(evidence.get("records"), list) or len(evidence["records"]) > query.limit
                or not isinstance(evidence.get("sourceProjectIds"), list)
                or any(not isinstance(value, str) for value in evidence["sourceProjectIds"])
            ):
                raise ValueError("Invalid OneLake MCP evidence")
            return evidence
        except (ValueError, KeyError, TypeError, ValidationError) as error:
            logger.error("Invalid OneLake MCP call or evidence (%s)", type(error).__name__)
            raise ProblemError(
                502, "The OneLake MCP tool failed or returned invalid evidence. Check APIM, the Fabric capacity and exports.",
                slug="upstream-failure",
            ) from error

    def _invoke(self, inputs: list[dict[str, Any]], deadline: float) -> dict[str, Any]:
        settings = self.settings
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise ProblemError(504, "The agent query timed out.", slug="upstream-timeout")
        mcp = settings.mcp
        tool_choice: Any = (
            {"type": "mcp", "server_label": mcp.serverLabel, "name": TOOL_NAME}
            if mcp is not None and not settings.evidence.web else "required"
        )
        payload = {
            "agent": {"type": "agent_reference", "name": settings.agentName, "version": settings.agentVersion},
            "input": inputs,
            "store": False,
            "max_output_tokens": settings.maxOutputTokens,
            "tool_choice": tool_choice,
            "max_tool_calls": 4,
        }
        if settings.reasoningEffort is not None:
            payload["reasoning"] = {"effort": settings.reasoningEffort}
        try:
            response = httpx.post(
                f"{settings.projectEndpoint.rstrip('/')}/openai/responses",
                params={"api-version": settings.apiVersion},
                headers={"Authorization": f"Bearer {self.credentials.bearer_token(settings.tokenScope)}"},
                json=payload,
                timeout=remaining,
            )
            response.raise_for_status()
        except httpx.TimeoutException as error:
            logger.warning("Foundry agent request timed out")
            raise ProblemError(504, "The Foundry agent timed out. Please retry.", slug="upstream-timeout") from error
        except httpx.HTTPStatusError as error:
            request_id = error.response.headers.get("x-request-id", "")
            logger.error("Foundry agent returned HTTP %s (request %s)", error.response.status_code, request_id)
            raise ProblemError(
                502, "The Foundry agent rejected the request. Check the configured agent version and API identity permissions.",
                slug="upstream-failure",
            ) from error
        except httpx.RequestError as error:
            logger.warning("Foundry agent unavailable (%s)", type(error).__name__)
            raise ProblemError(502, "The Foundry agent could not be reached.", slug="upstream-failure") from error

        try:
            result = response.json()
            if not isinstance(result, dict):
                raise ValueError("Invalid response envelope")
            return result
        except ValueError as error:
            logger.error("Invalid Foundry response envelope")
            raise ProblemError(502, "The Foundry response was invalid.", slug="upstream-failure") from error

    def _invalid_response(self) -> NoReturn:
        logger.error("Foundry response incomplete or missing required tool evidence")
        raise ProblemError(502, INVALID_RESPONSE, slug="upstream-failure")

    def _output_text(self, output: list[dict[str, Any]]) -> str:
        messages = [item for item in output if item.get("type") == "message"]
        for message in messages:
            content = message.get("content")
            if not isinstance(content, list) or any(not isinstance(item, dict) for item in content):
                self._invalid_response()
        text = "".join(
            part["text"]
            for message in messages
            for part in message.get("content", [])
            if part.get("type") == "output_text" and isinstance(part.get("text"), str)
        )
        if not text:
            self._invalid_response()
        return text

    @staticmethod
    def _web_evidence(output: list[dict[str, Any]]) -> tuple[int, set[str]]:
        """Bing calls made, plus every URL the search returned or the reply cited."""
        calls = sum(1 for item in output if item.get("type") == "bing_grounding_call")
        urls: set[str] = set()
        for item in output:
            if item.get("type") == "bing_grounding_call_output":
                urls.update(url.rstrip(".,;") for url in URL_PATTERN.findall(json.dumps(item)))
            elif item.get("type") == "message":
                for part in item.get("content") or []:
                    if not isinstance(part, dict) or part.get("type") != "output_text":
                        continue
                    for annotation in part.get("annotations") or []:
                        if (
                            isinstance(annotation, dict) and annotation.get("type") == "url_citation"
                            and isinstance(annotation.get("url"), str)
                        ):
                            urls.add(annotation["url"])
        return calls, urls
