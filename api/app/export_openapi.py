"""Writes the OpenAPI document generated from the app to the file named in pmo-deployment.json.

Run from the api folder: uv run python -m app.export_openapi. The default output is docs/api/openapi.json
at the repository root, which APIM imports.
"""

import argparse
import json
import sys
from pathlib import Path

from app.config import REPO_ROOT, get_config
from app.main import create_app


def export_openapi(output: Path | None = None) -> Path:
    target = output or (REPO_ROOT / get_config().values.openapi_output_file)
    document = create_app().openapi()
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(document, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return target


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Write the OpenAPI document generated from the app.")
    parser.add_argument("--output", type=Path, default=None, help="override the output file")
    args = parser.parse_args(argv)
    print(f"wrote {export_openapi(args.output)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
