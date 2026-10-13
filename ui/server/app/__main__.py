"""Local runner: `uv run python -m app`. Binds the host and port from config.json; PORT overrides the port."""

import os

import uvicorn

from app.config import load_config, resolve_port


def main() -> None:
    config = load_config()
    uvicorn.run("app.main:app", host=config.server.host, port=resolve_port(config.server, os.environ))


if __name__ == "__main__":
    main()
