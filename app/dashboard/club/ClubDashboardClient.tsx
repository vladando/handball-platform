"use client";
// app/dashboard/club/ClubDashboardClient.tsx
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

function ClubDeleteButton() {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  async function del() {
    setDeleting(true);
    const res = await fetch("/api/club/account", { method: "DELETE" });
    if (res.ok) window.location.href = "/";
    setDeleting(false);
  }
  if (!confirm) return (
    <button className="btn btn-danger" onClick={() => setConfirm(true)}>🗑 Delete Club Account</button>
  );
  return (
    <div style={{ padding: 14, background: "rgba(255,59,59,0.06)", borderRadius: "var(--radius)", border: "1px solid rgba(255,59,59,0.2)" }}>
      <p style={{ fontSize: "0.85rem", color: "var(--white)", marginBottom: 12, fontWeight: 600 }}>Are you absolutely sure?</p>
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-danger" disabled={deleting} style={{ justifyContent: "center" }} onClick={del}>
          {deleting ? <><span className="spinner" /> Deleting…</> : "Yes, delete permanently"}
        </button>
        <button className="btn btn-outline" onClick={() => setConfirm(false)}>Cancel</button>
      </div>
    </div>
  );
}

const POS_SHORT: Record<string, string> = {
  GOALKEEPER: "GK", LEFT_BACK: "LB", RIGHT_BACK: "RB",
  LEFT_WING: "LW", RIGHT_WING: "RW", CENTRE_BACK: "CB",
  PIVOT: "PV", CENTRE_FORWARD: "CF",
};
const STATUS_COLORS: Record<string, string> = {
  PENDING: "badge-accent", INVOICED: "badge-blue",
  PAID: "badge-green", DISPUTED: "badge-red", WAIVED: "badge-muted",
};

function SettingsForm({ club }: { club: any }) {
  const [form, setForm] = useState({
    name: club.name ?? "", country: club.country ?? "", city: club.city ?? "",
    address: club.address ?? "", leagueName: club.leagueName ?? "",
    website: club.website ?? "", contactPhone: club.contactPhone ?? "",
    contactEmail: club.contactEmail ?? "", contactName: club.contactName ?? "",
    contactTitle: club.contactTitle ?? "", description: club.description ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); setSaved(false); }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/club/onboarding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) setSaved(true);
  }

  return (
    <div className="card">
      <h4 style={{ textTransform: "uppercase", marginBottom: 20 }}>Club Information</h4>
      <div className="grid-2" style={{ gap: 16, marginBottom: 16 }}>
        <div className="form-group" style={{ marginBottom: 0 }}><label className="label">Club Name</label><input className="input" value={form.name} onChange={e => setF("name", e.target.value)} /></div>
        <div className="form-group" style={{ marginBottom: 0 }}><label className="label">Country</label><input className="input" value={form.country} onChange={e => setF("country", e.target.value)} /></div>
        <div className="form-group" style={{ marginBottom: 0 }}><label className="label">City</label><input className="input" value={form.city} onChange={e => setF("city", e.target.value)} /></div>
        <div className="form-group" style={{ marginBottom: 0 }}><label className="label">Address</label><input className="input" value={form.address} onChange={e => setF("address", e.target.value)} /></div>
        <div className="form-group" style={{ marginBottom: 0 }}><label className="label">League</label><input className="input" value={form.leagueName} onChange={e => setF("leagueName", e.target.value)} /></div>
        <div className="form-group" style={{ marginBottom: 0 }}><label className="label">Website</label><input className="input" value={form.website} onChange={e => setF("website", e.target.value)} /></div>
        <div className="form-group" style={{ marginBottom: 0 }}><label className="label">Contact Phone</label><input className="input" value={form.contactPhone} onChange={e => setF("contactPhone", e.target.value)} /></div>
        <div className="form-group" style={{ marginBottom: 0 }}><label className="label">Contact Email</label><input className="input" value={form.contactEmail} onChange={e => setF("contactEmail", e.target.value)} /></div>
        <div className="form-group" style={{ marginBottom: 0 }}><label className="label">Representative Name</label><input className="input" value={form.contactName} onChange={e => setF("contactName", e.target.value)} /></div>
        <div className="form-group" style={{ marginBottom: 0 }}><label className="label">Representative Title</label><input className="input" value={form.contactTitle} onChange={e => setF("contactTitle", e.target.value)} /></div>
      </div>
      <div className="form-group" style={{ marginBottom: 20 }}>
        <label className="label">Club Description</label>
        <textarea className="input" rows={4} value={form.description} onChange={e => setF("description", e.target.value)} style={{ resize: "vertical" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? <><span className="spinner" /> Saving…</> : "Save Changes"}
        </button>
        {saved && <span style={{ fontSize: "0.85rem", color: "#00c864" }}>✓ Saved</span>}
      </div>
    </div>
  );
}

