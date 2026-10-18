"""Execute allowlisted Foundry function calls through the private APIM gateway."""

import json
import logging
import time
from pathlib import Path
from typing import Annotated, Any

import httpx
from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

from app.auth import CredentialProvider
from app.agent_tools import ApimPortfolioTool, PortfolioQuery, TOOL_NAME
from app.problems import ProblemError

logger = logging.getLogger("pmo.api.agent")
NonemptyText = Annotated[str, Field(min_length=1)]


class AgentSettings(BaseModel):
    projectEndpoint: str
    apiVersion: str
    agentName: str
    agentVersion: str
    model: str
    tokenScope: str
    timeoutSeconds: float
    maxOutputTokens: int
    instructions: str


def load_agent_settings() -> AgentSettings:
    path = Path(__file__).resolve().parents[1] / "config" / "portfolio-agent.json"
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


class FoundryAgentClient:
    def __init__(self, settings: AgentSettings, credentials: CredentialProvider, tools: ApimPortfolioTool) -> None:
        self.settings = settings
        self.credentials = credentials
        self.tools = tools

    def answer(self, question: str, history: list[dict[str, str]]) -> dict[str, Any]:
        deadline = time.monotonic() + self.settings.timeoutSeconds
        inputs: list[dict[str, Any]] = [*history, {"role": "user", "content": question}]
        evidence_ids: set[str] = set()
        query_ids: list[str] = []
        for round_number in range(4):
            result = self._invoke(inputs, deadline, require_tool=round_number == 0)
            output = result.get("output")
            if (
                result.get("status") != "completed" or not isinstance(output, list)
                or any(not isinstance(item, dict) for item in output)
            ):
                self._invalid_response()
            calls = [item for item in output if item.get("type") == "function_call"]
            if not calls:
                if not query_ids:
                    self._invalid_response()
                return self._answer(result, evidence_ids, query_ids)
            if round_number == 3 or len(query_ids) + len(calls) > 4:
                raise ProblemError(502, "The agent exceeded its read-only tool budget.", slug="upstream-failure")
            inputs.extend(output)
            for call in calls:
                try:
                    if call.get("name") != TOOL_NAME or not isinstance(call.get("call_id"), str):
                        raise ValueError("Tool is not allowlisted")
                    query = PortfolioQuery.model_validate_json(call["arguments"])
                except (ValueError, KeyError, TypeError, ValidationError) as error:
                    logger.warning("Rejected invalid Foundry tool call (%s)", type(error).__name__)
                    raise ProblemError(502, "The agent requested an invalid Fabric query.", slug="upstream-failure") from error
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise ProblemError(504, "The agent query timed out.", slug="upstream-timeout")
                evidence = self.tools.execute(query, timeout=min(30, remaining))
                evidence_ids.update(evidence["sourceProjectIds"])
                query_ids.append(evidence["queryId"])
                inputs.append({
                    "type": "function_call_output", "call_id": call["call_id"],
                    "output": json.dumps(evidence),
                })
        raise AssertionError("Agent tool loop must terminate")

    def _invoke(self, inputs: list[dict[str, Any]], deadline: float, *, require_tool: bool) -> dict[str, Any]:
        settings = self.settings
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise ProblemError(504, "The agent query timed out.", slug="upstream-timeout")
        payload = {
            "agent": {"type": "agent_reference", "name": settings.agentName, "version": settings.agentVersion},
            "input": inputs,
            "store": False,
            "max_output_tokens": settings.maxOutputTokens,
            "tool_choice": {"type": "function", "name": TOOL_NAME} if require_tool else "auto",
        }
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

    def _invalid_response(self) -> None:
        logger.error("Foundry response incomplete or missing required tool evidence")
        raise ProblemError(502, "The Foundry agent returned an invalid or ungrounded response. Please retry.", slug="upstream-failure")

    def _answer(self, result: dict[str, Any], project_ids: set[str], query_ids: list[str]) -> dict[str, Any]:
        try:
            output = result.get("output")
            if not isinstance(output, list) or any(not isinstance(item, dict) for item in output):
                raise ValueError("Foundry response output is invalid")
            messages = [item for item in output if item.get("type") == "message"]
            for message in messages:
                content = message.get("content")
                if not isinstance(content, list) or any(not isinstance(item, dict) for item in content):
                    raise ValueError("Foundry message content is invalid")
            text = "".join(
                content["text"]
                for item in messages
                for content in item.get("content", []) if content.get("type") == "output_text"
            )
            answer = AgentAnswer.model_validate_json(text)
            if not set(answer.sourceProjectIds).issubset(project_ids):
                raise ValueError("Foundry cited projects not returned by the tool")
            response_id = result["id"]
            if not isinstance(response_id, str) or not response_id:
                raise ValueError("Foundry response ID is missing")
        except (ValueError, KeyError, TypeError, ValidationError) as error:
            logger.error("Invalid Foundry agent response (%s)", type(error).__name__)
            raise ProblemError(
                502, "The Foundry agent returned an invalid or ungrounded response. Please retry.", slug="upstream-failure",
            ) from error

        settings = self.settings
        logger.info("Foundry agent %s:%s response %s queries %s", settings.agentName, settings.agentVersion, response_id, query_ids)
        return {
            **answer.model_dump(),
            "sourceRecordCount": len(set(answer.sourceProjectIds)),
            "provenance": {
                "provider": "azure-ai-foundry",
                "agentName": settings.agentName,
                "agentVersion": settings.agentVersion,
                "responseId": response_id,
                "groundingSource": "fabric-onelake-via-apim",
                "queryIds": query_ids,
            },
        }
