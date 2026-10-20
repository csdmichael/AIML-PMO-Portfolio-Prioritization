"""JSON schemas generated from the field rules: OpenAPI request bodies and the strict model output."""

from collections.abc import Callable, Sequence
from typing import Any

from app.contracts import FieldRule

_TEXT_TYPES = frozenset({"text", "email", "slug", "code"})


def _dependency_item(relationship_types: Sequence[str]) -> dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "projectId": {"type": "string"},
            "relationshipType": {"type": "string", "enum": list(relationship_types)},
        },
        "required": ["projectId", "relationshipType"],
        "additionalProperties": False,
    }


def _program_item() -> dict[str, Any]:
    text = {"type": "string"}
    return {
        "type": "object",
        "properties": {"key": text, "displayName": text, "code": text},
        "required": ["key", "displayName", "code"],
        "additionalProperties": False,
    }


def value_schema(
    rule: FieldRule,
    *,
    allowed: Sequence[str] | None,
    relationship_types: Sequence[str],
    nullable: bool,
    constraints: bool,
) -> dict[str, Any]:
    kind = rule.type
    schema: dict[str, Any]
    if kind in _TEXT_TYPES:
        schema = {"type": "string"}
        if constraints and rule.minLength is not None:
            schema["minLength"] = rule.minLength
        if constraints and rule.maxLength is not None:
            schema["maxLength"] = rule.maxLength
    elif kind == "date":
        schema = {"type": "string", "format": "date"} if constraints else {"type": "string"}
    elif kind == "select":
        schema = {"type": "string", "enum": list(allowed)} if allowed else {"type": "string"}
    elif kind == "integer":
        schema = {"type": "integer"}
    elif kind == "number":
        schema = {"type": "number"}
    elif kind == "boolean":
        schema = {"type": "boolean"}
    elif kind == "dependencyList":
        schema = {"type": "array", "items": _dependency_item(relationship_types)}
    elif kind == "programList":
        schema = {"type": "array", "items": _program_item()}
    else:
        raise ValueError(f"unsupported field type '{kind}'")
    if constraints:
        if kind in {"integer", "number"}:
            if rule.min is not None:
                schema["minimum"] = rule.min
            if rule.max is not None:
                schema["maximum"] = rule.max
        if kind in {"dependencyList", "programList"}:
            if rule.minItems is not None:
                schema["minItems"] = rule.minItems
            if rule.maxItems is not None:
                schema["maxItems"] = rule.maxItems
    if nullable:
        return {"anyOf": [schema, {"type": "null"}]}
    return schema


def body_schema(
    rules: Sequence[FieldRule],
    *,
    allowed_for: Callable[[FieldRule], Sequence[str] | None],
    relationship_types: Sequence[str],
    partial: bool = False,
) -> dict[str, Any]:
    properties: dict[str, Any] = {}
    for rule in rules:
        prop = value_schema(
            rule,
            allowed=allowed_for(rule),
            relationship_types=relationship_types,
            nullable=partial or not rule.required,
            constraints=True,
        )
        prop["description"] = rule.label
        properties[rule.key] = prop
    schema: dict[str, Any] = {"type": "object", "properties": properties, "additionalProperties": False}
    required = [rule.key for rule in rules if rule.required]
    if required and not partial:
        schema["required"] = required
    return schema
