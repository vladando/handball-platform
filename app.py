"""
Balkanski Narrativni Analitičar — Streamlit Dashboard
Aggregate discourse analytics for Balkan media landscape.
Topic-centric. No individual user tracking.
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import networkx as nx
import numpy as np
from datetime import date, timedelta
import os

from analytics import (
    get_topic_summary,
    get_sentiment_timeseries,
    get_source_heatmap,
    get_topic_network,
    get_narrative_events,
    get_topic_detail,
    get_weekly_digest,
)

# ─── DATABASE INIT ────────────────────────────────────────────────────────────
# Ensures schema + tables exist before any query runs.
# Safe to call multiple times — uses CREATE TABLE IF NOT EXISTS.
from database import initialize_database
initialize_database()

# ─── PIPELINE STARTUP ─────────────────────────────────────────────────────────
try:
    from scheduler import ensure_scheduler_running, pipeline_status, get_scheduler
    _PIPELINE_AVAILABLE = True
    if "scheduler_started" not in st.session_state:
        ensure_scheduler_running()
        st.session_state["scheduler_started"] = True
except ImportError:
    _PIPELINE_AVAILABLE = False

# ─── PAGE CONFIG ──────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Narrativni Analitičar · Balkanski Medijski Prostor",
    page_icon="🔍",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─── THEME & CSS ──────────────────────────────────────────────────────────────

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&family=Inter:wght@300;400;500&display=swap');

:root {
    --bg-primary:   #0A0C10;
    --bg-secondary: #0F1218;
    --bg-card:      #141820;
    --bg-hover:     #1A2030;
    --border:       #1E2535;
    --border-light: #252D40;
    --text-primary: #E8EDF5;
    --text-secondary: #8A9BBF;
    --text-muted:   #4A5570;
    --accent-blue:  #3B7FF5;
    --accent-cyan:  #26C6DA;
    --accent-green: #2EC972;
    --accent-red:   #E05252;
    --accent-amber: #F5A623;
    --accent-purple:#8B5CF6;
}

html, body, [class*="css"] {
    font-family: 'Inter', sans-serif;
    background-color: var(--bg-primary);
    color: var(--text-primary);
}

/* Streamlit chrome overrides */
.stApp { background-color: var(--bg-primary); }
.css-1d391kg, [data-testid="stSidebar"] {
    background-color: var(--bg-secondary) !important;
    border-right: 1px solid var(--border) !important;
}
[data-testid="stSidebar"] .css-17lntkn { color: var(--text-primary); }

/* Hide Streamlit branding */
#MainMenu, footer, header { visibility: hidden; }
.stDeployButton { display: none; }

/* Top masthead */
.masthead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.2rem 0 1rem 0;
    border-bottom: 1px solid var(--border);
    margin-bottom: 1.6rem;
}
.masthead-title {
    font-family: 'Syne', sans-serif;
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    line-height: 1;
}
.masthead-sub {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.65rem;
    color: var(--text-muted);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-top: 0.3rem;
}
.masthead-badge {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.65rem;
    background: rgba(46, 201, 114, 0.1);
    border: 1px solid rgba(46, 201, 114, 0.3);
    color: var(--accent-green);
    padding: 0.25rem 0.6rem;
    border-radius: 2px;
    letter-spacing: 0.1em;
}

/* KPI cards */
.kpi-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.75rem;
    margin-bottom: 1.6rem;
}
.kpi-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 1rem 1.1rem;
    position: relative;
    overflow: hidden;
}
.kpi-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: var(--accent-color, var(--accent-blue));
}
.kpi-label {
    font-size: 0.6rem;
    font-family: 'JetBrains Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
    margin-bottom: 0.4rem;
}
.kpi-value {
    font-family: 'Syne', sans-serif;
    font-size: 1.6rem;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1;
}
.kpi-sub {
    font-size: 0.65rem;
    color: var(--text-secondary);
    margin-top: 0.3rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* Section headers */
.section-header {
    font-family: 'Syne', sans-serif;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border);
    padding-bottom: 0.5rem;
    margin-bottom: 1rem;
}

/* Topic pill */
.topic-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.2rem 0.6rem;
    border-radius: 2px;
    font-size: 0.65rem;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 500;
}

/* Event card */
.event-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent-color, var(--accent-blue));
    border-radius: 3px;
    padding: 0.7rem 0.9rem;
    margin-bottom: 0.5rem;
}
.event-date {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.6rem;
    color: var(--text-muted);
}
.event-title {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--text-primary);
    margin: 0.15rem 0;
}
.event-desc {
    font-size: 0.7rem;
    color: var(--text-secondary);
    line-height: 1.5;
}

/* Chart containers */
.chart-container {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 1rem;
}

/* Topic detail card */
.topic-detail-header {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    margin-bottom: 1rem;
}
.topic-color-dot {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    flex-shrink: 0;
}

/* Sidebar nav items */
.nav-item {
    font-size: 0.75rem;
    padding: 0.4rem 0.6rem;
    color: var(--text-secondary);
    cursor: pointer;
}
.nav-item:hover { color: var(--text-primary); }

/* Plotly overrides for dark bg */
.js-plotly-plot .plotly .modebar {
    background: transparent !important;
}
</style>
""", unsafe_allow_html=True)

# ─── PLOTLY BASE TEMPLATE ─────────────────────────────────────────────────────

PLOT_LAYOUT = dict(
    paper_bgcolor="#141820",
    plot_bgcolor="#141820",
    font=dict(family="Inter, sans-serif", color="#8A9BBF", size=11),
    margin=dict(l=12, r=12, t=28, b=12),
    legend=dict(
        bgcolor="rgba(0,0,0,0)",
        bordercolor="#1E2535",
        borderwidth=1,
        font=dict(size=10),
    ),
    hovermode="x unified",
)

# Default axis styling applied via update_xaxes / update_yaxes after each fig
_AX = dict(gridcolor="#1E2535", linecolor="#1E2535", tickfont=dict(size=10))


def _ax(**overrides):
    """Return base axis style merged with any overrides."""
    return {**_AX, **overrides}



def apply_base_layout(fig):
    fig.update_layout(**PLOT_LAYOUT)
    return fig


