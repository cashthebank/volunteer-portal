"""
Idempotent aggregating consumer for the volunteer-events topic.

  * group.id = volunteer-consumers  (horizontal scaling across 3 partitions)
  * Idempotency: each event_id is recorded in processed_events; duplicates skipped.
  * Aggregates registrations, per-cause counts, and cumulative volunteer hours
    into the `aggregates` table in Postgres.
  * Exposes Prometheus metrics on :8001/metrics.
"""
import json
import logging
import os
import signal
import time

import psycopg2
import psycopg2.extras
from prometheus_client import Counter, Gauge, start_http_server

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("consumer")

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
TOPIC = os.getenv("KAFKA_TOPIC", "volunteer-events")
GROUP = os.getenv("KAFKA_GROUP", "volunteer-consumers")
METRICS_PORT = int(os.getenv("METRICS_PORT", "8001"))

DB_CONFIG = {
    "host": os.getenv("POSTGRES_HOST", "postgres"),
    "port": int(os.getenv("POSTGRES_PORT", "5432")),
    "dbname": os.getenv("POSTGRES_DB", "volunteer"),
    "user": os.getenv("POSTGRES_USER", "volunteer"),
    "password": os.getenv("POSTGRES_PASSWORD", "volunteer"),
}

# ─── Prometheus metrics ───────────────────────────────────────────────────────
EVENTS_PROCESSED = Counter("consumer_events_processed_total", "Events processed", ["event_type"])
EVENTS_SKIPPED = Counter("consumer_events_skipped_total", "Duplicate events skipped")
REG_TOTAL = Counter("consumer_registrations_total", "Total volunteer registrations", ["cause"])
HOURS_TOTAL = Gauge("consumer_volunteer_hours_total", "Cumulative volunteer hours aggregated")
EVENTS_CREATED = Counter("consumer_events_created_total", "Volunteering events created")
EVENTS_DELETED = Counter("consumer_events_deleted_total", "Volunteering events deleted")

_running = True


def _db():
    return psycopg2.connect(cursor_factory=psycopg2.extras.RealDictCursor, **DB_CONFIG)


def wait_for_db(retries=30, delay=2.0):
    for attempt in range(1, retries + 1):
        try:
            _db().close()
            logger.info("DB reachable")
            return
        except Exception as exc:
            logger.warning("DB not ready (%d/%d): %s", attempt, retries, exc)
            time.sleep(delay)
    raise RuntimeError("DB never ready")


def already_processed(conn, event_id) -> bool:
    with conn.cursor() as c:
        c.execute("SELECT 1 FROM processed_events WHERE event_id=%s", (event_id,))
        return c.fetchone() is not None


def mark_processed(conn, event_id):
    with conn.cursor() as c:
        c.execute(
            "INSERT INTO processed_events (event_id) VALUES (%s) ON CONFLICT DO NOTHING",
            (event_id,),
        )


def bump_aggregate(conn, metric, dimension, delta):
    with conn.cursor() as c:
        c.execute(
            """INSERT INTO aggregates (metric, dimension, value, updated_at)
               VALUES (%s,%s,%s,NOW())
               ON CONFLICT (metric, dimension)
               DO UPDATE SET value = aggregates.value + EXCLUDED.value, updated_at = NOW()""",
            (metric, dimension or "", delta),
        )


def event_hours(conn, event_id) -> int:
    with conn.cursor() as c:
        c.execute("SELECT duration_hours FROM events WHERE id=%s", (event_id,))
        row = c.fetchone()
        return int(row["duration_hours"]) if row else 0


def handle(conn, env: dict):
    """Apply one envelope's effect to aggregates. Caller guarantees idempotency."""
    etype = env.get("event_type")
    payload = env.get("payload", {})
    if etype == "volunteer.registered":
        eid = payload.get("event_id")
        with conn.cursor() as c:
            c.execute("SELECT cause FROM events WHERE id=%s", (eid,))
            row = c.fetchone()
        cause = row["cause"] if row else "Unknown"
        hours = event_hours(conn, eid)
        bump_aggregate(conn, "registrations", "", 1)
        bump_aggregate(conn, "registrations_by_cause", cause, 1)
        bump_aggregate(conn, "volunteer_hours", "", hours)
        REG_TOTAL.labels(cause=cause).inc()
        HOURS_TOTAL.inc(hours)
    elif etype == "event.created":
        bump_aggregate(conn, "events_created", "", 1)
        EVENTS_CREATED.inc()
    elif etype == "event.deleted":
        bump_aggregate(conn, "events_deleted", "", 1)
        EVENTS_DELETED.inc()


def process_envelope(conn, env: dict) -> bool:
    """Returns True if processed, False if skipped as duplicate."""
    eid = env.get("event_id")
    if not eid or already_processed(conn, eid):
        EVENTS_SKIPPED.inc()
        return False
    handle(conn, env)
    mark_processed(conn, eid)
    conn.commit()
    EVENTS_PROCESSED.labels(event_type=env.get("event_type", "unknown")).inc()
    return True


def _stop(*_):
    global _running
    _running = False


def main():
    from confluent_kafka import Consumer

    signal.signal(signal.SIGTERM, _stop)
    signal.signal(signal.SIGINT, _stop)

    wait_for_db()
    start_http_server(METRICS_PORT)
    logger.info("Metrics on :%d/metrics", METRICS_PORT)

    consumer = Consumer(
        {
            "bootstrap.servers": KAFKA_BOOTSTRAP,
            "group.id": GROUP,
            "auto.offset.reset": "earliest",
            "enable.auto.commit": True,
        }
    )
    consumer.subscribe([TOPIC])
    logger.info("Subscribed to %s as group %s", TOPIC, GROUP)

    conn = _db()
    try:
        while _running:
            msg = consumer.poll(1.0)
            if msg is None:
                continue
            if msg.error():
                logger.error("Consumer error: %s", msg.error())
                continue
            try:
                env = json.loads(msg.value().decode())
                process_envelope(conn, env)
            except Exception as exc:
                logger.error("Failed to process message: %s", exc)
                conn.rollback()
    finally:
        consumer.close()
        conn.close()
        logger.info("Consumer stopped")


if __name__ == "__main__":
    main()
