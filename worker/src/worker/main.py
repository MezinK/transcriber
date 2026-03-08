import asyncio
import functools
import logging
import signal
import uuid
from concurrent.futures import ThreadPoolExecutor

from worker.consumer import (
    complete_job,
    deregister_worker,
    fail_job,
    register_worker,
    run_reaper,
    send_heartbeat,
    try_claim_job,
)
from worker.engines import get_engine

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

POLL_INTERVAL = 2.0
HEARTBEAT_INTERVAL = 30.0
REAPER_INTERVAL = 30.0


async def heartbeat_loop(worker_id: uuid.UUID, stop_event: asyncio.Event):
    while not stop_event.is_set():
        try:
            await send_heartbeat(worker_id)
        except Exception:
            logger.exception("Heartbeat failed")
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=HEARTBEAT_INTERVAL)
        except TimeoutError:
            pass


async def reaper_loop(stop_event: asyncio.Event):
    """Run reaper periodically instead of every poll cycle."""
    while not stop_event.is_set():
        try:
            await run_reaper()
        except Exception:
            logger.exception("Reaper failed")
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=REAPER_INTERVAL)
        except TimeoutError:
            pass


async def main():
    worker_id = uuid.uuid4()
    logger.info("Starting worker %s", worker_id)

    try:
        engine = get_engine()
    except Exception:
        logger.exception("Failed to load transcription engine — exiting")
        raise SystemExit(1)

    logger.info("Loaded transcription engine: %s", type(engine).__name__)

    await register_worker(worker_id)

    stop_heartbeat = asyncio.Event()
    shutdown_event = asyncio.Event()
    heartbeat_task = asyncio.create_task(heartbeat_loop(worker_id, stop_heartbeat))
    reaper_task = asyncio.create_task(reaper_loop(shutdown_event))

    # Explicit single-thread executor — prevents unbounded concurrency and
    # ensures faster-whisper (not thread-safe) is never called concurrently.
    executor = ThreadPoolExecutor(max_workers=1)

    # Handle SIGTERM (Docker sends this on `docker compose down`)
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, shutdown_event.set)

    current_job_id: uuid.UUID | None = None
    try:
        while not shutdown_event.is_set():
            job = await try_claim_job(worker_id)

            if job is None:
                # Wait for either poll interval or shutdown signal
                try:
                    await asyncio.wait_for(
                        shutdown_event.wait(), timeout=POLL_INTERVAL
                    )
                except TimeoutError:
                    pass
                continue

            current_job_id = job.id
            logger.info("Processing job %s: %s", job.id, job.file_name)

            try:
                # Run synchronous transcription in a bounded thread pool so the
                # event loop (and heartbeat task) stays responsive.
                result = await loop.run_in_executor(
                    executor,
                    functools.partial(engine.transcribe, job.file_path),
                )
                await complete_job(
                    worker_id=worker_id,
                    transcription_id=job.id,
                    result_text=result.text,
                    result_json={"segments": result.segments},
                )
            except Exception as e:
                logger.exception("Transcription failed for job %s", job.id)
                # Sanitize error — don't leak internal paths or stack traces
                safe_error = f"Transcription failed: {type(e).__name__}"
                try:
                    await fail_job(
                        worker_id=worker_id,
                        transcription_id=job.id,
                        error=safe_error,
                    )
                except Exception:
                    logger.exception(
                        "Failed to mark job %s as failed in DB", job.id
                    )
            finally:
                current_job_id = None
    finally:
        logger.info("Shutting down worker %s", worker_id)
        stop_heartbeat.set()
        shutdown_event.set()
        await heartbeat_task
        await reaper_task
        executor.shutdown(wait=False)

        # Deregister and reset any in-progress job
        try:
            await deregister_worker(worker_id, current_job_id)
        except Exception:
            logger.exception("Failed to deregister worker %s", worker_id)


if __name__ == "__main__":
    asyncio.run(main())
