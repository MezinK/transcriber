from __future__ import annotations

import asyncio
import functools
import signal
from concurrent.futures import ThreadPoolExecutor
from contextlib import suppress
from datetime import datetime
import uuid

from infra.config import get_settings
from infra.db import get_session_factory
from infra.time import utc_now
from services.jobs import (
    claim_next_transcription,
    complete_transcription,
    fail_transcription,
    recover_stale_leases,
    renew_lease,
)
from services.workers import heartbeat_worker, register_worker
from worker.engine import TranscriptionEngine, load_engine


class WorkerRuntime:
    def __init__(
        self,
        *,
        session_factory,
        engine: TranscriptionEngine,
        worker_id: uuid.UUID | None = None,
        label: str | None = None,
        lease_duration_seconds: int,
        heartbeat_interval_seconds: float,
        poll_interval_seconds: float,
        max_attempts: int = 3,
        now_factory=lambda: utc_now(),
    ) -> None:
        self.session_factory = session_factory
        self.engine = engine
        self.worker_id = worker_id or uuid.uuid7()
        self.label = label or f"worker-{str(self.worker_id)[:8]}"
        self.lease_duration_seconds = lease_duration_seconds
        self.heartbeat_interval_seconds = heartbeat_interval_seconds
        self.poll_interval_seconds = poll_interval_seconds
        self.max_attempts = max_attempts
        self.now_factory = now_factory
        self.current_claim = None
        self._executor = ThreadPoolExecutor(max_workers=1)
        self._started = False
        self._shutdown_requested = asyncio.Event()

    async def start(self) -> None:
        if self._started:
            return
        await register_worker(
            session_factory=self.session_factory,
            worker_id=self.worker_id,
            label=self.label,
            now=self.now_factory,
        )
        self._started = True

    def request_shutdown(self) -> None:
        self._shutdown_requested.set()

    async def close(self) -> None:
        self.request_shutdown()
        self._executor.shutdown(wait=False, cancel_futures=False)

    async def run(self) -> None:
        await self.start()

        while not self._shutdown_requested.is_set():
            processed = await self.run_once()
            if processed:
                continue

            await heartbeat_worker(
                session_factory=self.session_factory,
                worker_id=self.worker_id,
                now=self.now_factory,
            )
            await recover_stale_leases(
                session_factory=self.session_factory,
                max_attempts=self.max_attempts,
                now_factory=self.now_factory,
            )

            with suppress(TimeoutError):
                await asyncio.wait_for(
                    self._shutdown_requested.wait(),
                    timeout=self.poll_interval_seconds,
                )

    async def run_once(self) -> bool:
        await self.start()
        claim = await claim_next_transcription(
            session_factory=self.session_factory,
            worker_id=self.worker_id,
            lease_duration_seconds=self.lease_duration_seconds,
            now_factory=self.now_factory,
        )
        if claim is None:
            return False

        self.current_claim = claim
        stop_heartbeat = asyncio.Event()
        heartbeat_task = asyncio.create_task(
            self._lease_heartbeat_loop(
                transcription_id=claim.transcription_id,
                stop_event=stop_heartbeat,
            )
        )
        try:
            result = await asyncio.get_running_loop().run_in_executor(
                self._executor,
                functools.partial(self.engine.transcribe, claim.upload_path),
            )
            await complete_transcription(
                session_factory=self.session_factory,
                transcription_id=claim.transcription_id,
                worker_id=self.worker_id,
                transcript_text=result.text,
                segments_json={"segments": result.segments},
                now_factory=self.now_factory,
            )
            self.current_claim = None
            return True
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            await fail_transcription(
                session_factory=self.session_factory,
                transcription_id=claim.transcription_id,
                worker_id=self.worker_id,
                error=f"Transcription failed: {type(exc).__name__}",
                max_attempts=self.max_attempts,
                retryable=True,
                now_factory=self.now_factory,
            )
            self.current_claim = None
            return True
        finally:
            stop_heartbeat.set()
            with suppress(asyncio.CancelledError):
                await heartbeat_task

    async def _lease_heartbeat_loop(
        self,
        *,
        transcription_id: uuid.UUID,
        stop_event: asyncio.Event,
    ) -> None:
        while not stop_event.is_set() and not self._shutdown_requested.is_set():
            with suppress(TimeoutError):
                await asyncio.wait_for(
                    stop_event.wait(),
                    timeout=self.heartbeat_interval_seconds,
                )
            if stop_event.is_set() or self._shutdown_requested.is_set():
                return

            await renew_lease(
                session_factory=self.session_factory,
                transcription_id=transcription_id,
                worker_id=self.worker_id,
                lease_duration_seconds=self.lease_duration_seconds,
                now_factory=self.now_factory,
            )


async def main() -> None:
    settings = get_settings()
    runtime = WorkerRuntime(
        session_factory=get_session_factory(),
        engine=load_engine(),
        lease_duration_seconds=settings.lease_duration_seconds,
        heartbeat_interval_seconds=settings.heartbeat_interval_seconds,
        poll_interval_seconds=settings.worker_poll_interval_seconds,
    )

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, runtime.request_shutdown)

    try:
        await runtime.run()
    finally:
        await runtime.close()


if __name__ == "__main__":
    asyncio.run(main())
