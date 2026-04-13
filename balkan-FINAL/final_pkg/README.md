# Balkanski Narrativni Analitičar
### Aggregate Public Discourse Analytics · Balkan Media Space

---

## What This Is

A **topic-centric** narrative analytics platform for studying how themes evolve
in the Balkan media landscape. All analysis is **aggregate** — the unit of
analysis is a **topic cluster**, not an individual.

No individual tracking. No user profiling. No identity resolution.

---

## Architecture

```
balkan-narrative-analytics/
├── database.py        # DuckDB schema — topic-centric data model
├── simulate_data.py   # 180-day realistic simulation data generator
├── analytics.py       # Aggregation queries and computation layer
├── app.py             # Streamlit dashboard (6 views)
├── requirements.txt
└── run.sh             # One-command setup + launch
```

### Database Schema (DuckDB)

```
sources              → Media portals and forums tracked
text_samples         → Raw text samples (topic-assigned, not author-tagged)
topics               → 10 thematic clusters
topic_assignments    → Sample → topic mapping with confidence
sentiment_snapshots  → Daily aggregate sentiment per topic per source
topic_relations      → Co-occurrence / precedence / opposition links
narrative_events     → Annotated spikes and shifts
trend_metrics        → Velocity and acceleration of topic momentum
```

### Topics Modeled (10 clusters)

| ID          | Topic (BS/SR)               | Description                        |
|-------------|-----------------------------|------------------------------------|
| top_econ    | Ekonomska Nestabilnost      | Inflation, wages, energy costs     |
| top_poli    | Politička Polarizacija      | Inter-entity relations, parties    |
| top_euro    | EU Integracije              | EU accession path                  |
| top_dijk    | Dijaspora i Odljev Mozgova  | Youth emigration, brain drain      |
| top_infra   | Infrastruktura i Razvoj     | Roads, energy infrastructure       |
| top_korr    | Korupcija i Vladavina Prava | Anti-corruption, judiciary         |
| top_medi    | Medijska Sloboda            | Press freedom, media ownership     |
| top_etno    | Etnopolitički Narativ       | Identity politics, historical      |
| top_ener    | Energetska Politika         | Gas, renewables, energy mix        |
| top_soci    | Socijalna Prava             | Healthcare, pensions, welfare      |

### Sources Simulated (10 outlets)

Nezavisne Novine · Glas Srpske · RTRS Portal · Klix.ba · Vijesti.ba ·
N1 Info BiH · Slobodna Bosna · Forum Republika · Diskusija.ba · Hayat Portal

---

## Dashboard Views

1. **Pregled** — KPI overview, sentiment trend, bubble chart, event feed
2. **Trendovi** — Multi-topic time-series, volume stacking, statistics table
3. **Mreža Narativa** — Force-directed topic co-occurrence network graph
4. **Toplinska Mapa** — Source × topic intensity and sentiment heatmaps
5. **Istraživač Tema** — Deep-dive single topic: timeline, events, related topics
6. **Hronologija** — Annotated narrative events timeline with magnitude chart

---

## Quick Start

```bash
cd balkan-narrative-analytics
chmod +x run.sh
./run.sh
```

Then open **http://localhost:8501**

---

## Extending With Real Data

To ingest real text samples, add a collector module that:
1. Inserts rows into `text_samples` (text + source_id + timestamp only)
2. Runs topic assignment (BERTopic or zero-shot with `facebook/bart-large-mnli`)
3. Computes daily aggregate `sentiment_snapshots` using `cardiffnlp/twitter-xlm-roberta-base-sentiment`

No author metadata. No cross-platform identity. Topics only.

---

## Design Principles

- **Aggregate by default** — every query groups by topic, never by author
- **No identity fields** — schema has no user_id, author, or handle columns
- **Ethically reviewable** — architecture would pass university ethics board review
- **Local deployment** — DuckDB + Streamlit, no external services required
