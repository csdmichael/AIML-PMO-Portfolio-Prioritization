"""Invoke the versioned Foundry agent with server-read OneLake evidence."""

import json
import logging
from pathlib import Path
from typing import Annotated, Any

import httpx
from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

from app.auth import CredentialProvider
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
    def __init__(self, settings: AgentSettings, credentials: CredentialProvider) -> None:
        self.settings = settings
        self.credentials = credentials

    def answer(self, question: str, history: list[dict[str, str]], snapshot: dict[str, Any]) -> dict[str, Any]:
        settings = self.settings
        payload = {
            "agent": {"type": "agent_reference", "name": settings.agentName, "version": settings.agentVersion},
            "input": [
                *history,
                {"role": "user", "content": json.dumps({"question": question, "portfolioSnapshot": snapshot})},
            ],
            "store": False,
            "max_output_tokens": settings.maxOutputTokens,
        }
        try:
            response = httpx.post(
                f"{settings.projectEndpoint.rstrip('/')}/openai/responses",
                params={"api-version": settings.apiVersion},
                headers={"Authorization": f"Bearer {self.credentials.bearer_token(settings.tokenScope)}"},
                json=payload,
                timeout=settings.timeoutSeconds,
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
            if not isinstance(result, dict) or result.get("status") != "completed":
                raise ValueError("Foundry response did not complete")
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
            project_ids = {project["projectId"] for project in snapshot["projects"]}
            if not set(answer.sourceProjectIds).issubset(project_ids):
                raise ValueError("Foundry cited projects not present in OneLake")
            response_id = result["id"]
            if not isinstance(response_id, str) or not response_id:
                raise ValueError("Foundry response ID is missing")
        except (ValueError, KeyError, TypeError, ValidationError) as error:
            logger.error("Invalid Foundry agent response (%s)", type(error).__name__)
            raise ProblemError(
                502, "The Foundry agent returned an invalid or ungrounded response. Please retry.", slug="upstream-failure",
            ) from error

        logger.info("Foundry agent %s:%s response %s", settings.agentName, settings.agentVersion, response_id)
        return {
            **answer.model_dump(),
            "sourceRecordCount": len(set(answer.sourceProjectIds)),
            "provenance": {
                "provider": "azure-ai-foundry",
                "agentName": settings.agentName,
                "agentVersion": settings.agentVersion,
                "responseId": response_id,
            },
        }
