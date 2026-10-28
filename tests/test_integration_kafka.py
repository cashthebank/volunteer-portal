"""
Integration test: start a real Kafka broker via Testcontainers, publish an
event with the producer envelope, and assert a consumer in the group receives it.

Skipped automatically if Docker/testcontainers is unavailable.

Run: pytest tests/test_integration_kafka.py -v
"""
import json
import os
import sys
import uuid

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

testcontainers = pytest.importorskip("testcontainers.kafka")
from testcontainers.kafka import KafkaContainer  # noqa: E402


@pytest.mark.integration
def test_published_event_reaches_consumer():
    from confluent_kafka import Consumer, Producer

    with KafkaContainer() as kafka:
        bootstrap = kafka.get_bootstrap_server()
        topic = "volunteer-events"

        # Produce one envelope.
        producer = Producer({"bootstrap.servers": bootstrap})
        envelope = {
            "event_id": str(uuid.uuid4()),
            "event_type": "volunteer.registered",
            "occurred_at": "2026-01-01T10:00:00+00:00",
            "schema_version": "1.0",
            "payload": {"event_id": 1, "cause": "Environment"},
        }
        producer.produce(topic, key=b"1", value=json.dumps(envelope).encode())
        producer.flush(10)

        # Consume it back.
        consumer = Consumer(
            {
                "bootstrap.servers": bootstrap,
                "group.id": "volunteer-consumers",
                "auto.offset.reset": "earliest",
            }
        )
        consumer.subscribe([topic])

        received = None
        for _ in range(30):
            msg = consumer.poll(1.0)
            if msg and not msg.error():
                received = json.loads(msg.value().decode())
                break
        consumer.close()

        assert received is not None, "consumer did not receive the published event"
        assert received["event_id"] == envelope["event_id"]
        assert received["event_type"] == "volunteer.registered"