def plot_layout(**extra):
    """Return PLOT_LAYOUT merged with extra kwargs, resolving axis conflicts."""
    layout = dict(**PLOT_LAYOUT)
    # Remove axis keys from base — caller sets them via update_xaxes/update_yaxes
    layout.pop("xaxis", None)
    layout.pop("yaxis", None)
    layout.update(extra)
    return layout


# ─── SIDEBAR ──────────────────────────────────────────────────────────────────

with st.sidebar:
    st.markdown("""
    <div style="padding: 0.5rem 0 1rem 0; border-bottom: 1px solid #1E2535; margin-bottom: 1rem;">
        <div style="font-family: 'Syne', sans-serif; font-size: 1rem; font-weight: 700; color: #E8EDF5;">
            🔍 Narrativni<br>Analitičar
        </div>
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.55rem;
                    color: #4A5570; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 0.3rem;">
            Balkanski Medijski Prostor v1.0
        </div>
    </div>
    """, unsafe_allow_html=True)

    page = st.radio(
        "Navigacija",
        ["📊  Pregled", "📈  Trendovi", "🌐  Mreža Narativa", "🗺️  Toplinska Mapa", "🔎  Istraživač Tema", "📅  Hronologija", "📡  Pipeline"],
        label_visibility="collapsed",
    )
    page = page.split("  ")[1].strip()

    st.markdown("---")
    st.markdown('<div class="section-header">Filteri</div>', unsafe_allow_html=True)

    days_filter = st.select_slider(
        "Vremenski Raspon",
        options=[7, 14, 30, 60, 90, 180],
        value=90,
        format_func=lambda x: f"{x} dana",
    )

    # Topic multiselect
    topic_df = get_topic_summary()
    all_topics = dict(zip(topic_df["topic_label"], topic_df["topic_id"]))
    selected_topic_labels = st.multiselect(
        "Teme",
        options=list(all_topics.keys()),
        default=list(all_topics.keys())[:6],
        placeholder="Sve teme...",
    )
    selected_topic_ids = [all_topics[l] for l in selected_topic_labels] if selected_topic_labels else None

    st.markdown("---")

    # ── Pipeline Control Panel ──────────────────────────────────────────────
    if _PIPELINE_AVAILABLE:
        st.markdown('<div class="section-header">Pipeline · Prikupljanje</div>', unsafe_allow_html=True)
        ps = pipeline_status.get()

        # Backend status badge
        backend_color = "#2EC972" if ps["backend_available"] else "#E05252"
        backend_label = ps["backend_name"]
        st.markdown(f"""
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.6rem;
                    color: #4A5570; margin-bottom: 0.5rem;">
            LLM: <span style="color:{backend_color};">● {backend_label}</span> · claude-haiku<br>
            Red čekanja: <span style="color: #F5A623;">{ps['queue_depth']}</span> uzoraka<br>
            Prikupljeno: <span style="color: #E8EDF5;">{ps['total_collected']}</span> ukupno<br>
            Obrađeno:   <span style="color: #E8EDF5;">{ps['total_processed']}</span> ukupno
        </div>
        """, unsafe_allow_html=True)

        col_a, col_b = st.columns(2)
        sched = get_scheduler()
        with col_a:
            if st.button("▶ RSS", width='stretch', help="Pokretanje RSS prikupljanja odmah"):
                sched.trigger_collection_now()
                st.toast("RSS prikupljanje pokrenuto!", icon="📡")
        with col_b:
            if st.button("⚙ Obradi", width='stretch', help="Obrada reda čekanja odmah"):
                sched.trigger_processing_now(batch_size=30)
                st.toast("Obrada pokrenuta!", icon="⚙️")

        # Last run times
        if ps["last_collection"]:
            st.caption(f"Zadnji RSS: {ps['last_collection']}")
        if ps["last_processing"]:
            st.caption(f"Zadnja obrada: {ps['last_processing']}")
        if ps["last_error"]:
            st.caption(f"⚠ {ps['last_error'][:50]}")

    st.markdown("---")
    st.markdown(f"""
    <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.6rem; color: #4A5570;">
        BAZA: narrative_analytics.duckdb<br>
        DATUM: {date.today().strftime('%d.%m.%Y')}<br>
        STATUS: <span style="color: #2EC972;">● AKTIVAN</span>
    </div>
    """, unsafe_allow_html=True)


# ─── LOAD DATA ────────────────────────────────────────────────────────────────

@st.cache_data(ttl=300)
def load_summary():       return get_topic_summary()
@st.cache_data(ttl=300)
def load_timeseries(ids, days): return get_sentiment_timeseries(ids, days)
@st.cache_data(ttl=300)
def load_heatmap(days):   return get_source_heatmap(days)
@st.cache_data(ttl=300)
def load_network():       return get_topic_network()
@st.cache_data(ttl=300)
def load_events(days):    return get_narrative_events(days)
@st.cache_data(ttl=300)
def load_digest():        return get_weekly_digest()


summary_df = load_summary()
ts_df      = load_timeseries(selected_topic_ids, days_filter)
hm_df      = load_heatmap(days_filter)
nodes_df, edges_df = load_network()
events_df  = load_events(days_filter)
digest     = load_digest()


# ─────────────────────────────────────────────────────────────────────────────
# PAGE: PREGLED (Overview)
# ─────────────────────────────────────────────────────────────────────────────