export default function ClubDashboardClient({ club, stats, paypalClientId }: { club: any; stats: any; paypalClientId: string }) {
  const isVerified = club.verificationStatus === "VERIFIED";
  const hasSubscription = club.subscriptionStatus === "ACTIVE";
  const canAccess = isVerified && hasSubscription;
  const [tab, setTab] = useState("overview");
  const [showCheckout, setShowCheckout] = useState(false);
  const [ppLoading, setPpLoading] = useState(false);
  const [ppError, setPpError] = useState<string | null>(null);
  const [ppSuccess, setPpSuccess] = useState(false);
  const ppButtonsRef = useRef<any>(null);

  function openCheckout() {
    setPpError(null);
    setPpSuccess(false);
    setShowCheckout(true);
  }

  // Load PayPal SDK and render buttons when modal opens
  useEffect(() => {
    if (!showCheckout || ppSuccess) return;

    function renderButtons() {
      const paypal = (window as any).paypal;
      if (!paypal) return;
      const container = document.getElementById("paypal-button-container");
      if (!container) return;
      if (ppButtonsRef.current) { try { ppButtonsRef.current.close(); } catch {} ppButtonsRef.current = null; }

      const buttons = paypal.Buttons({
        style: { layout: "vertical", color: "gold", shape: "rect", label: "pay" },
        createOrder: async () => {
          setPpLoading(true); setPpError(null);
          const res = await fetch("/api/club/paypal/create-order", { method: "POST" });
          const data = await res.json();
          setPpLoading(false);
          if (!res.ok) { setPpError(data.error || "Could not create order."); return null; }
          return data.orderId;
        },
        onApprove: async (data: any) => {
          setPpLoading(true); setPpError(null);
          const res = await fetch("/api/club/paypal/capture-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: data.orderID }),
          });
          const result = await res.json();
          setPpLoading(false);
          if (!res.ok) { setPpError(result.error || "Payment capture failed."); return; }
          setPpSuccess(true);
          setTimeout(() => window.location.reload(), 2500);
        },
        onError: () => { setPpError("Payment error. Please try again."); setPpLoading(false); },
        onCancel: () => { setPpError("Payment cancelled."); },
      });

      buttons.render("#paypal-button-container");
      ppButtonsRef.current = buttons;
    }

    const existingScript = document.getElementById("paypal-sdk-script");
    if ((window as any).paypal) {
      setTimeout(renderButtons, 50);
    } else if (!existingScript) {
      const script = document.createElement("script");
      script.id = "paypal-sdk-script";
      script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=EUR`;
      script.onload = () => setTimeout(renderButtons, 50);
      document.body.appendChild(script);
    } else {
      existingScript.addEventListener("load", () => setTimeout(renderButtons, 50));
    }

    return () => {
      if (ppButtonsRef.current) { try { ppButtonsRef.current.close(); } catch {} ppButtonsRef.current = null; }
    };
  }, [showCheckout, ppSuccess, paypalClientId]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [filters, setFilters] = useState({ q: "", position: "", nationality: "", minH: "", maxH: "", minSalary: "" });
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  function setF(k: string, v: string) { setFilters(f => ({ ...f, [k]: v })); }

  async function doSearch() {
    setSearchLoading(true);
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && p.set(k, v));
    const res = await fetch(`/api/players/search?${p}`);
    const data = await res.json();
    setSearchResults(data.players ?? []);
    setSearchLoading(false);
  }

  async function addToWatchlist(playerId: string) {
    await fetch("/api/watchlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ playerId }) });
  }

  async function saveNote(playerId: string) {
    const content = noteInputs[playerId];
    if (!content?.trim()) return;
    await fetch("/api/scouting-notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ playerId, content }) });
    setNoteInputs(n => ({ ...n, [playerId]: "" }));
  }

  const NAV_ITEMS = [
    { id: "overview",      label: "Overview",               icon: "⊞" },
    { id: "search",        label: "Player Search",          icon: "🔍" },
    { id: "watchlist",     label: `Watchlist (${stats.watchlist})`, icon: "★" },
    { id: "interactions",  label: `Interactions (${stats.reveals})`, icon: "📋" },
    { id: "messages",      label: "Messages",               icon: "💬" },
    { id: "settings",      label: "Settings",               icon: "⚙" },
  ];

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [langValue, setLangValue] = useState("en");

  // Load lang from localStorage after mount (avoids hydration mismatch)
  useEffect(() => {
    const stored = localStorage.getItem("hhLang");
    if (stored) setLangValue(stored);
  }, []);

  function selectTab(id: string) {
    setTab(id);
    setSidebarOpen(false);
  }

  return (
    <main className="page">
      <div className="sidebar-layout">
        {/* ── Sidebar overlay (mobile) ──────────────────────────── */}
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

        {/* ── Sidebar ──────────────────────────────────────── */}
        <aside className={`sidebar${sidebarOpen ? " is-open" : ""}`}>
          <div style={{ padding: "0 24px 20px", borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
            <div style={{ width: 48, height: 48, borderRadius: "var(--radius)", background: "var(--card2)", border: "2px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", marginBottom: 12, overflow: "hidden" }}>
              {club.logoUrl ? <img src={club.logoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : "🏟️"}
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", textTransform: "uppercase" }}>{club.name}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: 4 }}>{club.city}, {club.country}</div>
            <div style={{ marginTop: 8 }}>
              {club.verificationStatus === "VERIFIED"
                ? <span className="badge badge-green">✓ Verified</span>
                : <span className="badge badge-accent">Pending Verification</span>}
            </div>
          </div>
          <div className="sidebar-section">Navigation</div>
          <ul className="sidebar-nav">
            {NAV_ITEMS.map(item => (
              <li key={item.id}>
                <a
                  href="#"
                  className={tab === item.id ? "active" : ""}
                  onClick={e => { e.preventDefault(); selectTab(item.id); }}
                >
                  <span>{item.icon}</span> {item.label}
                </a>
              </li>
            ))}
          </ul>
          <div style={{ padding: "20px 24px", borderTop: "1px solid var(--border)", marginTop: "auto" }}>
            <Link href="/players" style={{ fontSize: "0.8rem", color: "var(--muted)", textDecoration: "none" }}>
              Browse Players →
            </Link>
          </div>
        </aside>

        {/* ── Main Content ─────────────────────────────────── */}
        <div className="main-content">
        <div>
          {/* Mobile menu toggle */}
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(o => !o)}>
            {sidebarOpen ? "✕ Close" : `☰ ${NAV_ITEMS.find(n => n.id === tab)?.label ?? "Menu"}`}
          </button>
          <div style={{ marginBottom: 32 }}>
            <div className="section-label">Club Dashboard</div>
            <h2>{club.name}</h2>
          </div>

      {/* ── Overview ──────────────────────────────────────────── */}
      {tab === "overview" && (
        <div>
          <div className="grid-3" style={{ marginBottom: 40 }}>
            {[
              { label: "Players on Watchlist", val: stats.watchlist, accent: true },
              { label: "Contacts Revealed", val: stats.reveals, accent: false },
              { label: "Pending Commission", val: stats.pending, accent: false },
            ].map(s => (
              <div key={s.label} className="card" style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "3rem", color: s.accent ? "var(--accent)" : "var(--white)", lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Subscription block */}
          {hasSubscription ? (
            <div className="card" style={{ marginBottom: 24, borderColor: "rgba(0,200,100,0.3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div className="section-label" style={{ marginBottom: 4 }}>Subscription</div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", textTransform: "uppercase", color: "var(--white)" }}>
                    Annual Plan — €1,000/year
                  </div>
                  {club.subscriptionEndsAt && (
                    <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: 4 }}>
                      Valid until {new Date(club.subscriptionEndsAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                  )}
                </div>
                <span className="badge badge-green" style={{ fontSize: "0.85rem", padding: "6px 14px" }}>✓ Active</span>
              </div>
            </div>
          ) : isVerified ? (
            /* Verified but no active subscription — show offer */
            <div className="card" style={{ marginBottom: 24, borderColor: "rgba(232,255,71,0.35)", background: "rgba(232,255,71,0.03)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div className="section-label" style={{ marginBottom: 4 }}>Subscription Required</div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.8rem", color: "var(--accent)", lineHeight: 1 }}>
                    €1,000 <span style={{ fontSize: "0.9rem", color: "var(--muted)", fontWeight: 400 }}>/year</span>
                  </div>
                </div>
                <span className="badge badge-muted" style={{ fontSize: "0.85rem", padding: "6px 14px" }}>Not Active</span>
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.8, marginBottom: 20 }}>
                Your club is verified. Subscribe to unlock full access to the player database and all platform features.
              </div>
              <div style={{ background: "var(--card2)", borderRadius: "var(--radius)", padding: "14px 18px", marginBottom: 20, fontSize: "0.83rem", color: "rgba(245,243,238,0.75)", lineHeight: 1.9 }}>
                ✓ Unlimited player search with advanced filters<br/>
                ✓ Reveal player contacts &amp; agent info<br/>
                ✓ Watchlist, scouting notes &amp; messaging<br/>
                ✓ Full transfer history &amp; interaction log
              </div>
              <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: "0.82rem", color: "var(--muted)", marginBottom: 16, lineHeight: 1.7 }}>
                💳 Secure payment via <strong style={{ color: "var(--white)" }}>Paddle</strong>. Pay by card — your subscription activates immediately after payment.
              </div>
              <button
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center", fontSize: "1rem" }}
                onClick={openCheckout}
              >
                💳 Subscribe Now — €1,000/year
              </button>
            </div>
          ) : (
            /* Not verified yet — show locked state */
            <div className="card" style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div className="section-label" style={{ marginBottom: 4 }}>Subscription</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Available after club verification</div>
                </div>
                <span className="badge badge-muted">Locked</span>
              </div>
            </div>
          )}

          {/* Recent reveals */}
          {club.interactions?.length > 0 && (
            <div>
              <h4 style={{ textTransform: "uppercase", marginBottom: 16 }}>Recent Reveals</h4>
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div className="table-wrap"><table className="table">
                  <thead><tr><th>Player</th><th>Revealed</th><th>Commission</th></tr></thead>
                  <tbody>
                    {club.interactions.slice(0, 5).map((i: any) => (
                      <tr key={i.id}>
                        <td>
                          <Link href={`/players/${i.player.slug}`} style={{ fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase", color: "var(--white)" }}>
                            {i.player.firstName} {i.player.lastName}
                          </Link>
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--muted)" }}>
                          {new Date(i.createdAt).toLocaleDateString()}
                        </td>
                        <td><span className={`badge ${STATUS_COLORS[i.commissionStatus]}`}>{i.commissionStatus}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Search ────────────────────────────────────────────── */}
      {tab === "search" && (
        <div>
          {!canAccess && (
            <div style={{ background: "rgba(232,255,71,0.06)", border: "1px solid rgba(232,255,71,0.25)", borderRadius: "var(--radius-lg)", padding: "24px", marginBottom: 20, textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🔒</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.95rem", textTransform: "uppercase", color: "var(--accent)", marginBottom: 8 }}>
                {!isVerified ? "Verification Required" : "Active Subscription Required"}
              </div>
              <div style={{ fontSize: "0.83rem", color: "var(--muted)", marginBottom: 16, lineHeight: 1.7 }}>
                {!isVerified
                  ? "Your club must be verified by an admin before you can search players."
                  : "Your club is verified! Subscribe for €1,000/year to unlock the full player database."}
              </div>
              <button className="btn btn-primary" onClick={() => setTab("overview")} style={{ fontSize: "0.85rem" }}>
                {!isVerified ? "Check Verification Status →" : "View Subscription Offer →"}
              </button>
            </div>
          )}
          {canAccess && (<>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="grid-3" style={{ marginBottom: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label">Search Name / Club</label>
                <input className="input" value={filters.q} onChange={e => setF("q", e.target.value)} placeholder="Ivan Petrović…" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label">Position</label>
                <select className="input" value={filters.position} onChange={e => setF("position", e.target.value)}>
                  <option value="">All Positions</option>
                  {["GOALKEEPER","LEFT_BACK","RIGHT_BACK","LEFT_WING","RIGHT_WING","CENTRE_BACK","PIVOT","CENTRE_FORWARD"].map(p => (
                    <option key={p} value={p}>{p.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label">Nationality</label>
                <input className="input" value={filters.nationality} onChange={e => setF("nationality", e.target.value)} placeholder="Germany…" />
              </div>
            </div>
            <div className="grid-3" style={{ marginBottom: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label">Min Height (cm)</label>
                <input className="input" type="number" value={filters.minH} onChange={e => setF("minH", e.target.value)} placeholder="180" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label">Max Height (cm)</label>
                <input className="input" type="number" value={filters.maxH} onChange={e => setF("maxH", e.target.value)} placeholder="210" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label">Max Salary (€/yr)</label>
                <input className="input" type="number" value={filters.minSalary} onChange={e => setF("minSalary", e.target.value)} placeholder="100000" />
              </div>
            </div>
            <button className="btn btn-primary" onClick={doSearch} disabled={searchLoading}>
              {searchLoading ? <><span className="spinner" /> Searching…</> : "Search Players"}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div style={{ position: "relative" }}>
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <table className="table">
                  <thead><tr><th>Player</th><th>Position</th><th>Nation</th><th>Height</th><th>Age</th><th>Salary</th><th>Actions</th></tr></thead>
                  <tbody>
                    {searchResults.map((p: any) => (
                      <tr key={p.id}>
                        <td>
                          <Link href={`/players/${p.slug}`} style={{ fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase" }}>
                            {p.firstName} {p.lastName}
                          </Link>
                          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{p.currentClub ?? "Free Agent"}</div>
                        </td>
                        <td><span className="pos-pill">{POS_SHORT[p.position]}</span></td>
                        <td style={{ fontSize: "0.85rem" }}>{p.nationality}</td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>{p.heightCm}cm</td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>{new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear()}</td>
                        <td>{p.expectedSalary ? <span className="badge badge-accent">€{Math.round(p.expectedSalary / 100).toLocaleString()}</span> : "—"}</td>
                        <td style={{ display: "flex", gap: 6 }}>
                          <Link href={`/players/${p.slug}`} className="btn btn-outline" style={{ fontSize: "0.75rem", padding: "5px 10px" }}>View</Link>
                          <button className="btn btn-ghost" style={{ fontSize: "0.75rem", padding: "5px 10px" }} onClick={() => addToWatchlist(p.id)}>★ Watch</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          </>)}
        </div>
      )}

      {/* ── Watchlist ─────────────────────────────────────────── */}
      {tab === "watchlist" && (
        <div>
          {club.watchlist?.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
              <div style={{ fontSize: "3rem", marginBottom: 16 }}>★</div>
              <p>No players on your watchlist yet.</p>
              <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setTab("search")}>Search Players</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {club.watchlist?.map((item: any) => (
                <div key={item.id} className="card" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <Link href={`/players/${item.player.slug}`} style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.15rem", textTransform: "uppercase" }}>
                        {item.player.firstName} {item.player.lastName}
                      </Link>
                      <span className="pos-pill">{POS_SHORT[item.player.position]}</span>
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 12 }}>
                      {item.player.nationality} · {item.player.currentClub ?? "Free Agent"} · {item.player.heightCm}cm
                    </div>
                    {/* Scouting note input */}
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        className="input"
                        placeholder="Add scouting note…"
                        value={noteInputs[item.player.id] ?? ""}
                        onChange={e => setNoteInputs(n => ({ ...n, [item.player.id]: e.target.value }))}
                        style={{ fontSize: "0.85rem" }}
                      />
                      <button className="btn btn-outline" style={{ fontSize: "0.8rem", padding: "8px 14px", flexShrink: 0 }} onClick={() => saveNote(item.player.id)}>
                        Save
                      </button>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--muted)", marginBottom: 8 }}>
                      Added {new Date(item.addedAt).toLocaleDateString()}
                    </div>
                    <Link href={`/players/${item.player.slug}`} className="btn btn-primary" style={{ fontSize: "0.8rem", padding: "8px 16px" }}>
                      View Profile →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Interactions ──────────────────────────────────────── */}
      {tab === "interactions" && (
        <div>
          <div style={{ marginBottom: 20, padding: "14px 20px", background: "rgba(232,255,71,0.05)", border: "1px solid rgba(232,255,71,0.15)", borderRadius: "var(--radius)", fontSize: "0.85rem", color: "rgba(245,243,238,0.7)" }}>
            ℹ Each row below represents a legally logged contact reveal. All activity is recorded and serves as a digital record.
          </div>
          {club.interactions?.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
              <p>No contacts revealed yet.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <table className="table">
                <thead><tr><th>Player</th><th>Revealed At</th><th>ToS Version</th><th>Commission Rate</th><th>Status</th></tr></thead>
                <tbody>
                  {club.interactions?.map((i: any) => (
                    <tr key={i.id}>
                      <td>
                        <Link href={`/players/${i.player.slug}`} style={{ fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase" }}>
                          {i.player.firstName} {i.player.lastName}
                        </Link>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--muted)" }}>
                        {new Date(i.createdAt).toLocaleString()}
                      </td>
                      <td><span className="badge badge-muted">{i.acceptedTosVersion}</span></td>
                      <td style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{(parseFloat(i.commissionRate) * 100).toFixed(1)}%</td>
                      <td><span className={`badge ${STATUS_COLORS[i.commissionStatus]}`}>{i.commissionStatus}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Messages ──────────────────────────────────────────── */}
      {tab === "messages" && (
        <div style={{ maxWidth: 560 }}>
          <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>💬</div>
            <h4 style={{ textTransform: "uppercase", marginBottom: 12 }}>Messages</h4>
            <p style={{ color: "var(--muted)", marginBottom: 24, fontSize: "0.9rem" }}>
              Chat directly with players you've revealed contact for.
            </p>
            <Link href="/messages" className="btn btn-primary" style={{ justifyContent: "center" }}>
              Open Inbox →
            </Link>
          </div>
        </div>
      )}

      {/* ── Settings ──────────────────────────────────────────── */}
      {tab === "settings" && (
        <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 20 }}>
          <SettingsForm club={club} />

          {/* Language */}
          <div className="card">
            <h4 style={{ textTransform: "uppercase", marginBottom: 4, fontSize: "0.9rem" }}>🌐 Language</h4>
            <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 16 }}>Choose your preferred display language.</p>
            <select className="input" value={langValue}
              onChange={e => { setLangValue(e.target.value); localStorage.setItem("hhLang", e.target.value); }}>
              {[
                { code: "en", label: "English" }, { code: "sr", label: "Srpski" },
                { code: "hr", label: "Hrvatski" }, { code: "bs", label: "Bosanski" },
                { code: "de", label: "Deutsch" }, { code: "fr", label: "Français" },
                { code: "es", label: "Español" }, { code: "it", label: "Italiano" },
                { code: "pt", label: "Português" }, { code: "pl", label: "Polski" },
                { code: "sl", label: "Slovenščina" }, { code: "ar", label: "العربية" },
              ].map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>

          {/* Delete account */}
          <div className="card" style={{ border: "1px solid rgba(255,59,59,0.2)" }}>
            <h4 style={{ textTransform: "uppercase", marginBottom: 4, fontSize: "0.9rem", color: "var(--red)" }}>⚠ Delete Account</h4>
            <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: 16, lineHeight: 1.6 }}>
              Permanently delete the club account and all associated data. This cannot be undone.
            </p>
            <ClubDeleteButton />
          </div>
        </div>
      )}
        </div>
        </div>
      </div>
      {/* ── PayPal Checkout Modal ─────────────────────── */}
      {showCheckout && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(4px)", overflowY: "auto", padding: "24px 16px" }}
          onClick={e => { if (e.target === e.currentTarget && !ppLoading) { setShowCheckout(false); setPpError(null); } }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "32px 28px", maxWidth: 480, width: "100%", position: "relative", margin: "auto" }}>
            <button onClick={() => { setShowCheckout(false); setPpError(null); }}
              style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "1.3rem", lineHeight: 1 }}>✕</button>

            <div className="section-label" style={{ marginBottom: 4 }}>Secure Checkout</div>
            <h4 style={{ textTransform: "uppercase", marginBottom: 4 }}>Annual Subscription</h4>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "2rem", color: "var(--accent)", marginBottom: 20 }}>
              €1 <span style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: 400 }}>/year (test)</span>
            </div>

            {ppSuccess ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ fontSize: "3rem", marginBottom: 12 }}>✅</div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.1rem", textTransform: "uppercase", color: "#00c864" }}>Payment Successful!</div>
                <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: 8 }}>Your subscription is now active. Reloading…</div>
              </div>
            ) : (
              <>
                {ppLoading && (
                  <div style={{ textAlign: "center", padding: "16px 0", color: "var(--muted)" }}><span className="spinner" style={{ marginRight: 8 }} /> Processing…</div>
                )}
                {ppError && (
                  <div style={{ background: "rgba(255,59,59,0.08)", border: "1px solid rgba(255,59,59,0.3)", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 16, fontSize: "0.83rem", color: "#ff6b6b" }}>
                    {ppError}
                  </div>
                )}
                <div id="paypal-button-container" style={{ minHeight: 50 }} />
                <div style={{ textAlign: "center", marginTop: 12, fontSize: "0.75rem", color: "var(--muted)" }}>
                  🔒 Secured by PayPal · Pay with card or PayPal account · <a href="/terms#refund" style={{ color: "var(--muted)" }}>Refund policy</a>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
