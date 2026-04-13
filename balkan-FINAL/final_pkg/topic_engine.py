"""
topic_engine.py — Claude Haiku topic classification engine.
Backend: Anthropic API only (claude-haiku-4-5-20251001).
Set ANTHROPIC_API_KEY environment variable before running.
All classification is topic-level. No author data used or stored.
"""

import json
import re
import time
import uuid
import logging
import os
from datetime import date as dt_date
from typing import Optional

logger = logging.getLogger("topic_engine")

MODEL = "claude-haiku-4-5-20251001"

# ─── TOPIC REGISTRY ───────────────────────────────────────────────────────────

TOPICS = [
    ("top_econ",  "Ekonomska nestabilnost",     "inflacija, plate, cijene, životni standard, kriza, BDP"),
    ("top_poli",  "Politička polarizacija",      "institucije, stranke, izbori, blokada, vlada, parlamentarni"),
    ("top_euro",  "EU integracije",              "Evropska unija, kandidatski status, reforme, usklađivanje"),
    ("top_dijk",  "Dijaspora i odljev mozgova",  "emigracija, mladi odlaze, dijaspora, iseljenici, demografija"),
    ("top_infra", "Infrastruktura i razvoj",     "autoput, putevi, most, električna mreža, investicije"),
    ("top_korr",  "Korupcija i vladavina prava", "korupcija, tužilaštvo, uhapšen, optužnica, sudstvo, istraga"),
    ("top_medi",  "Medijska sloboda",            "novinar, medij, cenzura, sloboda govora, portal, televizija"),
    ("top_etno",  "Etnopolitički narativ",       "Bošnjaci, Srbi, Hrvati, entitet, komemoracija, ratni zločini"),
    ("top_ener",  "Energetska politika",         "struja, gas, nafta, elektrana, obnovljivi, ugalj, ruska energija"),
    ("top_soci",  "Socijalna prava",             "zdravstvo, bolnica, penzija, socijalna pomoć, škola, siromašni"),
]

TOPIC_IDS   = [t[0] for t in TOPICS]
TOPIC_NAMES = {t[0]: t[1] for t in TOPICS}
EMOTIONS    = ["frustracija", "nada", "ljutnja", "strah", "cinizam",
               "optimizam", "rezignacija", "indignacija"]

# ─── PROMPTS ──────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = (
    "Ti si sistem za analizu medijskog diskursa na bosanskom/srpskom jeziku. "
    "Analiziraš tekstove i vraćaš ISKLJUČIVO validan JSON objekat — "
    "bez ikakvog drugog teksta, bez objašnjenja, bez markdown."
)

def _build_prompt(text: str) -> str:
    topic_list = "\n".join(
        f'  "{t[0]}": "{t[1]} — {t[2]}"' for t in TOPICS
    )
    return (
        "Analiziraj sljedeći medijski tekst i vrati JSON sa ovim poljima:\n\n"
        "{\n"
        f'  "topic_id": "<jedan od: {", ".join(TOPIC_IDS)}>,\n'
        '  "sentiment": <float -1.0 do 1.0>,\n'
        f'  "emotion": "<jedna od: {", ".join(EMOTIONS)}>,\n'
        '  "confidence": <float 0.0 do 1.0>,\n'
        '  "intensity": <float 0.0 do 1.0>\n'
        "}\n\n"
        f"Dostupne teme:\n{topic_list}\n\n"
        f'Tekst:\n"""{text[:700]}"""\n\n'
        "Vrati SAMO JSON."
    )

# ─── JSON PARSER ──────────────────────────────────────────────────────────────

def _parse_and_validate(raw: str) -> Optional[dict]:
    raw = raw.strip()
    # Pull out the first JSON object even if there's surrounding text
    match = re.search(r"\{[^{}]+\}", raw, re.DOTALL)
    if match:
        raw = match.group(0)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None

    if data.get("topic_id") not in TOPIC_IDS:
        return None

    return {
        "topic_id":   data["topic_id"],
        "sentiment":  max(-1.0, min(1.0,  float(data.get("sentiment",  0.0)))),
        "emotion":    data["emotion"] if data.get("emotion") in EMOTIONS else "cinizam",
        "confidence": max(0.0,  min(1.0,  float(data.get("confidence", 0.5)))),
        "intensity":  max(0.0,  min(1.0,  float(data.get("intensity",  0.5)))),
    }

# ─── KEYWORD FALLBACK (no API key) ────────────────────────────────────────────

def _keyword_fallback(text: str) -> dict:
    t = text.lower()
    scores = {
        tid: sum(1 for kw in kws.split(", ") if kw.lower() in t)
        for tid, _, kws in TOPICS
    }
    best = max(scores, key=scores.get)
    neg = sum(1 for w in ["kriza","korupcija","blokada","inflacija","odlazak",
                           "protest","hapšenje","prijetnja","nestabilnost"] if w in t)
    pos = sum(1 for w in ["napredak","rast","investicija","reforma","sporazum",
                           "završen","otvoren","kandidatski","poboljšanje"] if w in t)
    s = max(-0.9, min(0.9, (pos - neg) * 0.2))
    return {
        "topic_id":   best,
        "sentiment":  s,
        "emotion":    "cinizam" if s < -0.3 else "nada" if s > 0.3 else "rezignacija",
        "confidence": min(0.55, 0.2 + scores[best] * 0.1),
        "intensity":  min(0.75, 0.3 + scores[best] * 0.1),
    }

# ─── ENGINE ───────────────────────────────────────────────────────────────────

