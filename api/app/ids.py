"""Identifiers: GIS project IDs (numbered above the export) and prefixed random IDs for drafts and decisions."""

import re
import uuid
from collections.abc import Iterable


class IdentifierExhausted(RuntimeError):
    """Every project number that fits the configured digit width is in use."""


def format_project_id(number: int, prefix: str, digits: int) -> str:
    return f"{prefix}{number:0{digits}d}"


def parse_project_number(project_id: str, prefix: str, digits: int) -> int | None:
    match = re.fullmatch(rf"{re.escape(prefix)}([0-9]{{{digits}}})", project_id)
    return int(match.group(1)) if match else None


def next_project_number(existing_ids: Iterable[str], *, prefix: str, digits: int, first_number: int) -> int:
    highest = first_number - 1
    for project_id in existing_ids:
        number = parse_project_number(project_id, prefix, digits)
        if number is not None and number > highest:
            highest = number
    candidate = highest + 1
    limit = 10**digits - 1
    if candidate > limit:
        raise IdentifierExhausted(f"no project number is left at or below {limit}")
    return candidate


def next_project_id(existing_ids: Iterable[str], *, prefix: str, digits: int, first_number: int) -> str:
    number = next_project_number(existing_ids, prefix=prefix, digits=digits, first_number=first_number)
    return format_project_id(number, prefix, digits)


def new_identifier(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex}"


def identifier_pattern(prefix: str) -> re.Pattern[str]:
    return re.compile(rf"{re.escape(prefix)}[0-9a-f]{{32}}")
