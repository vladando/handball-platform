"""
Database layer - DuckDB schema for aggregate narrative analytics.
All data is topic-centric. No individual tracking.
"""

import duckdb
import os

DB_PATH = "narrative_analytics.duckdb"


def get_connection():
    return duckdb.connect(DB_PATH)


_DB_INITIALIZED = False

def initialize_database():
    global _DB_INITIALIZED
    if _DB_INITIALIZED:
        return
    _DB_INITIALIZED = True
    con = get_connection()

    con.execute("""
        CREATE TABLE IF NOT EXISTS sources (
            source_id       VARCHAR PRIMARY KEY,
            source_name     VARCHAR NOT NULL,
            source_type     VARCHAR NOT NULL,  -- 'portal', 'forum', 'social', 'news'
            region          VARCHAR,
            language        VARCHAR DEFAULT 'bs/sr',
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    con.execute("""
        CREATE TABLE IF NOT EXISTS text_samples (
            sample_id       VARCHAR PRIMARY KEY,
            source_id       VARCHAR REFERENCES sources(source_id),
            ingested_at     TIMESTAMP NOT NULL,
            published_at    TIMESTAMP,
            language_code   VARCHAR DEFAULT 'sr-Latn',
            raw_text        TEXT NOT NULL,
            word_count      INTEGER,
            is_processed    BOOLEAN DEFAULT FALSE
        )
    """)

    con.execute("""
        CREATE TABLE IF NOT EXISTS topics (
            topic_id        VARCHAR PRIMARY KEY,
            topic_label     VARCHAR NOT NULL,       -- e.g. 'Ekonomska Nestabilnost'
            topic_slug      VARCHAR UNIQUE,
            description     TEXT,
            color_hex       VARCHAR DEFAULT '#4A90D9',
            parent_topic_id VARCHAR,
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    con.execute("""
        CREATE TABLE IF NOT EXISTS topic_assignments (
            assignment_id   VARCHAR PRIMARY KEY,
            sample_id       VARCHAR REFERENCES text_samples(sample_id),
            topic_id        VARCHAR REFERENCES topics(topic_id),
            confidence      FLOAT,               -- 0.0 to 1.0
            assigned_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    con.execute("""
        CREATE TABLE IF NOT EXISTS sentiment_snapshots (
            snapshot_id     VARCHAR PRIMARY KEY,
            topic_id        VARCHAR REFERENCES topics(topic_id),
            source_id       VARCHAR REFERENCES sources(source_id),
            snapshot_date   DATE NOT NULL,
            sentiment_score FLOAT,              -- -1.0 (negative) to +1.0 (positive)
            intensity       FLOAT,              -- 0.0 to 1.0 (volume/engagement)
            sample_count    INTEGER DEFAULT 0,
            dominant_emotion VARCHAR,           -- 'frustration','hope','anger','fear','cynicism'
            keywords        VARCHAR[]           -- top keywords for this snapshot
        )
    """)

    con.execute("""
        CREATE TABLE IF NOT EXISTS topic_relations (
            relation_id     VARCHAR PRIMARY KEY,
            topic_a_id      VARCHAR REFERENCES topics(topic_id),
            topic_b_id      VARCHAR REFERENCES topics(topic_id),
            relation_type   VARCHAR,            -- 'co-occurs', 'precedes', 'opposes'
            strength        FLOAT,              -- 0.0 to 1.0
            observed_at     DATE
        )
    """)

    con.execute("""
        CREATE TABLE IF NOT EXISTS narrative_events (
            event_id        VARCHAR PRIMARY KEY,
            event_date      DATE NOT NULL,
            event_label     VARCHAR NOT NULL,
            event_type      VARCHAR,            -- 'spike', 'shift', 'emergence', 'fade'
            topic_id        VARCHAR REFERENCES topics(topic_id),
            magnitude       FLOAT,
            description     TEXT
        )
    """)

    con.execute("""
        CREATE TABLE IF NOT EXISTS trend_metrics (
            metric_id       VARCHAR PRIMARY KEY,
            topic_id        VARCHAR REFERENCES topics(topic_id),
            metric_date     DATE NOT NULL,
            velocity        FLOAT,      -- rate of change
            acceleration    FLOAT,      -- second derivative
            cross_source_spread FLOAT,  -- how many sources carry this topic
            predicted_intensity FLOAT   -- 7-day forecast
        )
    """)

    con.close()
    print("[DB] Schema initialized.")


if __name__ == "__main__":
    initialize_database()
