from __future__ import annotations

import uuid


def generate_uuid() -> uuid.UUID:
    if hasattr(uuid, "uuid7"):
        return uuid.uuid7()
    return uuid.uuid4()