if page == "Pregled":

    st.markdown(f"""
    <div class="masthead">
        <div>
            <div class="masthead-title">Balkanski Narrativni Analitičar</div>
            <div class="masthead-sub">Agregirana analiza diskursa · Medijski prostor BiH/RS · {date.today().strftime('%d %B %Y')}</div>
        </div>
        <div class="masthead-badge">● LIVE</div>
    </div>
    """, unsafe_allow_html=True)

    # ── KPI Row ──
    kpi_data = [
        ("UKUPNI VOLUMEN", f"{digest['total_volume']:,}".replace(",", "."),
         f"Uzorci teksta · 7 dana", "#3B7FF5"),
        ("PROSJ. SENTIMENT", f"{digest['avg_sentiment']:+.3f}",
         "Raspon: -1.0 (neg) do +1.0 (poz)", "#E05252" if digest['avg_sentiment'] < 0 else "#2EC972"),
        ("AKTIVNI IZVORI", str(digest['active_sources']),
         "Portali, mediji, forumi", "#26C6DA"),
        ("AKTIVNIH TEMA", str(len(summary_df)),
         "Tematski klasteri", "#F5A623"),
        ("NAJ. AKTIVAN",   digest['most_active'],
         "Po volumenu u 7 dana", "#8B5CF6"),
        ("NAJ. NEGATIVAN", digest['most_negative'],
         "Najniži sentiment", "#E05252"),
    ]

    cols = st.columns(6)
    for i, (label, val, sub, color) in enumerate(kpi_data):
        with cols[i]:
            st.markdown(f"""
            <div class="kpi-card" style="--accent-color: {color};">
                <div class="kpi-label">{label}</div>
                <div class="kpi-value" style="color: {color};">{val}</div>
                <div class="kpi-sub">{sub}</div>
            </div>
            """, unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # ── Row 1: Sentiment Overview + Bubble Chart ──
    col_left, col_right = st.columns([3, 2])

    with col_left:
        st.markdown('<div class="section-header">Sentimentalni Trendovi · Posljednjih 30 Dana</div>', unsafe_allow_html=True)
        ts30 = load_timeseries(None, 30)
        if not ts30.empty:
            fig = go.Figure()
            for topic_id, grp in ts30.groupby("topic_id"):
                row = summary_df[summary_df["topic_id"] == topic_id]
                color = row["color_hex"].iloc[0] if not row.empty else "#4A90D9"
                label = row["topic_label"].iloc[0] if not row.empty else topic_id
                fig.add_trace(go.Scatter(
                    x=grp["date"], y=grp["sentiment"],
                    name=label, line=dict(color=color, width=1.5),
                    mode="lines",
                    hovertemplate=f"<b>{label}</b><br>%{{x|%d.%m}}: %{{y:.3f}}<extra></extra>",
                ))
            fig.add_hline(y=0, line_dash="dot", line_color="#2A3045", line_width=1)
            fig.update_layout(**plot_layout(height=300))
            fig.update_yaxes(range=[-1, 1], gridcolor="#1E2535", linecolor="#1E2535", zeroline=False)
            st.plotly_chart(fig, width='stretch', config={"displayModeBar": False})

    with col_right:
        st.markdown('<div class="section-header">Trenutna Stanja Tema</div>', unsafe_allow_html=True)
        if not summary_df.empty:
            fig_bubble = go.Figure()
            for _, row in summary_df.iterrows():
                fig_bubble.add_trace(go.Scatter(
                    x=[row["sentiment"]],
                    y=[row["intensity"]],
                    mode="markers+text",
                    marker=dict(
                        size=row["volume"] / summary_df["volume"].max() * 50 + 12,
                        color=row["color_hex"],
                        opacity=0.85,
                        line=dict(color="rgba(255,255,255,0.1)", width=1),
                    ),
                    text=[row["topic_label"].split()[0]],
                    textposition="middle center",
                    textfont=dict(size=8, color="white"),
                    name=row["topic_label"],
                    hovertemplate=(
                        f"<b>{row['topic_label']}</b><br>"
                        f"Sentiment: {row['sentiment']:.3f}<br>"
                        f"Intenzitet: {row['intensity']:.2f}<br>"
                        f"Volumen: {int(row['volume'])}<extra></extra>"
                    ),
                    showlegend=False,
                ))
            fig_bubble.add_vline(x=0, line_dash="dot", line_color="#2A3045", line_width=1)
            fig_bubble.update_layout(**plot_layout(height=300))
            fig_bubble.update_xaxes(title="Sentiment →", range=[-1.1, 1.1], gridcolor="#1E2535", linecolor="#1E2535")
            fig_bubble.update_yaxes(title="Intenzitet →", range=[0, 1.1], gridcolor="#1E2535", linecolor="#1E2535")
            st.plotly_chart(fig_bubble, width='stretch', config={"displayModeBar": False})

    # ── Row 2: Topic Bars + Recent Events ──
    col_a, col_b = st.columns([2, 3])

    with col_a:
        st.markdown('<div class="section-header">Rang Tema po Volumenu</div>', unsafe_allow_html=True)
        sorted_df = summary_df.sort_values("volume", ascending=True)
        fig_bar = go.Figure(go.Bar(
            x=sorted_df["volume"],
            y=sorted_df["topic_label"],
            orientation="h",
            marker=dict(color=sorted_df["color_hex"], opacity=0.85),
            hovertemplate="<b>%{y}</b><br>Volumen: %{x}<extra></extra>",
        ))
        fig_bar.update_layout(**plot_layout(height=350))
        fig_bar.update_xaxes(title="Uzorci", gridcolor="#1E2535")
        fig_bar.update_yaxes(gridcolor="rgba(0,0,0,0)")
        st.plotly_chart(fig_bar, width='stretch', config={"displayModeBar": False})

    with col_b:
        st.markdown('<div class="section-header">Nedavni Narativni Događaji</div>', unsafe_allow_html=True)
        if not events_df.empty:
            for _, ev in events_df.head(6).iterrows():
                color = ev.get("color_hex", "#3B7FF5")
                ev_type_badge = {
                    "spike": "▲ SKOK",
                    "emergence": "◆ POJAVA",
                    "shift": "→ POMAK",
                    "fade": "▼ SLABI",
                }.get(ev.get("event_type", ""), "● EVENT")
                st.markdown(f"""
                <div class="event-card" style="--accent-color: {color};">
                    <div class="event-date">
                        {str(ev['event_date'])[:10]} ·
                        <span style="color: {color};">{ev_type_badge}</span> ·
                        {ev.get('topic_label','—')}
                    </div>
                    <div class="event-title">{ev['event_label']}</div>
                    <div class="event-desc">{ev.get('description','')}</div>
                </div>
                """, unsafe_allow_html=True)


# ─────────────────────────────────────────────────────────────────────────────
# PAGE: TRENDOVI
# ─────────────────────────────────────────────────────────────────────────────

elif page == "Trendovi":

    st.markdown(f'<div class="section-header">Analiza Trendova · Zadnjih {days_filter} Dana</div>', unsafe_allow_html=True)

    if ts_df.empty:
        st.warning("Nema podataka za odabrani filter.")
    else:
        # Sentiment timeline
        fig_ts = go.Figure()
        for topic_id, grp in ts_df.groupby("topic_id"):
            row = summary_df[summary_df["topic_id"] == topic_id]
            color = row["color_hex"].iloc[0] if not row.empty else "#4A90D9"
            label = row["topic_label"].iloc[0] if not row.empty else topic_id
            fig_ts.add_trace(go.Scatter(
                x=grp["date"], y=grp["sentiment"],
                name=label, line=dict(color=color, width=2),
                fill="tozeroy",
                fillcolor=color.replace("#", "rgba(").replace(")", "") + "15)" if color.startswith("#") else color,
                mode="lines",
                hovertemplate=f"<b>{label}</b><br>%{{x|%d.%m.%Y}}: %{{y:.3f}}<extra></extra>",
            ))

        # Add event markers
        if not events_df.empty:
            for _, ev in events_df.iterrows():
                fig_ts.add_vline(
                    x=str(ev["event_date"]),
                    line_dash="dot",
                    line_color="rgba(255,255,255,0.12)",
                    line_width=1,
                )

        fig_ts.add_hline(y=0, line_dash="dot", line_color="#2A3045", line_width=1)
        fig_ts.update_layout(
            **plot_layout(
                height=380,
                title=dict(text="Sentiment Kroz Vrijeme", font=dict(family="Syne", size=13, color="#8A9BBF")),
            )
        )
        fig_ts.update_yaxes(range=[-1, 1], gridcolor="#1E2535", linecolor="#1E2535")
        st.plotly_chart(fig_ts, width='stretch', config={"displayModeBar": False})

        # Volume timeline
        col1, col2 = st.columns(2)

        with col1:
            st.markdown('<div class="section-header">Volumen Po Temi</div>', unsafe_allow_html=True)
            fig_vol = go.Figure()
            for topic_id, grp in ts_df.groupby("topic_id"):
                row = summary_df[summary_df["topic_id"] == topic_id]
                color = row["color_hex"].iloc[0] if not row.empty else "#4A90D9"
                label = row["topic_label"].iloc[0] if not row.empty else topic_id
                weekly = grp.set_index("date")["volume"].resample("W").sum().reset_index()
                fig_vol.add_trace(go.Bar(
                    x=weekly["date"], y=weekly["volume"],
                    name=label, marker_color=color, opacity=0.8,
                    hovertemplate=f"<b>{label}</b><br>%{{x|%d.%m}}: %{{y}} uzoraka<extra></extra>",
                ))
            fig_vol.update_layout(**plot_layout(barmode="stack", height=320))
            fig_vol.update_xaxes(gridcolor="#1E2535")
            fig_vol.update_yaxes(gridcolor="#1E2535")
            st.plotly_chart(fig_vol, width='stretch', config={"displayModeBar": False})

        with col2:
            st.markdown('<div class="section-header">Intenzitet Diskursa</div>', unsafe_allow_html=True)
            fig_int = go.Figure()
            for topic_id, grp in ts_df.groupby("topic_id"):
                row = summary_df[summary_df["topic_id"] == topic_id]
                color = row["color_hex"].iloc[0] if not row.empty else "#4A90D9"
                label = row["topic_label"].iloc[0] if not row.empty else topic_id
                fig_int.add_trace(go.Scatter(
                    x=grp["date"], y=grp["intensity"],
                    name=label, line=dict(color=color, width=1.5),
                    mode="lines",
                    hovertemplate=f"<b>{label}</b><br>%{{x|%d.%m}}: %{{y:.2f}}<extra></extra>",
                ))
            fig_int.update_layout(**plot_layout(height=320))
            fig_int.update_yaxes(range=[0, 1.1], gridcolor="#1E2535")
            st.plotly_chart(fig_int, width='stretch', config={"displayModeBar": False})

        # Moving averages table
        st.markdown('<div class="section-header">Statistički Sažetak Po Temi</div>', unsafe_allow_html=True)
        stats = ts_df.groupby("topic_id").agg(
            Sentiment_Avg=("sentiment", "mean"),
            Sentiment_Min=("sentiment", "min"),
            Sentiment_Max=("sentiment", "max"),
            Intenzitet_Avg=("intensity", "mean"),
            Volumen_Ukupno=("volume", "sum"),
        ).round(3)
        stats = stats.merge(summary_df[["topic_id", "topic_label", "color_hex"]],
                            left_index=True, right_on="topic_id")
        stats = stats.set_index("topic_label").drop(columns=["topic_id", "color_hex"])
        st.dataframe(
            stats.style
                .background_gradient(subset=["Sentiment_Avg"], cmap="RdYlGn", vmin=-1, vmax=1)
                .background_gradient(subset=["Intenzitet_Avg"], cmap="Blues", vmin=0, vmax=1)
                .format("{:.3f}", subset=["Sentiment_Avg", "Sentiment_Min", "Sentiment_Max", "Intenzitet_Avg"])
                .format("{:,.0f}", subset=["Volumen_Ukupno"]),
            width='stretch',
        )


# ─────────────────────────────────────────────────────────────────────────────
# PAGE: MREŽA NARATIVA
# ─────────────────────────────────────────────────────────────────────────────

elif page == "Mreža Narativa":

    st.markdown('<div class="section-header">Graf Ko-Pojavnosti Narativnih Tema</div>', unsafe_allow_html=True)
    st.caption("Debljina linka = snaga veze | Veličina čvora = prosječni intenzitet | Boja = tematski klaster")

    if not nodes_df.empty and not edges_df.empty:
        G = nx.Graph()
        for _, n in nodes_df.iterrows():
            G.add_node(n["id"], label=n["label"], color=n["color_hex"],
                       size=n["size"], sentiment=n["sentiment"])
        for _, e in edges_df.iterrows():
            G.add_edge(e["source"], e["target"],
                       weight=e["weight"], relation=e["relation_type"])

        # Spring layout
        pos = nx.spring_layout(G, k=2.5, iterations=60, seed=42)

        edge_traces = []
        for u, v, data in G.edges(data=True):
            x0, y0 = pos[u]
            x1, y1 = pos[v]
            color_map = {"co-occurs": "#3B7FF5", "precedes": "#F5A623", "opposes": "#E05252"}
            color = color_map.get(data.get("relation", "co-occurs"), "#3B7FF5")
            width = data.get("weight", 0.5) * 5
            edge_traces.append(go.Scatter(
                x=[x0, x1, None], y=[y0, y1, None],
                mode="lines",
                line=dict(width=width, color=color.replace("#", "rgba(").replace(")", "") + "70)"
                          if color.startswith("#") else color),
                hoverinfo="none", showlegend=False,
            ))

        node_x, node_y, node_colors, node_sizes, node_labels, hover_texts = [], [], [], [], [], []
        for node_id in G.nodes:
            x, y = pos[node_id]
            data = G.nodes[node_id]
            node_x.append(x); node_y.append(y)
            node_colors.append(data.get("color", "#4A90D9"))
            node_sizes.append(data.get("size", 0.5) * 60 + 20)
            node_labels.append(data.get("label", node_id))
            hover_texts.append(
                f"<b>{data.get('label', node_id)}</b><br>"
                f"Intenzitet: {data.get('size', 0):.2f}<br>"
                f"Sentiment: {data.get('sentiment', 0):.3f}"
            )

        node_trace = go.Scatter(
            x=node_x, y=node_y,
            mode="markers+text",
            hoverinfo="text",
            hovertext=hover_texts,
            text=node_labels,
            textposition="top center",
            textfont=dict(size=9, color="#C8D4E8"),
            marker=dict(
                color=node_colors, size=node_sizes,
                line=dict(color="rgba(255,255,255,0.15)", width=1.5),
                opacity=0.9,
            ),
            showlegend=False,
        )

        fig_net = go.Figure(
            data=edge_traces + [node_trace],
            layout=go.Layout(
                paper_bgcolor="#141820", plot_bgcolor="#141820",
                xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                margin=dict(l=0, r=0, t=20, b=0),
                height=520,
                hovermode="closest",
                font=dict(color="#8A9BBF"),
                legend=dict(
                    bgcolor="rgba(0,0,0,0)",
                    bordercolor="#1E2535",
                    borderwidth=1,
                    font=dict(size=10),
                ),
            )
        )

        # Legend annotations
        for relation, color, label in [
            ("co-occurs", "#3B7FF5", "Ko-pojavljuje se"),
            ("precedes",  "#F5A623", "Prethodi"),
            ("opposes",   "#E05252", "Suprotstavlja se"),
        ]:
            fig_net.add_annotation(
                x=0, y=0, xref="paper", yref="paper",
                text="", showarrow=False,
            )

        st.plotly_chart(fig_net, width='stretch', config={"displayModeBar": False})

        # Edge table
        col_l, col_r = st.columns(2)
        with col_l:
            st.markdown('<div class="section-header">Najjače Veze</div>', unsafe_allow_html=True)
            edge_display = edges_df.copy()
            edge_display = edge_display.merge(
                nodes_df[["id", "label"]].rename(columns={"id": "source", "label": "Tema A"}),
                on="source"
            ).merge(
                nodes_df[["id", "label"]].rename(columns={"id": "target", "label": "Tema B"}),
                on="target"
            )[["Tema A", "Tema B", "relation_type", "weight"]].sort_values("weight", ascending=False)
            edge_display.columns = ["Tema A", "Tema B", "Tip Veze", "Snaga"]
            st.dataframe(edge_display.style.format({"Snaga": "{:.2f}"}), width='stretch', height=280)
        with col_r:
            st.markdown('<div class="section-header">Centralne Teme (Po Stupnju)</div>', unsafe_allow_html=True)
            degrees = dict(G.degree())
            deg_df = pd.DataFrame(list(degrees.items()), columns=["id", "stupanj"])
            deg_df = deg_df.merge(nodes_df[["id", "label"]], on="id")
            deg_df = deg_df.sort_values("stupanj", ascending=False)[["label", "stupanj"]]
            deg_df.columns = ["Tema", "Broj Veza"]
            st.dataframe(deg_df, width='stretch', height=280)


# ─────────────────────────────────────────────────────────────────────────────
# PAGE: TOPLINSKA MAPA
# ─────────────────────────────────────────────────────────────────────────────

elif page == "Toplinska Mapa":

    st.markdown(f'<div class="section-header">Toplinska Mapa Diskursa · Zadnjih {days_filter} Dana</div>', unsafe_allow_html=True)

    if not hm_df.empty:
        col1, col2 = st.columns(2)

        with col1:
            st.markdown('<div class="section-header">Intenzitet Po Izvoru × Temi</div>', unsafe_allow_html=True)
            pivot_int = hm_df.pivot_table(
                index="topic", columns="source", values="intensity", aggfunc="mean"
            ).fillna(0)
            fig_hm = go.Figure(go.Heatmap(
                z=pivot_int.values,
                x=pivot_int.columns.tolist(),
                y=pivot_int.index.tolist(),
                colorscale=[
                    [0.0, "#0A0C10"],
                    [0.3, "#0F2040"],
                    [0.6, "#1A4080"],
                    [0.8, "#2A70C0"],
                    [1.0, "#3B7FF5"],
                ],
                hoverongaps=False,
                hovertemplate="<b>%{y}</b><br>%{x}<br>Intenzitet: %{z:.2f}<extra></extra>",
                showscale=True,
                colorbar=dict(thickness=12, len=0.8, tickfont=dict(size=9)),
            ))
            fig_hm.update_layout(**plot_layout(height=400))
            fig_hm.update_xaxes(tickangle=-45, tickfont=dict(size=8))
            fig_hm.update_yaxes(tickfont=dict(size=9))
            st.plotly_chart(fig_hm, width='stretch', config={"displayModeBar": False})

        with col2:
            st.markdown('<div class="section-header">Sentiment Po Izvoru × Temi</div>', unsafe_allow_html=True)
            pivot_sent = hm_df.pivot_table(
                index="topic", columns="source", values="sentiment", aggfunc="mean"
            ).fillna(0)
            fig_hm2 = go.Figure(go.Heatmap(
                z=pivot_sent.values,
                x=pivot_sent.columns.tolist(),
                y=pivot_sent.index.tolist(),
                colorscale=[
                    [0.0, "#8B0000"],
                    [0.35, "#E05252"],
                    [0.5, "#1A2030"],
                    [0.65, "#2EC972"],
                    [1.0, "#007A3D"],
                ],
                zmid=0,
                hoverongaps=False,
                hovertemplate="<b>%{y}</b><br>%{x}<br>Sentiment: %{z:.3f}<extra></extra>",
                showscale=True,
                colorbar=dict(thickness=12, len=0.8, tickfont=dict(size=9)),
            ))
            fig_hm2.update_layout(**plot_layout(height=400))
            fig_hm2.update_xaxes(tickangle=-45, tickfont=dict(size=8))
            fig_hm2.update_yaxes(tickfont=dict(size=9))
            st.plotly_chart(fig_hm2, width='stretch', config={"displayModeBar": False})

        # Region comparison
        st.markdown('<div class="section-header">Regionalna Usporedba Intenziteta</div>', unsafe_allow_html=True)
        region_df = hm_df.groupby(["region", "topic"]).agg(intensity=("intensity", "mean")).reset_index()
        fig_region = px.bar(
            region_df, x="topic", y="intensity", color="region",
            barmode="group",
            color_discrete_map={
                "Republika Srpska": "#5C8EE0",
                "BiH": "#E0B45C",
                "FBiH": "#5CE09C",
            },
        )
        fig_region.update_layout(**plot_layout(
            height=320,
            legend=dict(orientation="h", yanchor="bottom", y=1.02)
        ))
        fig_region.update_xaxes(tickangle=-30, gridcolor="#1E2535")
        fig_region.update_yaxes(gridcolor="#1E2535")
        fig_region.update_traces(marker_opacity=0.85)
        st.plotly_chart(fig_region, width='stretch', config={"displayModeBar": False})


# ─────────────────────────────────────────────────────────────────────────────
# PAGE: ISTRAŽIVAČ TEMA (Topic Explorer)
# ─────────────────────────────────────────────────────────────────────────────

elif page == "Istraživač Tema":

    st.markdown('<div class="section-header">Istraživač Narativnih Tema</div>', unsafe_allow_html=True)

    topic_options = dict(zip(summary_df["topic_label"], summary_df["topic_id"]))
    chosen_label = st.selectbox("Odaberi temu za detaljnu analizu:", list(topic_options.keys()))
    chosen_id = topic_options[chosen_label]

    detail = get_topic_detail(chosen_id)

    if detail:
        topic_color = detail["color"]
        row = summary_df[summary_df["topic_id"] == chosen_id].iloc[0]

        # Header band
        st.markdown(f"""
        <div style="background: linear-gradient(135deg, {topic_color}15 0%, #141820 60%);
                    border: 1px solid {topic_color}40; border-radius: 6px;
                    padding: 1.2rem 1.5rem; margin-bottom: 1.2rem;">
            <div style="display: flex; align-items: center; gap: 0.8rem; margin-bottom: 0.4rem;">
                <div style="width: 14px; height: 14px; border-radius: 3px;
                            background: {topic_color}; flex-shrink: 0;"></div>
                <div style="font-family: 'Syne', sans-serif; font-size: 1.3rem;
                            font-weight: 700; color: #E8EDF5;">{detail['label']}</div>
            </div>
            <div style="font-size: 0.8rem; color: #8A9BBF; max-width: 700px;">{detail['description']}</div>
            <div style="display: flex; gap: 1.5rem; margin-top: 0.8rem;">
                <div>
                    <span style="font-family: 'JetBrains Mono', monospace; font-size: 0.6rem;
                                 color: #4A5570; text-transform: uppercase; letter-spacing: 0.1em;">Sentiment (7d)</span>
                    <div style="font-family: 'Syne', sans-serif; font-size: 1.2rem; font-weight: 700;
                                color: {'#E05252' if row['sentiment'] < 0 else '#2EC972'};">
                        {row['sentiment']:+.3f}
                    </div>
                </div>
                <div>
                    <span style="font-family: 'JetBrains Mono', monospace; font-size: 0.6rem;
                                 color: #4A5570; text-transform: uppercase; letter-spacing: 0.1em;">Intenzitet</span>
                    <div style="font-family: 'Syne', sans-serif; font-size: 1.2rem; font-weight: 700;
                                color: {topic_color};">{row['intensity']:.2f}</div>
                </div>
                <div>
                    <span style="font-family: 'JetBrains Mono', monospace; font-size: 0.6rem;
                                 color: #4A5570; text-transform: uppercase; letter-spacing: 0.1em;">Volumen (7d)</span>
                    <div style="font-family: 'Syne', sans-serif; font-size: 1.2rem; font-weight: 700;
                                color: #E8EDF5;">{int(row['volume']):,}</div>
                </div>
                <div>
                    <span style="font-family: 'JetBrains Mono', monospace; font-size: 0.6rem;
                                 color: #4A5570; text-transform: uppercase; letter-spacing: 0.1em;">Emocija</span>
                    <div style="font-family: 'Syne', sans-serif; font-size: 1.2rem; font-weight: 700;
                                color: #F5A623;">{row['top_emotion']}</div>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

        # Sentiment + intensity over time
        ts_detail = detail["timeseries"]
        if not ts_detail.empty:
            fig_d = make_subplots(rows=2, cols=1, shared_xaxes=True,
                                  row_heights=[0.65, 0.35], vertical_spacing=0.04)
            fig_d.add_trace(go.Scatter(
                x=ts_detail["date"], y=ts_detail["sentiment"],
                name="Sentiment", line=dict(color=topic_color, width=2),
                fill="tozeroy",
                fillcolor=topic_color + "20",
            ), row=1, col=1)
            fig_d.add_trace(go.Bar(
                x=ts_detail["date"], y=ts_detail["volume"],
                name="Volumen", marker_color=topic_color, opacity=0.5,
            ), row=2, col=1)
            fig_d.add_hline(y=0, line_dash="dot", line_color="#2A3045", row=1, col=1)

            # Event markers
            if not detail["events"].empty:
                for _, ev in detail["events"].iterrows():
                    fig_d.add_vline(
                        x=str(ev["event_date"]), line_dash="dot",
                        line_color="rgba(245,166,35,0.3)", line_width=1.5,
                    )

            layout_d = plot_layout(height=380, margin=dict(l=12, r=12, t=20, b=12))
            fig_d.update_layout(**layout_d)
            fig_d.update_yaxes(gridcolor="#1E2535", row=1, col=1)
            fig_d.update_yaxes(gridcolor="#1E2535", row=2, col=1)
            st.plotly_chart(fig_d, width='stretch', config={"displayModeBar": False})

        # Related topics + sources + events
        col_rel, col_src, col_ev = st.columns(3)

        with col_rel:
            st.markdown('<div class="section-header">Povezane Teme</div>', unsafe_allow_html=True)
            if not detail["related"].empty:
                for _, r in detail["related"].iterrows():
                    type_color = {"co-occurs": "#3B7FF5", "precedes": "#F5A623", "opposes": "#E05252"}.get(r["relation_type"], "#8A9BBF")
                    st.markdown(f"""
                    <div style="padding: 0.5rem 0.7rem; background: #141820; border: 1px solid #1E2535;
                                border-left: 3px solid {type_color}; border-radius: 3px; margin-bottom: 0.4rem;">
                        <div style="font-size: 0.75rem; color: #E8EDF5; font-weight: 500;">{r['related_label']}</div>
                        <div style="font-size: 0.6rem; color: {type_color}; font-family: 'JetBrains Mono', monospace;">
                            {r['relation_type']} · snaga {r['strength']:.2f}
                        </div>
                    </div>
                    """, unsafe_allow_html=True)

        with col_src:
            st.markdown('<div class="section-header">Ključni Izvori</div>', unsafe_allow_html=True)
            if not detail["sources"].empty:
                for _, s in detail["sources"].iterrows():
                    pct = int(s["avg_intensity"] * 100)
                    st.markdown(f"""
                    <div style="padding: 0.5rem 0.7rem; background: #141820; border: 1px solid #1E2535;
                                border-radius: 3px; margin-bottom: 0.4rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="font-size: 0.75rem; color: #E8EDF5;">{s['source_name']}</div>
                            <div style="font-size: 0.6rem; color: {topic_color};">{pct}%</div>
                        </div>
                        <div style="background: #1E2535; height: 3px; border-radius: 2px; margin-top: 0.3rem;">
                            <div style="background: {topic_color}; width: {pct}%; height: 100%; border-radius: 2px;"></div>
                        </div>
                        <div style="font-size: 0.6rem; color: #4A5570; margin-top: 0.2rem;">{s['region']}</div>
                    </div>
                    """, unsafe_allow_html=True)

        with col_ev:
            st.markdown('<div class="section-header">Narativni Događaji</div>', unsafe_allow_html=True)
            if not detail["events"].empty:
                for _, ev in detail["events"].head(5).iterrows():
                    magnitude_pct = int(ev.get("magnitude", 0.5) * 100)
                    st.markdown(f"""
                    <div style="padding: 0.5rem 0.7rem; background: #141820; border: 1px solid #1E2535;
                                border-radius: 3px; margin-bottom: 0.4rem;">
                        <div style="font-size: 0.6rem; color: #4A5570; font-family: 'JetBrains Mono', monospace;">
                            {str(ev['event_date'])[:10]} · {ev.get('event_type','').upper()}
                        </div>
                        <div style="font-size: 0.72rem; color: #E8EDF5; margin: 0.15rem 0;">{ev['event_label']}</div>
                        <div style="font-size: 0.6rem; color: #F5A623;">▲ Magnituda: {magnitude_pct}%</div>
                    </div>
                    """, unsafe_allow_html=True)


# ─────────────────────────────────────────────────────────────────────────────
# PAGE: HRONOLOGIJA
# ─────────────────────────────────────────────────────────────────────────────

elif page == "Hronologija":

    st.markdown('<div class="section-header">Hronologija Narativnih Događaja</div>', unsafe_allow_html=True)

    if not events_df.empty:
        # Magnitude chart
        fig_ev = go.Figure()
        type_colors = {"spike": "#E05252", "emergence": "#2EC972", "shift": "#F5A623", "fade": "#8A9BBF"}
        for ev_type, grp in events_df.groupby("event_type"):
            color = type_colors.get(ev_type, "#3B7FF5")
            fig_ev.add_trace(go.Scatter(
                x=grp["event_date"],
                y=grp["magnitude"],
                mode="markers+text",
                marker=dict(size=grp["magnitude"] * 28 + 8, color=color, opacity=0.8,
                            line=dict(color="rgba(255,255,255,0.2)", width=1)),
                text=grp["event_label"].str[:30] + "...",
                textposition="top center",
                textfont=dict(size=8),
                name=ev_type.upper(),
                hovertemplate="<b>%{text}</b><br>%{x|%d.%m.%Y}<br>Magnituda: %{y:.2f}<extra></extra>",
            ))
        fig_ev.update_layout(**plot_layout(height=340))
        fig_ev.update_yaxes(title="Magnituda", range=[0, 1.2], gridcolor="#1E2535")
        fig_ev.update_xaxes(gridcolor="#1E2535")
        st.plotly_chart(fig_ev, width='stretch', config={"displayModeBar": False})

        # Event list
        st.markdown('<div class="section-header">Svi Događaji</div>', unsafe_allow_html=True)
        type_labels = {"spike": "▲ SKOK", "emergence": "◆ POJAVA", "shift": "→ POMAK", "fade": "▼ SLABI"}
        for _, ev in events_df.sort_values("event_date", ascending=False).iterrows():
            color = ev.get("color_hex", "#3B7FF5")
            type_badge = type_labels.get(ev.get("event_type", ""), "● DOGAĐAJ")
            st.markdown(f"""
            <div class="event-card" style="--accent-color: {color};">
                <div class="event-date">
                    {str(ev['event_date'])[:10]} ·
                    <span style="color: {color};">{type_badge}</span> ·
                    <span style="color: #8A9BBF;">{ev.get('topic_label','—')}</span> ·
                    Magnituda: <span style="color: #F5A623;">{ev.get('magnitude', 0):.0%}</span>
                </div>
                <div class="event-title">{ev['event_label']}</div>
                <div class="event-desc">{ev.get('description','')}</div>
            </div>
            """, unsafe_allow_html=True)

    else:
        st.info("Nema događaja za odabrani period.")


# ─────────────────────────────────────────────────────────────────────────────
# PAGE: PIPELINE
# ─────────────────────────────────────────────────────────────────────────────

elif page == "Pipeline":

    st.markdown('<div class="section-header">Pipeline · Status & Kontrola</div>', unsafe_allow_html=True)

    if not _PIPELINE_AVAILABLE:
        st.error("Scheduler module nije dostupan. Provjeri da li je scheduler.py u istom folderu.")
    else:
        ps    = pipeline_status.get()
        sched = get_scheduler()

        # ── KPI row ──────────────────────────────────────────────────────────
        c1, c2, c3, c4, c5 = st.columns(5)
        kpis = [
            (c1, "STATUS",        "● AKTIVAN" if ps["running"] else "● STOPPED",
             "#2EC972" if ps["running"] else "#E05252"),
            (c2, "LLM BACKEND",   ps["backend_name"],
             "#2EC972" if ps["backend_available"] else "#E05252"),
            (c3, "RED ČEKANJA",   str(ps["queue_depth"]),   "#F5A623"),
            (c4, "PRIKUPLJENO",   f"{ps['total_collected']:,}".replace(",", "."), "#3B7FF5"),
            (c5, "OBRAĐENO",      f"{ps['total_processed']:,}".replace(",", "."), "#2EC972"),
        ]
        for col, label, val, color in kpis:
            with col:
                st.markdown(f"""
                <div class="kpi-card" style="--accent-color:{color};">
                    <div class="kpi-label">{label}</div>
                    <div class="kpi-value" style="color:{color}; font-size:1.1rem;">{val}</div>
                </div>
                """, unsafe_allow_html=True)

        st.markdown("<br>", unsafe_allow_html=True)

        # ── Manual controls ───────────────────────────────────────────────────
        col_ctrl, col_cfg = st.columns([2, 3])

        with col_ctrl:
            st.markdown('<div class="section-header">Ručno Pokretanje</div>', unsafe_allow_html=True)

            if st.button("📡  Pokreni RSS prikupljanje", width='stretch'):
                sched.trigger_collection_now()
                st.success("RSS prikupljanje pokrenuto u pozadini.")

            batch_size = st.slider("Veličina serije za obradu", 5, 100, 25, 5)
            if st.button("⚙️  Obrada LLM klasifikacijom", width='stretch'):
                sched.trigger_processing_now(batch_size=batch_size)
                st.success(f"Obrada pokrenuta (serija: {batch_size}).")

            st.markdown("---")
            if st.button("🔄  Osvježi cache podataka", width='stretch'):
                st.cache_data.clear()
                st.success("Cache obrisan — podaci će se osvježiti.")

        with col_cfg:
            st.markdown('<div class="section-header">Konfiguracija</div>', unsafe_allow_html=True)

            st.markdown("""
            <div style="background:#141820; border:1px solid #1E2535; border-radius:4px;
                        padding:1rem; font-family:'JetBrains Mono',monospace; font-size:0.7rem;
                        color:#8A9BBF; line-height:1.8;">
                <span style="color:#4A5570;">## Intervali (scheduler.py)</span><br>
                COLLECTION_INTERVAL  = 3600   <span style="color:#4A5570;"># 1 sat</span><br>
                PROCESSING_INTERVAL  = 300    <span style="color:#4A5570;"># 5 minuta</span><br><br>
                <span style="color:#4A5570;">## LLM Backend</span><br>
                Model: claude-haiku-4-5-20251001<br>
                ~4 req/s · ~$0.001 per 100 članaka<br><br>
                <span style="color:#4A5570;">## Postavljanje API ključa</span><br>
                <span style="color:#2EC972;">set ANTHROPIC_API_KEY=sk-ant-...</span><br>
                ili unesi ključ ispod u polje
            </div>
            """, unsafe_allow_html=True)

            # Anthropic API key input
            st.markdown("<br>", unsafe_allow_html=True)
            api_key = st.text_input(
                "Anthropic API Key (opcionalno)",
                type="password",
                placeholder="sk-ant-...",
                help="Dobij ključ na console.anthropic.com"
            )
            if api_key:
                import os as _os
                _os.environ["ANTHROPIC_API_KEY"] = api_key
                # Reset engine singleton so it picks up the new key
                import topic_engine as _te
                _te._engine = None
                st.success("API key postavljen. Backend će se reinicijalizirati pri sljedećoj obradi.")

        # ── RSS feed status ───────────────────────────────────────────────────
        st.markdown('<div class="section-header">RSS Kanali</div>', unsafe_allow_html=True)
        from collector import RSS_FEEDS
        feed_data = []
        for src_id, name, url in RSS_FEEDS:
            feed_data.append({
                "Izvor": name,
                "URL":   url,
                "Entitet": src_id,
            })
        st.dataframe(
            pd.DataFrame(feed_data),
            width='stretch',
            hide_index=True,
            height=240,
        )

        # ── Activity log ──────────────────────────────────────────────────────
        st.markdown('<div class="section-header">Dnevnik Aktivnosti</div>', unsafe_allow_html=True)
        log_lines = ps.get("log", [])
        if log_lines:
            log_html = "".join(
                f'<div style="font-family:\'JetBrains Mono\',monospace; font-size:0.65rem; '
                f'color:#{"2EC972" if "done" in l.lower() or "ok" in l.lower() else "E05252" if "error" in l.lower() else "8A9BBF"}; '
                f'padding:0.15rem 0; border-bottom:1px solid #1A2030;">{l}</div>'
                for l in log_lines
            )
            st.markdown(f"""
            <div style="background:#0F1218; border:1px solid #1E2535; border-radius:4px;
                        padding:0.8rem; max-height:320px; overflow-y:auto;">
                {log_html}
            </div>
            """, unsafe_allow_html=True)
        else:
            st.caption("Nema zapisa još — pokreni RSS prikupljanje.")

        # Auto-refresh every 15s on pipeline page
        st.markdown("""
        <script>
            setTimeout(function() { window.location.reload(); }, 15000);
        </script>
        """, unsafe_allow_html=True)
