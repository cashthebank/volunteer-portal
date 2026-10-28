"""
Pure aggregation logic for the volunteer-events consumer.

Kept free of Kafka/DB so it can be unit-tested directly (pytest).
"""
from collections import defaultdict
from datetime import datetime


# Duration hours per cause isn't in the event payload for registrations, so the
# consumer looks it up; for unit tests we accept an explicit hours value.
def registrations_per_minute(events):
    """
    Given a list of envelopes, return {minute_bucket_iso: count} for
    volunteer.registered events, bucketed to the minute.
    """
    buckets = defaultdict(int)
    for ev in events:
        if ev.get("event_type") != "volunteer.registered":
            continue
        ts = datetime.fromisoformat(ev["occurred_at"])
        bucket = ts.replace(second=0, microsecond=0).isoformat()
        buckets[bucket] += 1
    return dict(buckets)


def counts_per_cause(events):
    """Count volunteer.registered events grouped by cause (from payload)."""
    counts = defaultdict(int)
    for ev in events:
        if ev.get("event_type") != "volunteer.registered":
            continue
        cause = ev.get("payload", {}).get("cause", "Unknown")
        counts[cause] += 1
    return dict(counts)


def cumulative_hours(events, hours_lookup):
    """
    Sum volunteer hours across volunteer.registered events.
    hours_lookup: callable(event_id) -> duration_hours (int).
    """
    total = 0
    for ev in events:
        if ev.get("event_type") != "volunteer.registered":
            continue
        eid = ev.get("payload", {}).get("event_id")
        total += hours_lookup(eid)
    return total


def dedupe(events):
    """Return events with duplicate event_id removed, preserving first occurrence."""
    seen = set()
    out = []
    for ev in events:
        eid = ev.get("event_id")
        if eid in seen:
            continue
        seen.add(eid)
        out.append(ev)
    return out
