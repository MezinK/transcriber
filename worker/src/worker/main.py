import asyncio
import functools
import logging
import signal
import uuid

from worker.consumer import (
    complete_job,
    fail_job,
    register_worker,
    run_reaper,
    send_heartbeat,
    try_claim_job,
)
from worker.engines import get_engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

POLL_INTERVAL = 2.0
HEARTBEAT_INTERVAL = 30.0


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

    # Handle SIGTERM (Docker sends this on `docker compose down`)
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, shutdown_event.set)

    try:
        while not shutdown_event.is_set():
            await run_reaper()

            transcription = await try_claim_job(worker_id)

            if transcription is None:
                # Wait for either poll interval or shutdown signal
                try:
                    await asyncio.wait_for(
                        shutdown_event.wait(), timeout=POLL_INTERVAL
                    )
                except TimeoutError:
                    pass
                continue

            logger.info("Processing job %s: %s", transcription.id, transcription.file_name)

            try:
                # Run synchronous transcription in a thread pool so the
                # event loop (and heartbeat task) stays responsive.
                result = await loop.run_in_executor(
                    None,
                    functools.partial(engine.transcribe, transcription.file_path),
                )
                await complete_job(
                    worker_id=worker_id,
                    transcription_id=transcription.id,
                    result_text=result.text,
                    result_json={"segments": result.segments},
                )
            except Exception as e:
                logger.exception("Transcription failed for job %s", transcription.id)
                try:
                    await fail_job(
                        worker_id=worker_id,
                        transcription_id=transcription.id,
                        error=str(e),
                    )
                except Exception:
                    logger.exception(
                        "Failed to mark job %s as failed in DB", transcription.id
                    )
    finally:
        logger.info("Shutting down worker %s", worker_id)
        stop_heartbeat.set()
        await heartbeat_task


if __name__ == "__main__":
    asyncio.run(main())
