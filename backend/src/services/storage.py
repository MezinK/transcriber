import re
from pathlib import Path
from typing import Protocol

import aiofiles

from infra.models import MediaType

AUDIO_EXTENSIONS = {".mp3", ".wav", ".flac", ".ogg", ".m4a", ".wma", ".aac"}
VIDEO_EXTENSIONS = {".mp4", ".mkv", ".avi", ".mov", ".webm", ".wmv", ".flv"}
ALLOWED_EXTENSIONS = AUDIO_EXTENSIONS | VIDEO_EXTENSIONS
CHUNK_SIZE = 1024 * 1024


class AsyncChunkReader(Protocol):
    async def read(self, size: int) -> bytes: ...


def sanitize_filename(filename: str) -> str:
    name = Path(filename).name
    stem = re.sub(r"[^\w\-]", "_", Path(name).stem)[:200]
    ext = Path(name).suffix.lower()
    return f"{stem}{ext}" if stem else f"unnamed{ext}"


def detect_media_type(filename: str) -> MediaType:
    ext = Path(filename).suffix.lower()
    if ext in AUDIO_EXTENSIONS:
        return MediaType.AUDIO
    if ext in VIDEO_EXTENSIONS:
        return MediaType.VIDEO
    raise ValueError(f"Unsupported file type: {ext}")


async def save_upload_stream(
    file: AsyncChunkReader,
    destination: Path,
    *,
    max_upload_bytes: int,
    chunk_size: int = CHUNK_SIZE,
) -> int:
    total_size = 0
    destination.parent.mkdir(parents=True, exist_ok=True)

    async with aiofiles.open(destination, "wb") as handle:
        while chunk := await file.read(chunk_size):
            total_size += len(chunk)
            if total_size > max_upload_bytes:
                raise ValueError(
                    f"File too large. Maximum size: {max_upload_bytes // (1024 * 1024)} MB"
                )
            await handle.write(chunk)

    return total_size


def remove_file(path: Path) -> None:
    path.unlink(missing_ok=True)
