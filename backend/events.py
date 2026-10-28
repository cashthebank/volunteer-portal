"""
Kafka event publishing for the GoodVolunteer API.

Design goals (interview talking points):
  * NON-BLOCKING: produce() queues the message and returns immediately. A Kafka
    outage must never block or fail an API request.
  * FAIL-SAFE: delivery failures are logged and counted in a Prometheus counter
    (kafka_publish_failures_total). The API keeps serving.
  * KEYED BY event id: messages are keyed by the volunteering event id so all
    messages for one event land in the same partition and stay ordered.
  * STANDARD ENVELOPE: every message has the same shape
    (event_id, event_type, occurred_at, schema_version, payload).
"""
import json
import logging
import os
import uuid
from datetime import datetime, timezone

logger = logging.getLogger("events")

SCHEMA_VERSION = "1.0"
TOPIC = os.getenv("KAFKA_TOPIC", "volunteer-events")
KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "")

# Prometheus counter for failed publishes. Imported lazily so the module works
# even if prometheus_client isn't installed (tests).
try:
    from prometheus_client import Counter

    PUBLISH_FAILURES = Counter(
        "kafka_publish_failures_total",
        "Total number of Kafka messages that failed to be delivered",
        ["event_type"],
    )
    PUBLISH_SUCCESS = Counter(
        "kafka_publish_success_total",
        "Total number of Kafka messages successfully delivered",
        ["event_type"],
    )
except Exception:  # pragma: no cover
    PUBLISH_FAILURES = None
    PUBLISH_SUCCESS = None


def make_envelope(event_type: str, payload: dict) -> dict:
    """Build the standard event envelope."""
    return {
        "event_id": str(uuid.uuid4()),
        "event_type": event_type,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "schema_version": SCHEMA_VERSION,
        "payload": payload,
    }


class EventPublisher:
    """Thin wrapper around confluent_kafka.Producer with graceful degradation."""

    def __init__(self, bootstrap_servers: str = KAFKA_BOOTSTRAP, topic: str = TOPIC):
        self.topic = topic
        self.bootstrap_servers = bootstrap_servers
        self._producer = None
        if bootstrap_servers:
            try:
                from confluent_kafka import Producer

                self._producer = Producer(
                    {
                        "bootstrap.servers": bootstrap_servers,
                        # Keep the client from blocking the request thread for long.
                        "message.timeout.ms": 5000,
                        "socket.timeout.ms": 3000,
                        "retries": 3,
                        "enable.idempotence": True,
                    }
                )
                logger.info("Kafka producer initialised (bootstrap=%s)", bootstrap_servers)
            except Exception as exc:  # pragma: no cover
                logger.warning("Kafka producer unavailable: %s", exc)
                self._producer = None
        else:
            logger.info("KAFKA_BOOTSTRAP_SERVERS not set; event publishing disabled")

    def _delivery_report(self, err, msg):
        """Delivery callback invoked by poll(). Runs on the producer thread."""
        event_type = "unknown"
        try:
            headers = dict(msg.headers() or [])
            event_type = (headers.get("event_type") or b"unknown").decode()
        except Exception:
            pass
        if err is not None:
            logger.error("Delivery failed for %s: %s", event_type, err)
            if PUBLISH_FAILURES:
                PUBLISH_FAILURES.labels(event_type=event_type).inc()
        else:
            if PUBLISH_SUCCESS:
                PUBLISH_SUCCESS.labels(event_type=event_type).inc()

    def publish(self, event_type: str, key, payload: dict) -> dict:
        """
        Publish an event. NEVER raises — a Kafka problem must not break the API.
        Returns the envelope that was (attempted to be) sent.
        """
        envelope = make_envelope(event_type, payload)
        if self._producer is None:
            # Publishing disabled or unavailable: count as a failure but don't raise.
            if PUBLISH_FAILURES:
                PUBLISH_FAILURES.labels(event_type=event_type).inc()
            return envelope
        try:
            self._producer.produce(
                self.topic,
                key=str(key).encode() if key is not None else None,
                value=json.dumps(envelope).encode(),
                headers=[("event_type", event_type.encode())],
                callback=self._delivery_report,
            )
            # Serve delivery callbacks without blocking (timeout=0).
            self._producer.poll(0)
        except BufferError:
            logger.error("Producer queue full, dropping %s", event_type)
            if PUBLISH_FAILURES:
                PUBLISH_FAILURES.labels(event_type=event_type).inc()
        except Exception as exc:
            logger.error("Publish error for %s: %s", event_type, exc)
            if PUBLISH_FAILURES:
                PUBLISH_FAILURES.labels(event_type=event_type).inc()
        return envelope

    def flush(self, timeout: float = 2.0):
        if self._producer is not None:
            self._producer.flush(timeout)
