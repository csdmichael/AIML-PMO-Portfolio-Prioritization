"""Portfolio chat. The browser cannot supply or replace the grounding snapshot."""

from typing import Any, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from app.agent import AgentTable
from app.container import Services
from app.routes.deps import get_services

router = APIRouter(tags=["agent"])


class ChatTurn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=12000)


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    question: str = Field(min_length=1, max_length=4000)
    history: list[ChatTurn] = Field(default_factory=list, max_length=12)


class AgentProvenance(BaseModel):
    provider: Literal["azure-ai-foundry"]
    agentName: str
    agentVersion: str
    responseId: str
    groundingSource: Literal["fabric-onelake-via-apim"]
    queryIds: list[str]


class ChatResponse(BaseModel):
    text: str
    tableData: AgentTable
    sourceProjectIds: list[str]
    sourceRecordCount: int
    provenance: AgentProvenance


@router.post("/agent/chat", response_model=ChatResponse, operation_id="chatWithPortfolioAgent", summary="Ask the Foundry agent using live OneLake evidence")
def chat(body: ChatRequest, services: Services = Depends(get_services)) -> dict[str, Any]:
    return services.agent.answer(body.question, [turn.model_dump() for turn in body.history])
