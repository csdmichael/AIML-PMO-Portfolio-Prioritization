"""Field rules from data-entry.json, applied to projects, portfolios, drafts, and AI output alike.

A check returns the normalized value or raises FieldError with (sub-path, message) pairs, so a list item
can report its own problem, for example dependencies[1].projectId.
"""

import math
import re
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any, Protocol

from app.config import LengthRule, ValidationSettings
from app.contracts import FieldRule
from app.problems import FieldIssue

_ISO_DATE = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}")
_DEPENDENCY_KEYS = frozenset({"projectId", "relationshipType"})
_PROGRAM_KEYS = frozenset({"key", "displayName", "code"})


class OptionSource(Protocol):
    def options(self, source: str, record: Mapping[str, Any]) -> list[str]: ...

    def known_project_ids(self) -> frozenset[str]: ...


class FieldError(Exception):
    def __init__(self, issues: list[tuple[str, str]]) -> None:
        super().__init__("; ".join(message for _, message in issues))
        self.issues = issues


@dataclass
class RecordResult:
    values: dict[str, Any] = field(default_factory=dict)
    issues: list[FieldIssue] = field(default_factory=list)

    @property
    def valid(self) -> bool:
        return not self.issues


def _fail(message: str, sub_path: str = "") -> FieldError:
    return FieldError([(sub_path, message)])