class TopicEngine:

    def __init__(self, db_path: str = "narrative_analytics.duckdb"):
        self.db_path = db_path
        self._client = None  # lazy-init Anthropic client

    # ── Public status ──────────────────────────────────────────────────────

    def backend_status(self) -> dict:
        key = os.environ.get("ANTHROPIC_API_KEY", "")
        if key:
            return {
                "available": True,
                "name":      "Anthropic API",
                "model":     MODEL,
                "key_set":   True,
            }
        return {
            "available": False,
            "name":      "Keyword fallback (no API key)",
            "model":     "—",
            "key_set":   False,
        }

    def set_api_key(self, key: str):
        """Set or update the API key at runtime."""
        os.environ["ANTHROPIC_API_KEY"] = key.strip()
        self._client = None  # reset client so it picks up new key

    # ── Classification ─────────────────────────────────────────────────────

    def _get_client(self):
        if self._client is None:
            from anthropic import Anthropic
            self._client = Anthropic()
        return self._client

    def _classify(self, text: str) -> dict:
        """Classify one text. Falls back to keywords if API unavailable."""
        if not os.environ.get("ANTHROPIC_API_KEY"):
            return _keyword_fallback(text)

        try:
            client = self._get_client()
            resp   = client.messages.create(
                model=MODEL,
                max_tokens=256,
                temperature=0.1,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": _build_prompt(text)}],
            )
            result = _parse_and_validate(resp.content[0].text)
            if result:
                return result
            logger.warning("[Engine] Bad JSON from API — using keyword fallback")
            return _keyword_fallback(text)

        except Exception as e:
            logger.error(f"[Engine] Anthropic API error: {e}")
            return _keyword_fallback(text)

    # ── Batch processing ───────────────────────────────────────────────────

    def process_batch(self, batch_size: int = 20) -> dict:
        """Classify up to batch_size unprocessed samples. Returns stats dict."""
        con = self._get_connection()
        rows = con.execute("""
            SELECT sample_id, raw_text, source_id, published_at
            FROM   text_samples
            WHERE  is_processed = FALSE
            ORDER  BY ingested_at DESC
            LIMIT  ?
        """, [batch_size]).fetchall()

        if not rows:
            con.close()
            return {"processed": 0, "failed": 0, "total_remaining": 0}

        processed = failed = 0

        for sample_id, text, source_id, published_at in rows:
            try:
                result    = self._classify(text)
                snap_date = published_at.date() if published_at else dt_date.today()

                con.execute("""
                    INSERT INTO topic_assignments
                        (assignment_id, sample_id, topic_id, confidence)
                    VALUES (?, ?, ?, ?)
                """, (str(uuid.uuid4()), sample_id,
                      result["topic_id"], result["confidence"]))

                con.execute(
                    "UPDATE text_samples SET is_processed = TRUE WHERE sample_id = ?",
                    [sample_id],
                )

                self._upsert_snapshot(con, result, source_id, snap_date)
                processed += 1

                # ~4 req/s to stay well inside Haiku rate limits
                time.sleep(0.25)

            except Exception as e:
                logger.error(f"[Engine] Failed on {sample_id}: {e}")
                failed += 1

        remaining = con.execute(
            "SELECT COUNT(*) FROM text_samples WHERE is_processed = FALSE"
        ).fetchone()[0]

        con.close()
        logger.info(
            f"[Engine] Processed: {processed} | Failed: {failed} | Remaining: {remaining}"
        )
        return {"processed": processed, "failed": failed, "total_remaining": remaining}

    def _upsert_snapshot(self, con, result: dict, source_id: str, snap_date):
        """Rolling-average upsert into sentiment_snapshots."""
        existing = con.execute("""
            SELECT snapshot_id, sentiment_score, intensity, sample_count
            FROM   sentiment_snapshots
            WHERE  topic_id = ? AND source_id = ? AND snapshot_date = ?
        """, [result["topic_id"], source_id, snap_date]).fetchone()

        if existing:
            snap_id, old_s, old_i, old_n = existing
            n = old_n + 1
            con.execute("""
                UPDATE sentiment_snapshots
                SET    sentiment_score   = ?,
                       intensity         = ?,
                       sample_count      = ?,
                       dominant_emotion  = ?
                WHERE  snapshot_id = ?
            """, [
                (old_s * old_n + result["sentiment"]) / n,
                (old_i * old_n + result["intensity"])  / n,
                n,
                result["emotion"],
                snap_id,
            ])
        else:
            con.execute("""
                INSERT INTO sentiment_snapshots
                    (snapshot_id, topic_id, source_id, snapshot_date,
                     sentiment_score, intensity, sample_count, dominant_emotion)
                VALUES (?, ?, ?, ?, ?, ?, 1, ?)
            """, [
                str(uuid.uuid4()), result["topic_id"], source_id, snap_date,
                result["sentiment"], result["intensity"], result["emotion"],
            ])

    def get_queue_depth(self) -> int:
        try:
            con = self._get_connection()
            n   = con.execute(
                "SELECT COUNT(*) FROM text_samples WHERE is_processed = FALSE"
            ).fetchone()[0]
            con.close()
            return n
        except Exception:
            return 0

    def _get_connection(self):
        import duckdb
        return duckdb.connect(self.db_path)


# ─── Singleton ────────────────────────────────────────────────────────────────

_engine: Optional[TopicEngine] = None

def get_engine(db_path: str = "narrative_analytics.duckdb") -> TopicEngine:
    global _engine
    if _engine is None:
        _engine = TopicEngine(db_path)
    return _engine


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    engine = get_engine()
    print("Backend:", engine.backend_status())
    stats = engine.process_batch(batch_size=5)
    print(f"Processed: {stats['processed']} | Remaining: {stats['total_remaining']}")
