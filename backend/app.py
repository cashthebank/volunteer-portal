"""
GoodVolunteer REST API — PostgreSQL + Prometheus metrics + Kafka event publishing.

Every meaningful action publishes a standard envelope to Kafka (non-blocking),
and request metrics are exposed at /metrics for Prometheus.
"""
import logging
import os

from flask import Flask, request, jsonify
from flask_cors import CORS
from prometheus_flask_exporter import PrometheusMetrics
import psycopg2.errors

import db
from events import EventPublisher

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api")

app = Flask(__name__)
CORS(app)

# /metrics endpoint: request count, latency histogram, error rate per endpoint.
metrics = PrometheusMetrics(app, group_by="endpoint")
metrics.info("app_info", "GoodVolunteer API", version="1.0")

publisher = EventPublisher()


# ─── EVENTS ─────────────────────────────────────────────────────────────────
@app.route("/api/events", methods=["GET"])
def get_events():
    cause = request.args.get("cause")
    conn = db.get_db()
    c = conn.cursor()
    if cause and cause != "All":
        c.execute(
            """SELECT e.*, COUNT(r.id) AS registered_count
               FROM events e LEFT JOIN registrations r ON e.id = r.event_id
               WHERE e.cause = %s GROUP BY e.id ORDER BY e.date ASC""",
            (cause,),
        )
    else:
        c.execute(
            """SELECT e.*, COUNT(r.id) AS registered_count
               FROM events e LEFT JOIN registrations r ON e.id = r.event_id
               GROUP BY e.id ORDER BY e.date ASC"""
        )
    events = [dict(row) for row in c.fetchall()]
    conn.close()
    publisher.publish("event.list_viewed", key="all", payload={"cause": cause or "All", "count": len(events)})
    return jsonify(events)


@app.route("/api/events/<int:event_id>", methods=["GET"])
def get_event(event_id):
    conn = db.get_db()
    c = conn.cursor()
    c.execute(
        """SELECT e.*, COUNT(r.id) AS registered_count
           FROM events e LEFT JOIN registrations r ON e.id = r.event_id
           WHERE e.id = %s GROUP BY e.id""",
        (event_id,),
    )
    event = c.fetchone()
    conn.close()
    if not event:
        return jsonify({"error": "Event not found"}), 404
    publisher.publish("event.viewed", key=event_id, payload={"event_id": event_id})
    return jsonify(dict(event))


@app.route("/api/events", methods=["POST"])
def create_event():
    data = request.json or {}
    required = ["title", "cause", "location", "date", "duration_hours", "max_volunteers"]
    for field in required:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400
    conn = db.get_db()
    c = conn.cursor()
    c.execute(
        """INSERT INTO events (title, description, cause, location, date, duration_hours, max_volunteers)
           VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
        (data["title"], data.get("description", ""), data["cause"], data["location"],
         data["date"], data["duration_hours"], data["max_volunteers"]),
    )
    new_id = c.fetchone()["id"]
    conn.commit()
    conn.close()
    publisher.publish("event.created", key=new_id,
                      payload={"event_id": new_id, "cause": data["cause"], "title": data["title"]})
    return jsonify({"id": new_id, "message": "Event created"}), 201


@app.route("/api/events/<int:event_id>", methods=["PUT"])
def update_event(event_id):
    data = request.json or {}
    conn = db.get_db()
    c = conn.cursor()
    c.execute(
        """UPDATE events SET title=%s, description=%s, cause=%s, location=%s,
           date=%s, duration_hours=%s, max_volunteers=%s WHERE id=%s""",
        (data["title"], data.get("description", ""), data["cause"], data["location"],
         data["date"], data["duration_hours"], data["max_volunteers"], event_id),
    )
    conn.commit()
    conn.close()
    publisher.publish("event.updated", key=event_id, payload={"event_id": event_id})
    return jsonify({"message": "Event updated"})


@app.route("/api/events/<int:event_id>", methods=["DELETE"])
def delete_event(event_id):
    conn = db.get_db()
    c = conn.cursor()
    c.execute("DELETE FROM events WHERE id=%s", (event_id,))  # cascades to registrations
    conn.commit()
    conn.close()
    publisher.publish("event.deleted", key=event_id, payload={"event_id": event_id})
    return jsonify({"message": "Event deleted"})


# ─── REGISTRATIONS ──────────────────────────────────────────────────────────
@app.route("/api/events/<int:event_id>/register", methods=["POST"])
def register(event_id):
    data = request.json or {}
    if not data.get("employee_name") or not data.get("employee_email"):
        return jsonify({"error": "Name and email are required"}), 400
    conn = db.get_db()
    c = conn.cursor()
    c.execute("SELECT max_volunteers FROM events WHERE id=%s", (event_id,))
    event = c.fetchone()
    if not event:
        conn.close()
        return jsonify({"error": "Event not found"}), 404
    c.execute("SELECT COUNT(*) AS n FROM registrations WHERE event_id=%s", (event_id,))
    if c.fetchone()["n"] >= event["max_volunteers"]:
        conn.close()
        return jsonify({"error": "Event is full"}), 400
    try:
        c.execute(
            "INSERT INTO registrations (event_id, employee_name, employee_email) VALUES (%s,%s,%s)",
            (event_id, data["employee_name"], data["employee_email"]),
        )
        conn.commit()
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        conn.close()
        return jsonify({"error": "Already registered for this event"}), 409
    conn.close()
    publisher.publish("volunteer.registered", key=event_id,
                      payload={"event_id": event_id, "employee_email": data["employee_email"]})
    return jsonify({"message": "Registered successfully"}), 201


@app.route("/api/events/<int:event_id>/registrations", methods=["GET"])
def get_registrations(event_id):
    conn = db.get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM registrations WHERE event_id=%s ORDER BY registered_at DESC", (event_id,))
    regs = [dict(row) for row in c.fetchall()]
    conn.close()
    return jsonify(regs)


# ─── DASHBOARD ──────────────────────────────────────────────────────────────
@app.route("/api/dashboard", methods=["GET"])
def dashboard():
    email = request.args.get("email")
    conn = db.get_db()
    c = conn.cursor()
    if email:
        c.execute(
            """SELECT e.title, e.cause, e.date, e.location, e.duration_hours, r.registered_at
               FROM registrations r JOIN events e ON r.event_id = e.id
               WHERE r.employee_email = %s ORDER BY e.date DESC""",
            (email,),
        )
        my_events = [dict(row) for row in c.fetchall()]
        total_hours = sum(ev["duration_hours"] for ev in my_events)
        conn.close()
        return jsonify({"events": my_events, "total_hours": total_hours, "total_events": len(my_events)})
    c.execute("SELECT COUNT(*) AS total FROM events")
    total_events = c.fetchone()["total"]
    c.execute("SELECT COUNT(*) AS total FROM registrations")
    total_regs = c.fetchone()["total"]
    c.execute("SELECT SUM(e.duration_hours) AS hours FROM registrations r JOIN events e ON r.event_id=e.id")
    total_hours = c.fetchone()["hours"] or 0
    c.execute(
        """SELECT e.cause, COUNT(r.id) AS count FROM registrations r JOIN events e ON r.event_id=e.id
           GROUP BY e.cause ORDER BY count DESC"""
    )
    by_cause = [dict(row) for row in c.fetchall()]
    conn.close()
    return jsonify({"total_events": total_events, "total_registrations": total_regs,
                    "total_volunteer_hours": total_hours, "by_cause": by_cause})


@app.route("/healthz")
def healthz():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    db.wait_for_db()
    db.init_db()
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")))