def _is_blank(value: Any) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def _text_or_empty(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def _length_within(text: str, rule: LengthRule) -> bool:
    return rule.minLength <= len(text) <= rule.maxLength


def _as_integer(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return None


def _as_date(value: Any) -> date | None:
    if isinstance(value, datetime):
        return None
    if isinstance(value, date):
        return value
    if isinstance(value, str) and _ISO_DATE.fullmatch(value.strip()):
        try:
            return date.fromisoformat(value.strip())
        except ValueError:
            return None
    return None


def _bound(value: float) -> str:
    return str(int(value)) if float(value).is_integer() else str(value)


def _one_of(options: Sequence[str]) -> str:
    return "must be one of: " + ", ".join(options)


class FieldValidator:
    def __init__(
        self,
        *,
        settings: ValidationSettings,
        project_id_pattern: str,
        relationship_types: Sequence[str],
        options: OptionSource,
    ) -> None:
        self._settings = settings
        self._project_id = re.compile(project_id_pattern)
        self._relationship_types = tuple(relationship_types)
        self._options = options
        self._email = re.compile(settings.emailPattern)
        self._slug = re.compile(settings.slugPattern)
        self._code = re.compile(settings.codePattern)
        self._handlers: dict[str, Callable[[FieldRule, Any, Mapping[str, Any]], Any]] = {
            "text": self._text,
            "email": self._email_value,
            "slug": self._slug_value,
            "code": self._code_value,
            "select": self._select,
            "integer": self._integer,
            "number": self._number,
            "boolean": self._boolean,
            "date": self._date,
            "dependencyList": self._dependencies,
            "programList": self._programs,
        }

    def check(self, rule: FieldRule, value: Any, context: Mapping[str, Any] | None = None) -> Any:
        if _is_blank(value):
            if rule.required:
                raise _fail("is required")
            return None
        handler = self._handlers.get(rule.type)
        if handler is None:
            raise _fail(f"has an unsupported type '{rule.type}'")
        return handler(rule, value, dict(context or {}))

    def check_record(
        self,
        rules: Sequence[FieldRule],
        values: Mapping[str, Any],
        *,
        partial: bool = False,
        context: Mapping[str, Any] | None = None,
    ) -> RecordResult:
        known = {rule.key for rule in rules}
        result = RecordResult()
        result.issues.extend(FieldIssue(key, "is not a known field") for key in values if key not in known)
        record: dict[str, Any] = dict(context or {})
        for rule in rules:
            if partial and rule.key not in values:
                continue
            try:
                checked = self.check(rule, values.get(rule.key), record)
            except FieldError as error:
                result.issues.extend(FieldIssue(rule.key + sub, message) for sub, message in error.issues)
                record.pop(rule.key, None)
                continue
            result.values[rule.key] = checked
            if checked is None:
                record.pop(rule.key, None)
            else:
                record[rule.key] = checked
        return result

    @staticmethod
    def _require_text(value: Any) -> str:
        if not isinstance(value, str):
            raise _fail("must be text")
        return value.strip()

    @staticmethod
    def _check_length(rule: FieldRule, text: str) -> None:
        if rule.minLength is not None and len(text) < rule.minLength:
            raise _fail(f"must be at least {rule.minLength} characters")
        if rule.maxLength is not None and len(text) > rule.maxLength:
            raise _fail(f"must be at most {rule.maxLength} characters")

    @staticmethod
    def _check_range(rule: FieldRule, number: float) -> None:
        if rule.min is not None and number < rule.min:
            raise _fail(f"must be at least {_bound(rule.min)}")
        if rule.max is not None and number > rule.max:
            raise _fail(f"must be at most {_bound(rule.max)}")

    def _text(self, rule: FieldRule, value: Any, record: Mapping[str, Any]) -> str:
        text = self._require_text(value)
        self._check_length(rule, text)
        return text

    def _pattern_text(self, rule: FieldRule, value: Any, pattern: re.Pattern[str], message: str) -> str:
        text = self._require_text(value)
        self._check_length(rule, text)
        if not pattern.fullmatch(text):
            raise _fail(message)
        return text

    def _email_value(self, rule: FieldRule, value: Any, record: Mapping[str, Any]) -> str:
        return self._pattern_text(rule, value, self._email, "must be an email address")

    def _slug_value(self, rule: FieldRule, value: Any, record: Mapping[str, Any]) -> str:
        return self._pattern_text(rule, value, self._slug, "must use lowercase letters, digits, and single hyphens")

    def _code_value(self, rule: FieldRule, value: Any, record: Mapping[str, Any]) -> str:
        return self._pattern_text(rule, value, self._code, "must use uppercase letters, digits, and single hyphens")

    def _select(self, rule: FieldRule, value: Any, record: Mapping[str, Any]) -> str:
        text = self._require_text(value)
        allowed = list(rule.options) if rule.options is not None else self._source_options(rule, record)
        if text not in allowed:
            raise _fail(_one_of(allowed))
        return text

    def _source_options(self, rule: FieldRule, record: Mapping[str, Any]) -> list[str]:
        if not rule.source:
            raise _fail("has no option list configured")
        return self._options.options(rule.source, record)

    def _integer(self, rule: FieldRule, value: Any, record: Mapping[str, Any]) -> int:
        number = _as_integer(value)
        if number is None:
            raise _fail("must be a whole number")
        self._check_range(rule, number)
        return number

    def _number(self, rule: FieldRule, value: Any, record: Mapping[str, Any]) -> float:
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise _fail("must be a number")
        number = float(value)
        if not math.isfinite(number):
            raise _fail("must be a finite number")
        self._check_range(rule, number)
        return number

    def _boolean(self, rule: FieldRule, value: Any, record: Mapping[str, Any]) -> bool:
        if not isinstance(value, bool):
            raise _fail("must be true or false")
        return value

    def _date(self, rule: FieldRule, value: Any, record: Mapping[str, Any]) -> str:
        parsed = _as_date(value)
        if parsed is None:
            raise _fail("must be a date in YYYY-MM-DD format")
        if rule.minDate and parsed < date.fromisoformat(rule.minDate):
            raise _fail(f"must be on or after {rule.minDate}")
        if rule.maxDate and parsed > date.fromisoformat(rule.maxDate):
            raise _fail(f"must be on or before {rule.maxDate}")
        return parsed.isoformat()

    def _dependencies(self, rule: FieldRule, value: Any, record: Mapping[str, Any]) -> list[dict[str, str]]:
        if not isinstance(value, list):
            raise _fail("must be a list")
        if rule.maxItems is not None and len(value) > rule.maxItems:
            raise _fail(f"must have at most {rule.maxItems} items")
        known = self._options.known_project_ids()
        issues: list[tuple[str, str]] = []
        cleaned: list[dict[str, str]] = []
        seen: set[str] = set()
        for index, item in enumerate(value):
            prefix = f"[{index}]"
            if not isinstance(item, dict):
                issues.append((prefix, "must be an object with projectId and relationshipType"))
                continue
            unknown = sorted(set(item) - _DEPENDENCY_KEYS)
            if unknown:
                issues.append((prefix, f"has unknown keys: {', '.join(unknown)}"))
            project_id = _text_or_empty(item.get("projectId"))
            relationship = _text_or_empty(item.get("relationshipType"))
            item_ok = True
            if not self._project_id.fullmatch(project_id):
                issues.append((f"{prefix}.projectId", "must be a valid project ID"))
                item_ok = False
            elif project_id not in known:
                issues.append((f"{prefix}.projectId", "does not match a known project"))
                item_ok = False
            elif project_id in seen:
                issues.append((f"{prefix}.projectId", "is listed more than once"))
                item_ok = False
            if relationship not in self._relationship_types:
                issues.append((f"{prefix}.relationshipType", _one_of(self._relationship_types)))
                item_ok = False
            if item_ok:
                seen.add(project_id)
                cleaned.append({"projectId": project_id, "relationshipType": relationship})
        if issues:
            raise FieldError(issues)
        return cleaned

    def _programs(self, rule: FieldRule, value: Any, record: Mapping[str, Any]) -> list[dict[str, str]]:
        if not isinstance(value, list):
            raise _fail("must be a list")
        if rule.minItems is not None and len(value) < rule.minItems:
            raise _fail(f"must have at least {rule.minItems} items")
        if rule.maxItems is not None and len(value) > rule.maxItems:
            raise _fail(f"must have at most {rule.maxItems} items")
        name_rule = self._settings.programDisplayName
        code_rule = self._settings.programCode
        issues: list[tuple[str, str]] = []
        cleaned: list[dict[str, str]] = []
        keys: set[str] = set()
        for index, item in enumerate(value):
            prefix = f"[{index}]"
            if not isinstance(item, dict):
                issues.append((prefix, "must be an object with key, displayName, and code"))
                continue
            unknown = sorted(set(item) - _PROGRAM_KEYS)
            if unknown:
                issues.append((prefix, f"has unknown keys: {', '.join(unknown)}"))
            key = _text_or_empty(item.get("key"))
            name = _text_or_empty(item.get("displayName"))
            code = _text_or_empty(item.get("code"))
            item_ok = True
            if not self._slug.fullmatch(key):
                issues.append((f"{prefix}.key", "must use lowercase letters, digits, and single hyphens"))
                item_ok = False
            elif key in keys:
                issues.append((f"{prefix}.key", "is listed more than once"))
                item_ok = False
            if not _length_within(name, name_rule):
                issues.append((f"{prefix}.displayName", f"must be {name_rule.minLength} to {name_rule.maxLength} characters"))
                item_ok = False
            if not self._code.fullmatch(code) or not _length_within(code, code_rule):
                issues.append((f"{prefix}.code", f"must use uppercase letters, digits, and single hyphens, {code_rule.minLength} to {code_rule.maxLength} characters"))
                item_ok = False
            if item_ok:
                keys.add(key)
                cleaned.append({"key": key, "displayName": name, "code": code})
        if issues:
            raise FieldError(issues)
        return cleaned
