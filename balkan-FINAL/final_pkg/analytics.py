"""
Analytics engine: computes aggregates, trend metrics, and topic network data.
All computations are topic-level — no individual tracking.
"""

import math
from datetime import date, timedelta
from typing import Optional
import duckdb
import pandas as pd
from database import get_connection


def _safe_query(sql: str, params: list = None) -> pd.DataFrame:
    """Execute a query and return empty DataFrame on any error."""
    try:
        con = get_connection()
        df = con.execute(sql, params or []).df()
        con.close()
        return df
    except Exception as e:
        return pd.DataFrame()


def get_topic_summary() -> pd.DataFrame:
    """Return latest sentiment and intensity for all topics."""
    return _safe_query("""
        WITH latest AS (
            SELECT
                topic_id,
                AVG(sentiment_score)   AS avg_sentiment,
                AVG(intensity)         AS avg_intensity,
                SUM(sample_count)      AS total_samples,
                MAX(dominant_emotion)  AS top_emotion
            FROM sentiment_snapshots
            WHERE snapshot_date >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY topic_id
        )
        SELECT
            t.topic_id,
            t.topic_label,
            t.topic_slug,
            t.color_hex,
            t.description,
            COALESCE(l.avg_sentiment, 0)    AS sentiment,
            COALESCE(l.avg_intensity, 0)    AS intensity,
            COALESCE(l.total_samples, 0)    AS volume,
            COALESCE(l.top_emotion, 'N/A')  AS top_emotion
        FROM topics t
        LEFT JOIN latest l USING (topic_id)
        ORDER BY intensity DESC
    """)


def get_sentiment_timeseries(
    topic_ids: Optional[list] = None,
    days: int = 90
) -> pd.DataFrame:
    """Return daily aggregate sentiment per topic over the last N days."""
    topic_filter = ""
    if topic_ids:
        placeholders = ", ".join(f"'{t}'" for t in topic_ids)
        topic_filter = f"AND ss.topic_id IN ({placeholders})"

    return _safe_query(f"""
        SELECT
            ss.snapshot_date        AS date,
            t.topic_label           AS topic,
            t.topic_id,
            t.color_hex,
            AVG(ss.sentiment_score) AS sentiment,
            AVG(ss.intensity)       AS intensity,
            SUM(ss.sample_count)    AS volume
        FROM sentiment_snapshots ss
        JOIN topics t USING (topic_id)
        WHERE ss.snapshot_date >= CURRENT_DATE - INTERVAL '{days} days'
        {topic_filter}
        GROUP BY ss.snapshot_date, t.topic_label, t.topic_id, t.color_hex
        ORDER BY ss.snapshot_date, t.topic_label
    """)


def get_source_heatmap(days: int = 30) -> pd.DataFrame:
    """Return intensity per topic per source for heatmap."""
    return _safe_query(f"""
        SELECT
            t.topic_label   AS topic,
            s.source_name   AS source,
            s.region,
            AVG(ss.intensity)       AS intensity,
            AVG(ss.sentiment_score) AS sentiment,
            SUM(ss.sample_count)    AS volume
        FROM sentiment_snapshots ss
        JOIN topics t  USING (topic_id)
        JOIN sources s USING (source_id)
        WHERE ss.snapshot_date >= CURRENT_DATE - INTERVAL '{days} days'
        GROUP BY t.topic_label, s.source_name, s.region
        ORDER BY intensity DESC
    """)


