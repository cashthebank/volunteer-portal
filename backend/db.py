"""PostgreSQL data layer for the GoodVolunteer API."""
import logging
import os
import time

import psycopg2
import psycopg2.extras

logger = logging.getLogger("db")

DB_CONFIG = {
    "host": os.getenv("POSTGRES_HOST", "localhost"),
    "port": int(os.getenv("POSTGRES_PORT", "5432")),
    "dbname": os.getenv("POSTGRES_DB", "volunteer"),
    "user": os.getenv("POSTGRES_USER", "volunteer"),
    "password": os.getenv("POSTGRES_PASSWORD", "volunteer"),
}

SEED_EVENTS = [
    ("Beach Cleanup Drive", "Join us to clean up Marina Beach and protect our coastal ecosystem.", "Environment", "Marina Beach, Chennai", "2026-06-20", 4, 30),
    ("Teach & Inspire — Math Workshop", "Volunteer to teach basic math skills to underprivileged students at a local school.", "Education", "Govt. School, Koramangala, Bengaluru", "2026-06-25", 3, 15),
    ("Food Bank Packing Day", "Help sort and pack food parcels for families in need at the city food bank.", "Community", "City Food Bank, Indiranagar, Bengaluru", "2026-07-02", 5, 40),
    ("Tree Plantation Drive", "Plant 500 saplings across the city park with the Green Bengaluru initiative.", "Environment", "Cubbon Park, Bengaluru", "2026-07-08", 4, 50),
    ("Senior Care Visit", "Spend time with elderly residents at an old-age home — games, conversation, and care.", "Healthcare", "Asha Old Age Home, HSR Layout", "2026-07-15", 3, 10),
    ("Animal Shelter Support", "Help bathe, feed, and care for rescued animals at the city shelter.", "Animal Welfare", "CUPA Shelter, Bengaluru", "2026-07-18", 4, 20),
]


def get_db():
    conn = psycopg2.connect(cursor_factory=psycopg2.extras.RealDictCursor, **DB_CONFIG)
    return conn


def wait_for_db(retries: int = 30, delay: float = 2.0):
    """Block until Postgres is reachable (startup ordering in docker/k8s)."""
    last_err = None
    for attempt in range(1, retries + 1):
        try:
            conn = psycopg2.connect(**DB_CONFIG)
            conn.close()
            logger.info("Database reachable after %d attempt(s)", attempt)
            return
        except Exception as exc:
            last_err = exc
            logger.warning("DB not ready (attempt %d/%d): %s", attempt, retries, exc)
            time.sleep(delay)
    raise RuntimeError(f"Database never became ready: {last_err}")


def init_db():
    conn = get_db()
    c = conn.cursor()
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS events (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            cause TEXT NOT NULL,
            location TEXT NOT NULL,
            date TEXT NOT NULL,
            duration_hours INTEGER NOT NULL DEFAULT 2,
            max_volunteers INTEGER NOT NULL DEFAULT 20,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        """
    )
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS registrations (
            id SERIAL PRIMARY KEY,
            event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
            employee_name TEXT NOT NULL,
            employee_email TEXT NOT NULL,
            registered_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(event_id, employee_email)
        )
        """
    )
    # Aggregation tables owned by the consumer, created here so Grafana/Postgres
    # datasource works even before the consumer starts.
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS processed_events (
            event_id TEXT PRIMARY KEY,
            processed_at TIMESTAMPTZ DEFAULT NOW()
        )
        """
    )
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS aggregates (
            metric TEXT NOT NULL,
            dimension TEXT NOT NULL DEFAULT '',
            value DOUBLE PRECISION NOT NULL DEFAULT 0,
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (metric, dimension)
        )
        """
    )
    c.execute("SELECT COUNT(*) AS n FROM events")
    if c.fetchone()["n"] == 0:
        psycopg2.extras.execute_batch(
            c,
            "INSERT INTO events (title, description, cause, location, date, duration_hours, max_volunteers) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s)",
            SEED_EVENTS,
        )
        logger.info("Seeded %d events", len(SEED_EVENTS))
    conn.commit()
    conn.close()
