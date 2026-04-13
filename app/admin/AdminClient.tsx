"use client";
// app/admin/AdminClient.tsx
import { useState } from "react";
import Link from "next/link";
import PhotoLightbox from "@/components/PhotoLightbox";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "badge-accent", VERIFIED: "badge-green", REJECTED: "badge-red",
};
const COMM_COLORS: Record<string, string> = {
  PENDING: "badge-accent", INVOICED: "badge-blue", PAID: "badge-green", DISPUTED: "badge-red", WAIVED: "badge-muted",
};
const VERIF_COLORS: Record<string, string> = {
  UNVERIFIED: "badge-muted", PENDING: "badge-accent", VERIFIED: "badge-green", REJECTED: "badge-red",
};

type ChatModal = {
  interactionId: string;
  clubName: string;
  playerName: string;
  messages: any[];
  loading: boolean;
} | null;

export default function AdminClient({ clubs, players, interactions, users, stats }: any) {
  const [tab, setTab] = useState("overview");
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<{ src: string; label: string } | null>(null);
  const [chatModal, setChatModal] = useState<ChatModal>(null);

  async function openChat(i: any) {
    setChatModal({ interactionId: i.id, clubName: i.club?.name, playerName: `${i.player?.firstName} ${i.player?.lastName}`, messages: [], loading: true });
    const res = await fetch(`/api/admin/messages/${i.id}`);
    const data = await res.json();
    setChatModal(prev => prev ? { ...prev, messages: data.interaction?.messages ?? [], loading: false } : null);
  }

  async function verifyClub(clubId: string, status: "VERIFIED" | "REJECTED") {
    await fetch("/api/admin/clubs/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clubId, status }),
    });
    window.location.reload();
  }

  async function verifyPlayer(playerId: string, status: "VERIFIED" | "REJECTED") {
    await fetch("/api/admin/players/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, status, note: rejectNote[playerId] ?? "" }),
    });
    window.location.reload();
  }

  async function updateCommission(interactionId: string, status: string) {
    await fetch("/api/admin/interactions/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interactionId, status }),
    });
    window.location.reload();
  }

  const pendingPlayers = players.filter((p: any) => p.verificationStatus === "PENDING");

  const tabs = [
    { id: "overview",     label: "Overview" },
    { id: "users",        label: `Users (${users.length})` },
    { id: "players",      label: `Players (${players.length})` },
    { id: "verification", label: `Verify Players${pendingPlayers.length > 0 ? ` ⚠${pendingPlayers.length}` : ""}` },
    { id: "clubs",        label: `Clubs (${clubs.length})` },
    { id: "interactions", label: `Commission Log (${interactions.length})` },
  ];

  return (
    <div>
      {/* Lightbox for passport/selfie images */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.93)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
          <button onClick={() => setLightbox(null)} style={{ position: "absolute", top: 20, right: 24, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", borderRadius: "50%", width: 40, height: 40, fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
          <div onClick={e => e.stopPropagation()} style={{ textAlign: "center" }}>
            <img src={lightbox.src} alt={lightbox.label} style={{ maxWidth: "88vw", maxHeight: "85vh", objectFit: "contain", borderRadius: 8, boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }} />
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", marginTop: 12, textTransform: "uppercase", letterSpacing: "0.1em" }}>{lightbox.label}</div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 32 }}>
        <div className="section-label">Administration</div>
        <h2>Platform Overview</h2>
      </div>

      <div className="tabs" style={{ flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button key={t.id} className={`tab-btn${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ──────────────────────────────────────────── */}
      {tab === "overview" && (
        <div>
          <div className="grid-4" style={{ marginBottom: 32 }}>
            {[
              { label: "Total Users",           val: users.length },
              { label: "Total Players",         val: stats.totalPlayers },
              { label: "Pending Verification",  val: stats.pendingVerification, alert: stats.pendingVerification > 0 },
              { label: "Total Clubs",           val: stats.totalClubs },
            ].map(s => (
              <div key={s.label} className="card" style={{ textAlign: "center", borderColor: (s as any).alert ? "rgba(232,255,71,0.4)" : undefined }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "2.5rem", color: (s as any).alert ? "var(--accent)" : "var(--white)", lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Pending player verifications */}
          {pendingPlayers.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h4 style={{ textTransform: "uppercase", marginBottom: 16, color: "var(--accent)" }}>⚠ Players Awaiting Verification ({pendingPlayers.length})</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {pendingPlayers.map((p: any) => (
                  <div key={p.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", textTransform: "uppercase" }}>{p.firstName} {p.lastName}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{p.user?.email} · {p.nationality} · {p.position?.replace(/_/g, " ")}</div>
                    </div>
                    <button className="btn btn-primary" style={{ fontSize: "0.8rem", padding: "8px 16px" }} onClick={() => setTab("verification")}>Review →</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending club verifications */}
          {clubs.filter((c: any) => c.verificationStatus === "PENDING").length > 0 && (
            <div>
              <h4 style={{ textTransform: "uppercase", marginBottom: 16, color: "var(--accent)" }}>⚠ Clubs Awaiting Verification</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {clubs.filter((c: any) => c.verificationStatus === "PENDING").map((club: any) => (
                  <div key={club.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", textTransform: "uppercase" }}>{club.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{club.city}, {club.country} · {club.user?.email}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-primary" style={{ fontSize: "0.8rem", padding: "8px 16px" }} onClick={() => verifyClub(club.id, "VERIFIED")}>✓ Verify</button>
                      <button className="btn btn-danger" style={{ fontSize: "0.8rem", padding: "8px 16px" }} onClick={() => verifyClub(club.id, "REJECTED")}>✕ Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Users ─────────────────────────────────────────────── */}
      {tab === "users" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Registration IP</th>
                <th>Name / Club</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id}>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === "ADMIN" ? "badge-accent" : u.role === "CLUB" ? "badge-blue" : "badge-muted"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--muted)" }}>
                    {u.registrationIp ?? "—"}
                  </td>
                  <td style={{ fontSize: "0.85rem" }}>
                    {u.player ? `${u.player.firstName} ${u.player.lastName}` : u.club ? u.club.name : "—"}
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--muted)" }}>
                    {new Date(u.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Players ───────────────────────────────────────────── */}
      {tab === "players" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr><th>Player</th><th>Email</th><th>Position</th><th>Nationality</th><th>Verification</th><th>Available</th><th>Registered</th></tr>
            </thead>
            <tbody>
              {players.map((p: any) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/players/${p.slug}`} style={{ fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase" }}>
                      {p.firstName} {p.lastName}
                    </Link>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{p.currentClub ?? "Free Agent"}</div>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--muted)" }}>{p.user?.email}</td>
                  <td><span className="pos-pill" style={{ fontSize: "0.7rem" }}>{p.position?.replace(/_/g, " ")}</span></td>
                  <td style={{ fontSize: "0.85rem" }}>{p.nationality}</td>
                  <td><span className={`badge ${VERIF_COLORS[p.verificationStatus] ?? "badge-muted"}`}>{p.verificationStatus}</span></td>
                  <td><span className={`badge ${p.isAvailable ? "badge-green" : "badge-muted"}`}>{p.isAvailable ? "Yes" : "No"}</span></td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--muted)" }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Player Verification ───────────────────────────────── */}
      {tab === "verification" && (
        <div>
          {players.filter((p: any) => p.verificationStatus === "PENDING" || p.passportUrl).length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
              <div style={{ fontSize: "3rem", marginBottom: 16 }}>✓</div>
              <p>No players awaiting verification.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {players.filter((p: any) => p.verificationStatus === "PENDING" || (p.verificationStatus === "REJECTED" && p.passportUrl)).map((p: any) => (
                <div key={p.id} className="card">
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem", textTransform: "uppercase" }}>
                        {p.firstName} {p.lastName}
                        <span className={`badge ${VERIF_COLORS[p.verificationStatus]} `} style={{ marginLeft: 10, verticalAlign: "middle" }}>
                          {p.verificationStatus}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: 4 }}>
                        {p.user?.email} · {p.nationality} · {p.position?.replace(/_/g, " ")} · IP: {p.user?.registrationIp ?? "unknown"}
                      </div>
                    </div>
                    {p.photoUrl && (
                      <PhotoLightbox src={p.photoUrl} alt="Profile photo">
                        <img src={p.photoUrl} alt="profile" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)", cursor: "zoom-in" }} />
                      </PhotoLightbox>
                    )}
                  </div>

                  {/* Document images */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                    {[
                      { label: "Passport / ID", url: p.passportUrl },
                      { label: "Selfie with Passport", url: p.selfieUrl },
                    ].map(doc => (
                      <div key={doc.label}>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{doc.label}</div>
                        {doc.url ? (
                          <div
                            onClick={() => setLightbox({ src: doc.url!, label: doc.label })}
                            style={{ cursor: "zoom-in", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", height: 180 }}
                          >
                            <img src={doc.url} alt={doc.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>
                        ) : (
                          <div style={{ height: 180, borderRadius: 8, border: "2px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: "0.8rem" }}>
                            Not submitted
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Reject note */}
                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label className="label">Rejection note (optional — shown to player)</label>
                    <input
                      className="input"
                      placeholder="e.g. Document is not readable. Please resubmit."
                      value={rejectNote[p.id] ?? ""}
                      onChange={e => setRejectNote(n => ({ ...n, [p.id]: e.target.value }))}
                    />
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 12 }}>
                    <button className="btn btn-primary" style={{ minWidth: 140, justifyContent: "center" }} onClick={() => verifyPlayer(p.id, "VERIFIED")}>
                      ✓ Verify Player
                    </button>
                    <button className="btn btn-danger" style={{ minWidth: 140, justifyContent: "center" }} onClick={() => verifyPlayer(p.id, "REJECTED")}>
                      ✕ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Clubs ─────────────────────────────────────────────── */}
      {tab === "clubs" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="table">
            <thead><tr><th>Club</th><th>Location</th><th>Email</th><th>Subscription</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {clubs.map((club: any) => (
                <tr key={club.id}>
                  <td>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase" }}>{club.name}</div>
                    {club.leagueName && <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{club.leagueName}</div>}
                  </td>
                  <td style={{ fontSize: "0.85rem" }}>{club.city}, {club.country}</td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--muted)" }}>{club.user?.email}</td>
                  <td><span className={`badge ${club.subscriptionStatus === "ACTIVE" ? "badge-green" : "badge-muted"}`}>{club.subscriptionStatus}</span></td>
                  <td><span className={`badge ${STATUS_COLORS[club.verificationStatus]}`}>{club.verificationStatus}</span></td>
                  <td style={{ display: "flex", gap: 4 }}>
                    {club.verificationStatus === "PENDING" && (
                      <>
                        <button className="btn btn-primary" style={{ fontSize: "0.7rem", padding: "4px 8px" }} onClick={() => verifyClub(club.id, "VERIFIED")}>Verify</button>
                        <button className="btn btn-danger" style={{ fontSize: "0.7rem", padding: "4px 8px" }} onClick={() => verifyClub(club.id, "REJECTED")}>Reject</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Commission Log ────────────────────────────────────── */}
      {tab === "interactions" && (
        <div>
          <div style={{ marginBottom: 16, padding: "14px 20px", background: "rgba(232,255,71,0.05)", border: "1px solid rgba(232,255,71,0.15)", borderRadius: "var(--radius)", fontSize: "0.85rem", color: "rgba(245,243,238,0.7)" }}>
            ℹ Immutable digital footprint — each entry is a legally binding record of a contact reveal used to enforce the 5% commission.
          </div>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="table">
              <thead><tr><th>Club</th><th>Player</th><th>Revealed At</th><th>IP</th><th>Rate</th><th>Status</th><th>Update</th><th>Chat</th></tr></thead>
              <tbody>
                {interactions.map((i: any) => (
                  <tr key={i.id}>
                    <td style={{ fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase", fontSize: "0.9rem" }}>{i.club?.name}</td>
                    <td>
                      <Link href={`/players/${i.player?.slug}`} style={{ fontFamily: "var(--font-display)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.9rem" }}>
                        {i.player?.firstName} {i.player?.lastName}
                      </Link>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--muted)" }}>{new Date(i.createdAt).toLocaleString()}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--muted)" }}>{i.ipAddress}</td>
                    <td style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{(parseFloat(i.commissionRate) * 100).toFixed(1)}%</td>
                    <td><span className={`badge ${COMM_COLORS[i.commissionStatus] ?? "badge-muted"}`}>{i.commissionStatus}</span></td>
                    <td>
                      <select className="input" defaultValue={i.commissionStatus} style={{ fontSize: "0.75rem", padding: "4px 8px" }} onChange={e => updateCommission(i.id, e.target.value)}>
                        {["PENDING","INVOICED","PAID","DISPUTED","WAIVED"].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>
                      <button
                        className="btn btn-outline"
                        style={{ fontSize: "0.75rem", padding: "5px 10px", display: "flex", alignItems: "center", gap: 4 }}
                        onClick={() => openChat(i)}
                      >
                        💬 Chat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Admin Chat Modal ──────────────────────────────────────── */}
      {chatModal && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={e => { if (e.target === e.currentTarget) setChatModal(null); }}
        >
          <div className="modal" style={{ maxWidth: 600, width: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h2 className="modal-title" style={{ marginBottom: 4 }}>
                  💬 Conversation
                </h2>
                <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                  <span style={{ color: "var(--accent)", fontWeight: 700 }}>{chatModal.clubName}</span>
                  <span style={{ margin: "0 8px", opacity: 0.4 }}>↔</span>
                  <span style={{ color: "var(--white)", fontWeight: 700 }}>{chatModal.playerName}</span>
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 4 }}>Read-only admin view</div>
              </div>
              <button
                onClick={() => setChatModal(null)}
                style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.2rem", cursor: "pointer", padding: "4px 8px" }}
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 0", display: "flex", flexDirection: "column", gap: 10, minHeight: 200 }}>
              {chatModal.loading ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
                  <span className="spinner" style={{ marginRight: 8 }} />
                  Loading conversation…
                </div>
              ) : chatModal.messages.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
                  <div style={{ fontSize: "2rem", marginBottom: 12 }}>💬</div>
                  <p>No messages in this conversation yet.</p>
                </div>
              ) : (
                chatModal.messages.map((m: any) => {
                  const isClub = m.sender?.role === "CLUB";
                  return (
                    <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: isClub ? "flex-end" : "flex-start" }}>
                      <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginBottom: 2, paddingLeft: 4, paddingRight: 4 }}>
                        {isClub ? `🏟 ${chatModal.clubName}` : `🏐 ${chatModal.playerName}`}
                      </div>
                      <div style={{
                        maxWidth: "75%",
                        background: isClub ? "rgba(232,255,71,0.12)" : "var(--card2)",
                        border: `1px solid ${isClub ? "rgba(232,255,71,0.2)" : "var(--border)"}`,
                        borderRadius: isClub ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                        padding: "10px 14px",
                        fontSize: "0.88rem",
                        lineHeight: 1.5,
                        color: "var(--white)",
                      }}>
                        <div>{m.content}</div>
                        <div style={{ fontSize: "0.65rem", opacity: 0.5, marginTop: 4, textAlign: isClub ? "right" : "left" }}>
                          {new Date(m.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 8 }}>
              <div style={{ fontSize: "0.75rem", color: "var(--muted)", textAlign: "center" }}>
                Admin view — messages cannot be sent or edited from this panel
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