def get_topic_network() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Return nodes and edges for topic co-occurrence network."""
    nodes = _safe_query("""
        WITH recent AS (
            SELECT
                topic_id,
                AVG(intensity)       AS intensity,
                AVG(sentiment_score) AS sentiment
            FROM sentiment_snapshots
            WHERE snapshot_date >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY topic_id
        )
        SELECT
            t.topic_id   AS id,
            t.topic_label AS label,
            t.color_hex,
            COALESCE(r.intensity, 0.3)  AS size,
            COALESCE(r.sentiment, 0)    AS sentiment
        FROM topics t
        LEFT JOIN recent r USING (topic_id)
    """)

    edges = _safe_query("""
        SELECT
            tr.topic_a_id   AS source,
            tr.topic_b_id   AS target,
            tr.relation_type,
            tr.strength     AS weight
        FROM topic_relations tr
        ORDER BY strength DESC
    """)

    return nodes, edges


def get_narrative_events(days: int = 180) -> pd.DataFrame:
    """Return narrative events for timeline view."""
    return _safe_query(f"""
        SELECT
            ne.event_date,
            ne.event_label,
            ne.event_type,
            ne.magnitude,
            ne.description,
            t.topic_label,
            t.color_hex
        FROM narrative_events ne
        JOIN topics t USING (topic_id)
        WHERE ne.event_date >= CURRENT_DATE - INTERVAL '{days} days'
        ORDER BY ne.event_date DESC
    """)


def get_topic_detail(topic_id: str) -> dict:
    """Return full detail for a single topic."""
    meta = _safe_query(
        "SELECT topic_id, topic_label, topic_slug, description, color_hex FROM topics WHERE topic_id = ?",
        [topic_id]
    )
    if meta.empty:
        return {}

    ts = _safe_query("""
        SELECT
            snapshot_date AS date,
            AVG(sentiment_score) AS sentiment,
            AVG(intensity)       AS intensity,
            SUM(sample_count)    AS volume,
            MAX(dominant_emotion) AS emotion
        FROM sentiment_snapshots
        WHERE topic_id = ?
        GROUP BY snapshot_date
        ORDER BY snapshot_date
    """, [topic_id])

    events = _safe_query("""
        SELECT event_date, event_label, event_type, magnitude, description
        FROM narrative_events
        WHERE topic_id = ?
        ORDER BY event_date DESC
    """, [topic_id])

    related = _safe_query("""
        SELECT
            CASE WHEN topic_a_id = ? THEN topic_b_id ELSE topic_a_id END AS related_id,
            t.topic_label AS related_label,
            tr.relation_type,
            tr.strength
        FROM topic_relations tr
        JOIN topics t ON t.topic_id = CASE
            WHEN topic_a_id = ? THEN topic_b_id ELSE topic_a_id END
        WHERE topic_a_id = ? OR topic_b_id = ?
        ORDER BY strength DESC
        LIMIT 5
    """, [topic_id, topic_id, topic_id, topic_id])

    sources = _safe_query("""
        SELECT
            s.source_name,
            s.region,
            COUNT(*) AS snap_count,
            AVG(ss.intensity) AS avg_intensity
        FROM sentiment_snapshots ss
        JOIN sources s USING (source_id)
        WHERE ss.topic_id = ?
        GROUP BY s.source_name, s.region
        ORDER BY avg_intensity DESC
        LIMIT 6
    """, [topic_id])

    row = meta.iloc[0]
    return {
        "id":          row["topic_id"],
        "label":       row["topic_label"],
        "slug":        row["topic_slug"],
        "description": row["description"],
        "color":       row["color_hex"],
        "timeseries":  ts,
        "events":      events,
        "related":     related,
        "sources":     sources,
    }


def get_weekly_digest() -> dict:
    """High-level stats for the KPI header row."""
    defaults = {
        "total_volume":   0,
        "avg_sentiment":  0.0,
        "most_active":    "—",
        "most_negative":  "—",
        "event_count":    0,
        "active_sources": 0,
    }
    try:
        con = get_connection()

        total_volume = con.execute("""
            SELECT SUM(sample_count) FROM sentiment_snapshots
            WHERE snapshot_date >= CURRENT_DATE - INTERVAL '7 days'
        """).fetchone()[0] or 0

        avg_sentiment = con.execute("""
            SELECT AVG(sentiment_score) FROM sentiment_snapshots
            WHERE snapshot_date >= CURRENT_DATE - INTERVAL '7 days'
        """).fetchone()[0] or 0

        most_active = con.execute("""
            SELECT t.topic_label, SUM(ss.sample_count) AS vol
            FROM sentiment_snapshots ss
            JOIN topics t USING (topic_id)
            WHERE ss.snapshot_date >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY t.topic_label ORDER BY vol DESC LIMIT 1
        """).fetchone()

        most_negative = con.execute("""
            SELECT t.topic_label, AVG(ss.sentiment_score) AS s
            FROM sentiment_snapshots ss
            JOIN topics t USING (topic_id)
            WHERE ss.snapshot_date >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY t.topic_label ORDER BY s ASC LIMIT 1
        """).fetchone()

        event_count = con.execute("""
            SELECT COUNT(*) FROM narrative_events
            WHERE event_date >= CURRENT_DATE - INTERVAL '30 days'
        """).fetchone()[0] or 0

        active_sources = con.execute("""
            SELECT COUNT(DISTINCT source_id) FROM sentiment_snapshots
            WHERE snapshot_date >= CURRENT_DATE - INTERVAL '7 days'
        """).fetchone()[0] or 0

        con.close()
        return {
            "total_volume":   int(total_volume),
            "avg_sentiment":  round(float(avg_sentiment), 3),
            "most_active":    most_active[0]  if most_active  else "—",
            "most_negative":  most_negative[0] if most_negative else "—",
            "event_count":    event_count,
            "active_sources": active_sources,
        }
    except Exception:
        return defaults
