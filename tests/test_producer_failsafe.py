"""Tests that the producer degrades gracefully (never blocks/raises)."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import events as events_mod  # noqa: E402


def test_envelope_shape():
    env = events_mod.make_envelope("volunteer.registered", {"event_id": 1})
    assert set(env.keys()) == {"event_id", "event_type", "occurred_at", "schema_version", "payload"}
    assert env["event_type"] == "volunteer.registered"
    assert env["schema_version"] == "1.0"
    assert env["payload"] == {"event_id": 1}


def test_publish_without_kafka_does_not_raise():
    # No bootstrap servers -> producer disabled; publish must still return envelope.
    pub = events_mod.EventPublisher(bootstrap_servers="")
    env = pub.publish("volunteer.registered", key=1, payload={"event_id": 1})
    assert env["event_type"] == "volunteer.registered"
    assert env["event_id"]


def test_publish_failure_counter_increments_when_disabled():
    if events_mod.PUBLISH_FAILURES is None:
        return  # prometheus_client not installed
    before = events_mod.PUBLISH_FAILURES.labels(event_type="volunteer.registered")._value.get()
    pub = events_mod.EventPublisher(bootstrap_servers="")
    pub.publish("volunteer.registered", key=1, payload={"event_id": 1})
    after = events_mod.PUBLISH_FAILURES.labels(event_type="volunteer.registered")._value.get()
    assert after == before + 1
