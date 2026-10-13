"""File-name and time helpers shared by uploads and quick-add documents."""

import re
from datetime import datetime, timezone
from pathlib import PurePosixPath

from app.config import UploadSettings


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def iso_utc(moment: datetime | None) -> str | None:
    if moment is None:
        return None
    return moment.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def file_suffix(name: str) -> str:
    return PurePosixPath(name.replace("\\", "/")).suffix.lower()


def safe_file_name(name: str, settings: UploadSettings) -> str:
    base = PurePosixPath(name.replace("\\", "/")).name
    cleaned = re.sub(settings.unsafeFileNameCharacters, "_", base).strip("._")
    if not cleaned:
        return settings.fallbackFileName
    limit = settings.maxOriginalNameLength
    if len(cleaned) > limit:
        suffix = file_suffix(cleaned)
        cleaned = cleaned[: limit - len(suffix)] + suffix
    return cleaned
