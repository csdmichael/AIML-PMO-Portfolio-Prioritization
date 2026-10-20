"""Request context shared by the Foundry agents: approved options, field formats, and prompt rendering.

Everything here comes from the shared JSON contracts, so the agents only choose from values the API accepts.
"""

from typing import Any

from app.container import Services
from app.contracts import static_option_values


def agent_options(services: Services) -> dict[str, Any]:
    contract = services.config.data_entry
    project_fields: list[dict[str, Any]] = []
    for rule in contract.projectFields:
        entry: dict[str, Any] = {"key": rule.key, "label": rule.label, "type": rule.type, "required": rule.required}
        allowed = static_option_values(contract, rule)
        if allowed is not None:
            entry["allowed"] = allowed
        project_fields.append(entry)
    portfolios = [
        {
            "key": portfolio["key"],
            "displayName": portfolio["displayName"],
            "programs": [
                {"key": program["key"], "displayName": program["displayName"]}
                for program in portfolio.get("programs") or []
            ],
        }
        for portfolio in services.catalog.portfolios()
    ]
    return {
        "portfolios": portfolios,
        "projectFields": project_fields,
        "decisionTiers": services.config.api.decisions.tiers,
    }


def render_lines(lines: list[str], **values: str) -> str:
    return "\n".join(lines).format(**values)
