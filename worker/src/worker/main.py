import asyncio
import logging
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

    engine = get_engine()
    logger.info("Loaded transcription engine: %s", type(engine).__name__)

    await register_worker(worker_id)

    stop_heartbeat = asyncio.Event()
    heartbeat_task = asyncio.create_task(heartbeat_loop(worker_id, stop_heartbeat))

    try:
        while True:
            await run_reaper()

            transcription = await try_claim_job(worker_id)

            if transcription is None:
                await asyncio.sleep(POLL_INTERVAL)
                continue

            logger.info("Processing job %s: %s", transcription.id, transcription.file_name)

            try:
                result = engine.transcribe(transcription.file_path)
                await complete_job(
                    worker_id=worker_id,
                    transcription_id=transcription.id,
                    result_text=result.text,
                    result_json={"segments": result.segments},
                )
            except Exception as e:
                logger.exception("Transcription failed for job %s", transcription.id)
                await fail_job(
                    worker_id=worker_id,
                    transcription_id=transcription.id,
                    error=str(e),
                )
    except KeyboardInterrupt:
        logger.info("Shutting down worker %s", worker_id)
    finally:
        stop_heartbeat.set()
        await heartbeat_task


if __name__ == "__main__":
    asyncio.run(main())
