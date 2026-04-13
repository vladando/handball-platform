"""
collector.py — RSS ingestion module.
Pulls real article text from Balkan news portals into text_samples.
No author metadata stored — title + body text only.

Updated with Fake User-Agent to bypass bot detection.
"""

import uuid
import time
import re
import logging
import requests
from datetime import datetime
from typing import Optional

# Pokušaj uvoza zavisnosti, loguj grešku ako nedostaju
try:
    import feedparser
    from fake_useragent import UserAgent
except ImportError as e:
    logging.error(f"Missing dependency: {e}. Run: pip install feedparser fake-useragent requests")

logger = logging.getLogger("collector")

# ─── FEED REGISTRY ────────────────────────────────────────────────────────────
# Verified working feeds only. Each entry: (source_id, display_name, url)

RSS_FEEDS = [
    # Bosnia & Herzegovina
    ("src_04", "Klix.ba",           "https://www.klix.ba"),
    ("src_06", "N1 Info BiH",       "https://n1info.ba"),
    ("src_05", "Vijesti.ba",        "https://www.vijesti.ba"),

    # Serbia
    ("src_08", "N1 Srbija",         "https://n1info.rs"),
    ("src_09", "Blic.rs",           "https://www.blic.rs"),
    ("src_09", "B92",               "https://www.b92.net"),

    # Regional / international
    ("src_07", "BIRN",              "https://balkaninsight.com"),
    ("src_07", "Euractiv Srbija",   "https://euractiv.rs"),
]

# ─── COLLECTOR CLASS ──────────────────────────────────────────────────────────

class Collector:
    def __init__(self, db_path: str = "narrative_analytics.duckdb"):
        self.db_path = db_path
        try:
            self.ua = UserAgent()
        except Exception:
            self.ua = None

    def _get_connection(self):
        import duckdb
        return duckdb.connect(self.db_path)

    def _strip_html(self, text: str) -> str:
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"&[a-z]+;", " ", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def _entry_to_text(self, entry) -> Optional[str]:
        """Extract best available text from a feed entry."""
        parts = []

        title = self._strip_html(entry.get("title", ""))
        if title:
            parts.append(title)

        content = ""
        if hasattr(entry, "content") and entry.content:
            content = entry.content[0].get("value", "")
        if not content:
            content = entry.get("summary", "")
        if not content:
            content = entry.get("description", "")
        
        if content:
            parts.append(self._strip_html(content))

        result = " ".join(parts)
        return result if len(result.split()) >= 10 else None

    def _entry_date(self, entry) -> datetime:
        try:
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                return datetime(*entry.published_parsed[:6])
        except Exception:
            pass
        return datetime.now()

    def collect_rss(self) -> dict:
        """Pull all RSS feeds using requests + headers and insert new samples."""
        con = self._get_connection()
        inserted = 0
        skipped = 0
        errors = 0
        ok_feeds = []
        bad_feeds = []

        for source_id, source_name, url in RSS_FEEDS:
            try:
                logger.info(f"[RSS] Fetching {source_name} via Requests...")
                
                # Generisanje zaglavlja da izgledamo kao pravi browser
                headers = {
                    'User-Agent': self.ua.random if self.ua else 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                }

                # Prvo povlačimo sirov sadržaj preko requests
                resp = requests.get(url, headers=headers, timeout=15)
                
                if resp.status_code != 200:
                    logger.error(f"[RSS] HTTP Error {resp.status_code} for {source_name}")
                    bad_feeds.append(source_name)
                    errors += 1
                    continue

                # Ubacujemo sadržaj u feedparser
                feed = feedparser.parse(resp.content)

                if not feed.entries:
                    logger.warning(f"[RSS] No entries found after parsing {source_name}")
                    bad_feeds.append(source_name)
                    errors += 1
                    continue

                count_in_feed = 0
                for entry in feed.entries:
                    text = self._entry_to_text(entry)
                    if not text:
                        skipped += 1
                        continue

                    pub_date = self._entry_date(entry)
                    # Koristimo hash teksta kao ID da sprečimo duplikate pri ponovnom pokretanju
                    sample_id = f"rss_{hash(text[:100])}_{pub_date.strftime('%Y%m%d')}"

                    try:
                        con.execute("""
                            INSERT INTO text_samples 
                                (sample_id, source_id, ingested_at, published_at, raw_text, word_count, is_processed)
                            VALUES (?, ?, ?, ?, ?, ?, FALSE)
                        """, (sample_id, source_id, datetime.now(), pub_date, text, len(text.split())))
                        inserted += 1
                        count_in_feed += 1
                    except Exception:
                        skipped += 1 # Verovatno duplikat

                ok_feeds.append(f"{source_name} ({count_in_feed} new)")
                time.sleep(1.2) # Malo veća pauza radi sigurnosti

            except Exception as e:
                logger.error(f"[RSS] Fatal error fetching {source_name}: {e}")
                bad_feeds.append(source_name)
                errors += 1

        con.close()

        if ok_feeds:
            logger.info(f"[RSS] OK: {', '.join(ok_feeds)}")
        if bad_feeds:
            logger.warning(f"[RSS] FAILED: {', '.join(bad_feeds)}")
            
        return {
            "inserted": inserted,
            "skipped": skipped,
            "errors": errors,
            "ok_feeds": ok_feeds,
            "bad_feeds": bad_feeds,
        }

    def get_unprocessed_count(self) -> int:
        try:
            con = self._get_connection()
            n = con.execute("SELECT COUNT(*) FROM text_samples WHERE is_processed = FALSE").fetchone()[0]
            con.close()
            return n
        except Exception: return 0

    def get_total_count(self) -> int:
        try:
            con = self._get_connection()
            n = con.execute("SELECT COUNT(*) FROM text_samples").fetchone()[0]
            con.close()
            return n
        except Exception: return 0

# ─── Singleton ────────────────────────────────────────────────────────────────

_collector = None

def get_collector(db_path: str = "narrative_analytics.duckdb") -> Collector:
    global _collector
    if _collector is None:
        _collector = Collector(db_path)
    return _collector

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    c = get_collector()
    stats = c.collect_rss()
    print(f"\nInserted : {stats['inserted']}")
    print(f"Skipped  : {stats['skipped']}")
    print(f"Errors   : {stats['errors']}")