"""
scheduler.py — Background pipeline runner.

Runs inside the Streamlit process via a daemon thread.
Schedule:
  - RSS collection:   every 60 minutes
  - Topic processing: every 5 minutes (drains the queue)
  - Status updates:   written to a shared dict for the dashboard to read
"""

import threading
import time
import logging
from datetime import datetime
from typing import Callable, Optional

logger = logging.getLogger("scheduler")


class PipelineStatus:
    """Thread-safe shared state between scheduler and Streamlit dashboard."""

    def __init__(self):
        self._lock   = threading.Lock()
        self._data   = {
            "running":            False,
            "last_collection":    None,
            "last_processing":    None,
            "collection_count":   0,
            "processing_count":   0,
            "total_collected":    0,
            "total_processed":    0,
            "queue_depth":        0,
            "last_error":         None,
            "backend_name":       "—",
            "backend_available":  False,
            "log":                [],       # last N log lines
        }

    def update(self, **kwargs):
        with self._lock:
            self._data.update(kwargs)

    def get(self) -> dict:
        with self._lock:
            return dict(self._data)

    def add_log(self, msg: str):
        with self._lock:
            ts = datetime.now().strftime("%H:%M:%S")
            entry = f"[{ts}] {msg}"
            self._data["log"] = ([entry] + self._data["log"])[:60]
        logger.info(msg)


# Global singleton status object
pipeline_status = PipelineStatus()


class Scheduler:

    COLLECTION_INTERVAL  = 60 * 60   # 1 hour
    PROCESSING_INTERVAL  = 5  * 60   # 5 minutes
    INITIAL_COLLECT_WAIT = 5          # seconds before first collection on start

    def __init__(self, db_path: str = "narrative_analytics.duckdb"):
        self.db_path    = db_path
        self._thread    = None
        self._stop_flag = threading.Event()

    def start(self):
        if self._thread and self._thread.is_alive():
            return  # Already running

        self._stop_flag.clear()
        self._thread = threading.Thread(
            target=self._run,
            name="pipeline-scheduler",
            daemon=True,
        )
        self._thread.start()
        pipeline_status.update(running=True)
        pipeline_status.add_log("Pipeline scheduler started")

    def stop(self):
        self._stop_flag.set()
        pipeline_status.update(running=False)
        pipeline_status.add_log("Pipeline scheduler stopped")

    def is_running(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    def trigger_collection_now(self):
        """Manually trigger an immediate collection cycle."""
        threading.Thread(
            target=self._collection_cycle,
            daemon=True,
            name="manual-collection"
        ).start()

    def trigger_processing_now(self, batch_size: int = 30):
        """Manually trigger an immediate processing cycle."""
        threading.Thread(
            target=self._processing_cycle,
            args=(batch_size,),
            daemon=True,
            name="manual-processing"
        ).start()

    def _run(self):
        """Main scheduler loop."""
        last_collection  = 0
        last_processing  = 0

        # Initialise backend status immediately
        self._update_backend_status()

        # Small initial delay so Streamlit finishes loading
        time.sleep(self.INITIAL_COLLECT_WAIT)

        while not self._stop_flag.is_set():
            now = time.time()

            # Collection cycle
            if now - last_collection >= self.COLLECTION_INTERVAL:
                self._collection_cycle()
                last_collection = time.time()

            # Processing cycle
            if now - last_processing >= self.PROCESSING_INTERVAL:
                self._processing_cycle()
                last_processing = time.time()

            # Sleep in short intervals so stop_flag is checked responsively
            for _ in range(30):
                if self._stop_flag.is_set():
                    break
                time.sleep(10)

    def _update_backend_status(self):
        try:
            from topic_engine import get_engine
            engine = get_engine(self.db_path)
            status = engine.backend_status()
            pipeline_status.update(
                backend_name=status["name"],
                backend_available=status["available"],
            )
        except Exception as e:
            pipeline_status.update(backend_name="Error", backend_available=False)
            pipeline_status.add_log(f"Backend init error: {e}")

    def _collection_cycle(self):
        pipeline_status.add_log("Starting RSS collection...")
        try:
            from collector import get_collector
            collector = get_collector(self.db_path)
            stats = collector.collect_rss()

            total = pipeline_status.get()["total_collected"] + stats["inserted"]
            pipeline_status.update(
                last_collection=datetime.now().strftime("%d.%m.%Y %H:%M"),
                collection_count=pipeline_status.get()["collection_count"] + 1,
                total_collected=total,
                queue_depth=collector.get_unprocessed_count(),
            )
            pipeline_status.add_log(
                f"Collection done — +{stats['inserted']} new, "
                f"{stats['skipped']} skipped, {stats['errors']} errors"
            )
        except Exception as e:
            pipeline_status.update(last_error=str(e))
            pipeline_status.add_log(f"Collection error: {e}")

    def _processing_cycle(self, batch_size: int = 25):
        try:
            from topic_engine import get_engine
            engine = get_engine(self.db_path)

            queue = engine.get_queue_depth()
            if queue == 0:
                pipeline_status.update(queue_depth=0)
                return

            pipeline_status.add_log(f"Processing queue: {queue} items...")
            stats = engine.process_batch(batch_size=batch_size)

            total = pipeline_status.get()["total_processed"] + stats["processed"]
            pipeline_status.update(
                last_processing=datetime.now().strftime("%d.%m.%Y %H:%M"),
                processing_count=pipeline_status.get()["processing_count"] + 1,
                total_processed=total,
                queue_depth=stats["total_remaining"],
            )
            pipeline_status.add_log(
                f"Processing done — +{stats['processed']} classified, "
                f"{stats['total_remaining']} remaining"
            )
            # Update cache so dashboard shows fresh data
            try:
                import streamlit as st
                st.cache_data.clear()
            except Exception:
                pass

        except Exception as e:
            pipeline_status.update(last_error=str(e))
            pipeline_status.add_log(f"Processing error: {e}")


# ─── Global scheduler singleton ───────────────────────────────────────────────

_scheduler: Optional[Scheduler] = None


def get_scheduler(db_path: str = "narrative_analytics.duckdb") -> Scheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = Scheduler(db_path)
    return _scheduler


def ensure_scheduler_running(db_path: str = "narrative_analytics.duckdb"):
    """Call once from Streamlit app startup to ensure scheduler is running."""
    sched = get_scheduler(db_path)
    if not sched.is_running():
        sched.start()
    return sched
