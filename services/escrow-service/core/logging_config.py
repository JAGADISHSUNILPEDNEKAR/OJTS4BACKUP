"""Structured JSON logging for production.

Sets the root logger to emit one JSON object per line on stderr with
fields {timestamp, level, name, message, service, ...extra}. Call
`configure(service="auth-service")` once at startup; downstream
`logging.getLogger(__name__)` calls inherit the JSON formatter.

Extra kwargs passed to logger calls land as top-level JSON fields:
    logger.info("user logged in", extra={"event": "auth.login", "user_id": uid})
produces:
    {"timestamp": "...", "level": "INFO", "service": "auth-service",
     "name": "auth-service.main", "message": "user logged in",
     "event": "auth.login", "user_id": "..."}
"""

import logging
import sys

from pythonjsonlogger import jsonlogger


class _ServiceFilter(logging.Filter):
    def __init__(self, service: str) -> None:
        super().__init__()
        self._service = service

    def filter(self, record: logging.LogRecord) -> bool:
        record.service = self._service
        return True


def configure(service: str, level: int = logging.INFO) -> None:
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(
        jsonlogger.JsonFormatter(
            "%(asctime)s %(name)s %(levelname)s %(message)s",
            rename_fields={"asctime": "timestamp", "levelname": "level"},
        )
    )
    handler.addFilter(_ServiceFilter(service))

    root = logging.getLogger()
    # force=True semantics — clear any prior handlers so a second call (e.g.
    # in tests) doesn't double-emit.
    for h in list(root.handlers):
        root.removeHandler(h)
    root.addHandler(handler)
    root.setLevel(level)
