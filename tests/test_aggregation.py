"""Unit tests for the consumer aggregation logic (no Kafka/DB needed)."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "consumer"))

import aggregation  # noqa: E402


def _reg(event_id, cause, occurred_at, eid="e"):
    return {
        "event_id": eid,
        "event_type": "volunteer.registered",
        "occurred_at": occurred_at,
        "schema_version": "1.0",
        "payload": {"event_id": event_id, "cause": cause},
    }


def test_registrations_per_minute_buckets():
    events = [
        _reg(1, "Environment", "2026-01-01T10:00:05+00:00", eid="a"),
        _reg(2, "Environment", "2026-01-01T10:00:45+00:00", eid="b"),
        _reg(3, "Education", "2026-01-01T10:01:10+00:00", eid="c"),
    ]
    result = aggregation.registrations_per_minute(events)
    assert result["2026-01-01T10:00:00+00:00"] == 2
    assert result["2026-01-01T10:01:00+00:00"] == 1


def test_counts_per_cause():
    events = [
        _reg(1, "Environment", "2026-01-01T10:00:05+00:00", eid="a"),
        _reg(2, "Environment", "2026-01-01T10:00:45+00:00", eid="b"),
        _reg(3, "Education", "2026-01-01T10:01:10+00:00", eid="c"),
    ]
    result = aggregation.counts_per_cause(events)
    assert result == {"Environment": 2, "Education": 1}


def test_cumulative_hours_uses_lookup():
    events = [
        _reg(1, "Environment", "2026-01-01T10:00:05+00:00", eid="a"),
        _reg(2, "Education", "2026-01-01T10:00:45+00:00", eid="b"),
    ]
    hours = {1: 4, 2: 3}
    total = aggregation.cumulative_hours(events, lambda eid: hours.get(eid, 0))
    assert total == 7


def test_dedupe_removes_duplicate_event_ids():
    events = [
        _reg(1, "Environment", "2026-01-01T10:00:05+00:00", eid="dup"),
        _reg(1, "Environment", "2026-01-01T10:00:05+00:00", eid="dup"),
        _reg(2, "Education", "2026-01-01T10:01:10+00:00", eid="unique"),
    ]
    out = aggregation.dedupe(events)
    assert len(out) == 2
    assert {e["event_id"] for e in out} == {"dup", "unique"}


def test_non_registration_events_ignored_in_counts():
    events = [
        {"event_id": "x", "event_type": "event.viewed", "occurred_at": "2026-01-01T10:00:00+00:00", "payload": {}},
    ]
    assert aggregation.counts_per_cause(events) == {}
    assert aggregation.registrations_per_minute(events) == {}
