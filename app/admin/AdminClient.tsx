"use client";
import { useState } from "react";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "badge-accent", VERIFIED: "badge-green", REJECTED: "badge-red",
};
const COMM_COLORS: Record<string, string> = {
  PENDING: "badge-accent", INVOICED: "badge-blue", PAID: "badge-green", DISPUTED: "badge-red", WAIVED: "badge-muted",
};
const VERIF_COLORS: Record<string, string> = {
  UNVERIFIED: "badge-muted", PENDING: "badge-accent", VERIFIED: "badge-green", REJECTED: "badge-red",
};

export default function AdminClient({ clubs, players, interactions, users, stats }: any) {
  const [tab, setTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  // Detail modals
  const [clubModal, setClubModal] = useState<any>(null);
  const [playerModal, setPlayerModal] = useState<any>(null);
  const [userModal, setUserModal] = useState<any>(null);
  const [lightbox, setLightbox] = useState<{ src: string; label: string } | null>(null);
  const [chatModal, setChatModal] = useState<any>(null);

  const pendingPlayers = players.filter((p: any) => p.verificationStatus === "PENDING");
  const pendingClubs   = clubs.filter((c: any) => c.verificationStatus === "PENDING");

  const NAV_ITEMS = [
    { id: "overview",      label: "Overview",                                                                    icon: "⊞" },
    { id: "users",         label: `Users (${users.length})`,                                                     icon: "👥" },
    { id: "players",       label: `Players (${players.length})`,                                                 icon: "👤" },
    { id: "verify",        label: `Verify Players${pendingPlayers.length > 0 ? ` ⚠${pendingPlayers.length}` : ""}`, icon: "✅" },
    { id: "club-verify",   label: `Verify Clubs${pendingClubs.length > 0 ? ` ⚠${pendingClubs.length}` : ""}`,   icon: "🏟" },
    { id: "clubs",         label: `Clubs (${clubs.length})`,                                                     icon: "📋" },
    { id: "interactions",  label: "Commission Log",                                                              icon: "💰" },
  ];

  function selectTab(id: string) { setTab(id); setSidebarOpen(false); }

  async function openChat(i: any) {
    setChatModal({ interactionId: i.id, clubName: i.club?.name, playerName: `${i.player?.firstName} ${i.player?.lastName}`, messages: [], loading: true });
    const res = await fetch(`/api/admin/messages/${i.id}`);
    const data = await res.json();
    setChatModal((prev: any) => prev ? { ...prev, messages: data.interaction?.messages ?? [], loading: false } : null);
  }

  async function verifyClub(clubId: string, status: "VERIFIED" | "REJECTED", note?: string) {
    await fetch("/api/admin/clubs/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clubId, status, note }),
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

  async function deleteUser(userId: string) {
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    if (res.ok) { setDeletedIds(prev => new Set([...prev, userId])); setConfirmDelete(null); }
  }

  async function updateCommission(interactionId: string, status: string) {
    await fetch("/api/admin/interactions/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interactionId, status }),
    });
    window.location.reload();
  }

  function openLightbox(src: string, label: string) {
    if (src.endsWith(".pdf") || src.includes(".pdf")) {
      window.open(src, "_blank");
    } else {
      setLightbox({ src, label });
    }
  }

  function DocThumb({ url, label }: { url?: string; label: string }) {
    if (!url) return (
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
        <div style={{ height: 100, borderRadius: 6, border: "2px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: "0.75rem" }}>Not submitted</div>
      </div>
    );
    const isPdf = url.endsWith(".pdf");
    return (
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
        <div onClick={() => openLightbox(url, label)} style={{ cursor: "pointer", height: 100, borderRadius: 6, border: "1px solid var(--border)", overflow: "hidden", background: "var(--card2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {isPdf ? (
            <span style={{ fontSize: "2rem" }}>📄</span>
          ) : (
            <img src={url} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          )}
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.7rem", color: "var(--accent)", display: "block", marginTop: 4 }}>Open ↗</a>
      </div>
    );
  }

  return (
    <div className="sidebar-layout">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar${sidebarOpen ? " is-open" : ""}`}>
        <div style={{ padding: "0 24px 20px", borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", textTransform: "uppercase" }}>⚙ Admin Panel</div>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 4 }}>HandballHub Management</div>
        </div>
        <div className="sidebar-section">Management</div>
        <ul className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <li key={item.id}>
              <a href="#" className={tab === item.id ? "active" : ""} onClick={e => { e.preventDefault(); selectTab(item.id); }}>
                <span>{item.icon}</span> {item.label}
              </a>
            </li>
          ))}
        </ul>
      </aside>

      <div className="main-content">
        <button className="sidebar-toggle" onClick={() => setSidebarOpen(o => !o)}>
          {sidebarOpen ? "✕ Close" : `☰ ${NAV_ITEMS.find(n => n.id === tab)?.label ?? "Menu"}`}
        </button>

        <div style={{ marginBottom: 24 }}>
          <div className="section-label">Administration</div>
          <h2>Platform Overview</h2>
        </div>

        {/* ── Lightbox ── */}
        {lightbox && (
          <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.93)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
            <button onClick={() => setLightbox(null)} style={{ position: "absolute", top: 20, right: 24, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", borderRadius: "50%", width: 40, height: 40, fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            <div onClick={e => e.stopPropagation()} style={{ textAlign: "center" }}>
              <img src={lightbox.src} alt={lightbox.label} style={{ maxWidth: "88vw", maxHeight: "85vh", objectFit: "contain", borderRadius: 8 }} />
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", marginTop: 12, textTransform: "uppercase", letterSpacing: "0.1em" }}>{lightbox.label}</div>
            </div>
          </div>
        )}

        {/* ── Overview ── */}
        {tab === "overview" && (
          <div className="tab-content">
            <div className="grid-4" style={{ marginBottom: 32 }}>
              {[
                { label: "Total Users",          val: users.length },
                { label: "Total Players",        val: stats.totalPlayers },
                { label: "Pending Players",      val: stats.pendingVerification, alert: stats.pendingVerification > 0 },
                { label: "Pending Clubs",        val: stats.pendingClubs, alert: stats.pendingClubs > 0 },
              ].map(s => (
                <div key={s.label} className="card" style={{ textAlign: "center", borderColor: (s as any).alert ? "rgba(232,255,71,0.4)" : undefined }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "2.5rem", color: (s as any).alert ? "var(--accent)" : "var(--white)", lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {pendingPlayers.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ textTransform: "uppercase", marginBottom: 12, color: "var(--accent)" }}>⚠ Players Awaiting Verification ({pendingPlayers.length})</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {pendingPlayers.map((p: any) => (
                    <div key={p.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase" }}>{p.firstName} {p.lastName}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{p.user?.email} · {p.nationality} · {p.position?.replace(/_/g, " ")}</div>
                      </div>
                      <button className="btn btn-primary" style={{ fontSize: "0.8rem", padding: "8px 16px" }} onClick={() => setTab("verify")}>Review →</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pendingClubs.length > 0 && (
              <div>
                <h4 style={{ textTransform: "uppercase", marginBottom: 12, color: "var(--accent)" }}>⚠ Clubs Awaiting Verification ({pendingClubs.length})</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {pendingClubs.map((club: any) => (
                    <div key={club.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase" }}>{club.name}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{club.city}, {club.country} · {club.user?.email}</div>
                      </div>
                      <button className="btn btn-primary" style={{ fontSize: "0.8rem", padding: "8px 16px" }} onClick={() => setTab("club-verify")}>Review →</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Users ── */}
        {tab === "users" && (
          <div className="tab-content card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="table-wrap"><table className="table">
              <thead>
                <tr><th>Email</th><th>Role</th><th>Name / Club</th><th>IP</th><th>Registered</th><th>View</th><th>Delete</th></tr>
              </thead>
              <tbody>
                {users.filter((u: any) => !deletedIds.has(u.id)).map((u: any) => (
                  <tr key={u.id}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>{u.email}</td>
                    <td><span className={`badge ${u.role === "ADMIN" ? "badge-accent" : u.role === "CLUB" ? "badge-blue" : "badge-muted"}`}>{u.role}</span></td>
                    <td style={{ fontSize: "0.85rem" }}>{u.player ? `${u.player.firstName} ${u.player.lastName}` : u.club ? u.club.name : "—"}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--muted)" }}>{u.registrationIp ?? "—"}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--muted)" }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button className="btn btn-outline" style={{ fontSize: "0.7rem", padding: "4px 10px" }} onClick={() => setUserModal(u)}>👁 View</button>
                    </td>
                    <td>
                      {u.role !== "ADMIN" && (
                        <button className="btn btn-danger" style={{ fontSize: "0.7rem", padding: "4px 8px" }} onClick={() => setConfirmDelete({ id: u.id, name: u.email })}>🗑</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        )}

        {/* ── Players ── */}
        {tab === "players" && (
          <div className="tab-content card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="table-wrap"><table className="table">
              <thead>
                <tr><th>Player</th><th>Email</th><th>Position</th><th>Nationality</th><th>Status</th><th>Available</th><th>Registered</th><th>View</th><th>Delete</th></tr>
              </thead>
              <tbody>
                {players.filter((p: any) => !deletedIds.has(p.userId)).map((p: any) => (
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
                    <td>
                      <button className="btn btn-outline" style={{ fontSize: "0.7rem", padding: "4px 10px" }} onClick={() => setPlayerModal(p)}>👁 View</button>
                    </td>
                    <td>
                      <button className="btn btn-danger" style={{ fontSize: "0.7rem", padding: "4px 8px" }} onClick={() => setConfirmDelete({ id: p.userId, name: `${p.firstName} ${p.lastName}` })}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        )}

        {/* ── Player Verification ── */}
        {tab === "verify" && (
          <div className="tab-content">
            {pendingPlayers.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
                <div style={{ fontSize: "3rem", marginBottom: 16 }}>✓</div>
                <p>No players awaiting verification.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {players.filter((p: any) => p.verificationStatus === "PENDING" || (p.verificationStatus === "REJECTED" && p.passportUrl)).map((p: any) => (
                  <div key={p.id} className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                      <div>
                        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem", textTransform: "uppercase" }}>
                          {p.firstName} {p.lastName}
                          <span className={`badge ${VERIF_COLORS[p.verificationStatus]}`} style={{ marginLeft: 10, verticalAlign: "middle" }}>{p.verificationStatus}</span>
                        </div>
                        <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: 4 }}>
                          {p.user?.email} · {p.nationality} · {p.position?.replace(/_/g, " ")} · DOB: {p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString() : "—"}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 2 }}>
                          Height: {p.heightCm}cm · Weight: {p.weightKg}kg · {p.dominantHand} handed · IP: {p.user?.registrationIp ?? "unknown"}
                        </div>
                      </div>
                      {p.photoUrl && <img src={p.photoUrl} alt="profile" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)", cursor: "zoom-in" }} onClick={() => setLightbox({ src: p.photoUrl, label: "Profile Photo" })} />}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                      {[{ label: "Passport / ID", url: p.passportUrl }, { label: "Selfie with Passport", url: p.selfieUrl }].map(doc => (
                        <div key={doc.label}>
                          <div style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", marginBottom: 8 }}>{doc.label}</div>
                          {doc.url ? (
                            <div onClick={() => setLightbox({ src: doc.url!, label: doc.label })} style={{ cursor: "zoom-in", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", height: 180 }}>
                              <img src={doc.url} alt={doc.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                          ) : (
                            <div style={{ height: 180, borderRadius: 8, border: "2px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: "0.8rem" }}>Not submitted</div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="form-group" style={{ marginBottom: 16 }}>
                      <label className="label">Rejection note (optional — shown to player)</label>
                      <input className="input" placeholder="e.g. Document is not readable. Please resubmit." value={rejectNote[p.id] ?? ""} onChange={e => setRejectNote(n => ({ ...n, [p.id]: e.target.value }))} />
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                      <button className="btn btn-primary" style={{ minWidth: 140, justifyContent: "center" }} onClick={() => verifyPlayer(p.id, "VERIFIED")}>✓ Verify Player</button>
                      <button className="btn btn-danger" style={{ minWidth: 140, justifyContent: "center" }} onClick={() => verifyPlayer(p.id, "REJECTED")}>✕ Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Club Verification ── */}
        {tab === "club-verify" && (
          <div className="tab-content">
            {pendingClubs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
                <div style={{ fontSize: "3rem", marginBottom: 16 }}>✓</div>
                <p>No clubs awaiting verification.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {pendingClubs.map((club: any) => (
                  <div key={club.id} className="card">
                    {/* Club header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                      <div>
                        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.3rem", textTransform: "uppercase" }}>
                          {club.name}
                          {club.gender && <span style={{ fontSize: "0.75rem", color: "var(--accent)", marginLeft: 10 }}>{club.gender === "MALE" ? "♂ Men's" : "♀ Women's"}</span>}
                          <span className="badge badge-accent" style={{ marginLeft: 10, verticalAlign: "middle" }}>PENDING</span>
                        </div>
                        <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: 4 }}>
                          {club.user?.email} · {club.city}, {club.country} · Reg IP: {club.user?.registrationIp ?? "—"}
                        </div>
                      </div>
                    </div>

                    {/* Club info grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20, padding: "16px", background: "var(--card2)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                      {[
                        { label: "League", val: club.leagueName || "—" },
                        { label: "Founded", val: club.foundedYear || "—" },
                        { label: "Address", val: club.address || "—" },
                        { label: "Website", val: club.website || "—" },
                        { label: "Contact Phone", val: club.contactPhone || "—" },
                        { label: "Contact Email", val: club.contactEmail || "—" },
                        { label: "Representative", val: club.contactName ? `${club.contactName}${club.contactTitle ? ` (${club.contactTitle})` : ""}` : "—" },
                        { label: "Registered", val: new Date(club.createdAt).toLocaleString() },
                      ].map(row => (
                        <div key={row.label}>
                          <div style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", marginBottom: 2 }}>{row.label}</div>
                          <div style={{ fontSize: "0.85rem", color: "var(--white)", wordBreak: "break-all" }}>{row.val}</div>
                        </div>
                      ))}
                    </div>

                    {club.description && (
                      <div style={{ marginBottom: 16, padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                        <div style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", marginBottom: 6 }}>Club Description</div>
                        <div style={{ fontSize: "0.85rem", color: "rgba(245,243,238,0.8)", lineHeight: 1.6 }}>{club.description}</div>
                      </div>
                    )}

                    {/* Documents */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", marginBottom: 10, letterSpacing: "0.08em" }}>Verification Documents</div>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <DocThumb url={club.officialDocUrl} label="Official Club Doc" />
                        <DocThumb url={club.authorizationDocUrl} label="Authorization Letter" />
                        <DocThumb url={club.representativePassportUrl} label="Passport / ID" />
                      </div>
                    </div>

                    {/* Reject note */}
                    <div className="form-group" style={{ marginBottom: 16 }}>
                      <label className="label">Rejection note (optional — shown to club)</label>
                      <input className="input" placeholder="e.g. Authorization letter is missing club stamp." value={rejectNote[club.id] ?? ""} onChange={e => setRejectNote(n => ({ ...n, [club.id]: e.target.value }))} />
                    </div>

                    <div style={{ display: "flex", gap: 12 }}>
                      <button className="btn btn-primary" style={{ minWidth: 140, justifyContent: "center" }} onClick={() => verifyClub(club.id, "VERIFIED")}>✓ Verify Club</button>
                      <button className="btn btn-danger" style={{ minWidth: 140, justifyContent: "center" }} onClick={() => verifyClub(club.id, "REJECTED", rejectNote[club.id])}>✕ Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Clubs ── */}
        {tab === "clubs" && (
          <div className="tab-content card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Club</th><th>Gender</th><th>Location</th><th>Email</th><th>Subscription</th><th>Status</th><th>View</th><th>Delete</th></tr></thead>
              <tbody>
                {clubs.filter((club: any) => !deletedIds.has(club.userId)).map((club: any) => (
                  <tr key={club.id}>
                    <td>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase" }}>{club.name}</div>
                      {club.leagueName && <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{club.leagueName}</div>}
                    </td>
                    <td style={{ fontSize: "0.82rem" }}>{club.gender === "MALE" ? "♂ Men's" : club.gender === "FEMALE" ? "♀ Women's" : "—"}</td>
                    <td style={{ fontSize: "0.85rem" }}>{club.city}, {club.country}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--muted)" }}>{club.user?.email}</td>
                    <td><span className={`badge ${club.subscriptionStatus === "ACTIVE" ? "badge-green" : "badge-muted"}`}>{club.subscriptionStatus}</span></td>
                    <td><span className={`badge ${STATUS_COLORS[club.verificationStatus]}`}>{club.verificationStatus}</span></td>
                    <td>
                      <button className="btn btn-outline" style={{ fontSize: "0.7rem", padding: "4px 10px" }} onClick={() => setClubModal(club)}>👁 View</button>
                    </td>
                    <td>
                      <button className="btn btn-danger" style={{ fontSize: "0.7rem", padding: "4px 8px" }} onClick={() => setConfirmDelete({ id: club.userId, name: club.name })}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        )}

        {/* ── Commission Log ── */}
        {tab === "interactions" && (
          <div className="tab-content">
            <div style={{ marginBottom: 16, padding: "14px 20px", background: "rgba(232,255,71,0.05)", border: "1px solid rgba(232,255,71,0.15)", borderRadius: "var(--radius)", fontSize: "0.85rem", color: "rgba(245,243,238,0.7)" }}>
              ℹ Immutable digital footprint — each entry is a legally binding record of a contact reveal between a club and a player.
            </div>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="table-wrap"><table className="table">
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
                        <button className="btn btn-outline" style={{ fontSize: "0.75rem", padding: "5px 10px" }} onClick={() => openChat(i)}>💬 Chat</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </div>
          </div>
        )}

        {/* ── Delete Confirm Modal ── */}
        {confirmDelete && (
          <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
            <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
              <h4 style={{ textTransform: "uppercase", marginBottom: 8, color: "var(--red)" }}>⚠ Delete Account</h4>
              <p style={{ fontSize: "0.88rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: 20 }}>
                Are you sure you want to permanently delete <strong style={{ color: "var(--white)" }}>{confirmDelete.name}</strong>? This cannot be undone.
              </p>
              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn btn-danger" style={{ flex: 1, justifyContent: "center" }} onClick={() => deleteUser(confirmDelete.id)}>🗑 Delete Permanently</button>
                <button className="btn btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={() => setConfirmDelete(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Club Detail Modal ── */}
        {clubModal && (
          <div className="modal-overlay" onClick={() => setClubModal(null)}>
            <div className="modal" style={{ maxWidth: 680, width: "100%", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontFamily: "var(--font-display)", textTransform: "uppercase", marginBottom: 4 }}>
                    {clubModal.name}
                    {clubModal.gender && <span style={{ fontSize: "0.7rem", color: "var(--accent)", marginLeft: 8 }}>{clubModal.gender === "MALE" ? "♂ Men's" : "♀ Women's"}</span>}
                  </h3>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span className={`badge ${STATUS_COLORS[clubModal.verificationStatus]}`}>{clubModal.verificationStatus}</span>
                    <span className={`badge ${clubModal.subscriptionStatus === "ACTIVE" ? "badge-green" : "badge-muted"}`}>{clubModal.subscriptionStatus}</span>
                  </div>
                </div>
                <button onClick={() => setClubModal(null)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
              </div>

              {/* Info grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20, padding: "16px", background: "var(--card2)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                {[
                  { label: "Email (login)", val: clubModal.user?.email },
                  { label: "Contact Email", val: clubModal.contactEmail || "—" },
                  { label: "Phone", val: clubModal.contactPhone || "—" },
                  { label: "Country", val: clubModal.country },
                  { label: "City", val: clubModal.city },
                  { label: "Address", val: clubModal.address || "—" },
                  { label: "League", val: clubModal.leagueName || "—" },
                  { label: "Founded", val: clubModal.foundedYear || "—" },
                  { label: "Website", val: clubModal.website || "—" },
                  { label: "Representative", val: clubModal.contactName ? `${clubModal.contactName}${clubModal.contactTitle ? ` — ${clubModal.contactTitle}` : ""}` : "—" },
                  { label: "Reg IP", val: clubModal.user?.registrationIp || "—" },
                  { label: "Registered", val: new Date(clubModal.createdAt).toLocaleString() },
                ].map(row => (
                  <div key={row.label}>
                    <div style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", marginBottom: 2 }}>{row.label}</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--white)", wordBreak: "break-all" }}>{String(row.val)}</div>
                  </div>
                ))}
              </div>

              {clubModal.description && (
                <div style={{ marginBottom: 16, padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", marginBottom: 6 }}>Description</div>
                  <div style={{ fontSize: "0.85rem", color: "rgba(245,243,238,0.8)", lineHeight: 1.6 }}>{clubModal.description}</div>
                </div>
              )}

              {/* Verification docs */}
              {(clubModal.officialDocUrl || clubModal.authorizationDocUrl || clubModal.representativePassportUrl) && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", marginBottom: 10, letterSpacing: "0.08em" }}>Verification Documents</div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <DocThumb url={clubModal.officialDocUrl} label="Official Club Doc" />
                    <DocThumb url={clubModal.authorizationDocUrl} label="Authorization Letter" />
                    <DocThumb url={clubModal.representativePassportUrl} label="Passport / ID" />
                  </div>
                </div>
              )}

              {/* Search history */}
              {clubModal.searchLogs?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", marginBottom: 10, letterSpacing: "0.08em" }}>
                    Search History ({clubModal.searchLogs.length} searches)
                  </div>
                  <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                    {clubModal.searchLogs.slice().reverse().map((log: any, i: number) => (
                      <div key={i} style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "6px 10px", background: "var(--card2)", borderRadius: 6, fontSize: "0.78rem", color: "rgba(245,243,238,0.8)" }}>
                        <span style={{ color: "var(--muted)" }}>{new Date(log.searchedAt).toLocaleDateString()}</span>
                        {log.position && <span style={{ color: "var(--accent)" }}>📍 {log.position.replace(/_/g, " ")}</span>}
                        {log.nationality && <span>🌍 {log.nationality}</span>}
                        {log.minHeight && <span>📏 {log.minHeight}–{log.maxHeight ?? "∞"}cm</span>}
                        {log.minAge && <span>🎂 {log.minAge}–{log.maxAge ?? "∞"}y</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Watchlist */}
              {clubModal.watchlist?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", marginBottom: 10, letterSpacing: "0.08em" }}>
                    Watchlist ({clubModal.watchlist.length} players)
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {clubModal.watchlist.map((w: any) => (
                      <Link key={w.playerId} href={`/players/${w.player?.slug}`} style={{ padding: "4px 10px", background: "var(--card2)", borderRadius: 20, fontSize: "0.78rem", color: "var(--accent)", border: "1px solid var(--border)" }}>
                        {w.player?.firstName} {w.player?.lastName}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Verify/Reject actions if pending */}
              {clubModal.verificationStatus === "PENDING" && (
                <div style={{ paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label className="label">Rejection note (optional)</label>
                    <input className="input" placeholder="Reason for rejection..." value={rejectNote[clubModal.id] ?? ""} onChange={e => setRejectNote(n => ({ ...n, [clubModal.id]: e.target.value }))} />
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setClubModal(null); verifyClub(clubModal.id, "VERIFIED"); }}>✓ Verify Club</button>
                    <button className="btn btn-danger" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setClubModal(null); verifyClub(clubModal.id, "REJECTED", rejectNote[clubModal.id]); }}>✕ Reject</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Player Detail Modal ── */}
        {playerModal && (
          <div className="modal-overlay" onClick={() => setPlayerModal(null)}>
            <div className="modal" style={{ maxWidth: 640, width: "100%", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  {playerModal.photoUrl && <img src={playerModal.photoUrl} alt="photo" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)", cursor: "zoom-in" }} onClick={() => setLightbox({ src: playerModal.photoUrl, label: "Profile Photo" })} />}
                  <div>
                    <h3 style={{ fontFamily: "var(--font-display)", textTransform: "uppercase", marginBottom: 4 }}>{playerModal.firstName} {playerModal.lastName}</h3>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span className={`badge ${VERIF_COLORS[playerModal.verificationStatus]}`}>{playerModal.verificationStatus}</span>
                      <span className={`badge ${playerModal.isAvailable ? "badge-green" : "badge-muted"}`}>{playerModal.isAvailable ? "Available" : "Unavailable"}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setPlayerModal(null)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20, padding: "16px", background: "var(--card2)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                {[
                  { label: "Email", val: playerModal.user?.email },
                  { label: "Date of Birth", val: playerModal.dateOfBirth ? new Date(playerModal.dateOfBirth).toLocaleDateString() : "—" },
                  { label: "Nationality", val: playerModal.nationality },
                  { label: "Position", val: playerModal.position?.replace(/_/g, " ") },
                  { label: "Height", val: `${playerModal.heightCm} cm` },
                  { label: "Weight", val: `${playerModal.weightKg} kg` },
                  { label: "Dominant Hand", val: playerModal.dominantHand },
                  { label: "Current Club", val: playerModal.currentClub || "Free Agent" },
                  { label: "Phone", val: playerModal.phone || "—" },
                  { label: "Agent", val: playerModal.agentName ? `${playerModal.agentName} (${playerModal.agentPhone ?? playerModal.agentEmail ?? "—"})` : "—" },
                  { label: "Reg IP", val: playerModal.user?.registrationIp || "—" },
                  { label: "Registered", val: new Date(playerModal.createdAt).toLocaleString() },
                ].map(row => (
                  <div key={row.label}>
                    <div style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", marginBottom: 2 }}>{row.label}</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--white)", wordBreak: "break-all" }}>{String(row.val)}</div>
                  </div>
                ))}
              </div>

              {(playerModal.passportUrl || playerModal.selfieUrl) && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", marginBottom: 10 }}>Verification Documents</div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <DocThumb url={playerModal.passportUrl} label="Passport / ID" />
                    <DocThumb url={playerModal.selfieUrl} label="Selfie with Passport" />
                  </div>
                </div>
              )}

              <div style={{ textAlign: "center", marginTop: 12 }}>
                <Link href={`/players/${playerModal.slug}`} target="_blank" className="btn btn-outline" style={{ fontSize: "0.85rem" }}>
                  View Public Profile ↗
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── User Detail Modal ── */}
        {userModal && (
          <div className="modal-overlay" onClick={() => setUserModal(null)}>
            <div className="modal" style={{ maxWidth: 480, width: "100%" }} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontFamily: "var(--font-display)", textTransform: "uppercase", marginBottom: 4 }}>
                    {userModal.player ? `${userModal.player.firstName} ${userModal.player.lastName}` : userModal.club?.name ?? userModal.email}
                  </h3>
                  <span className={`badge ${userModal.role === "ADMIN" ? "badge-accent" : userModal.role === "CLUB" ? "badge-blue" : "badge-muted"}`}>{userModal.role}</span>
                </div>
                <button onClick={() => setUserModal(null)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "16px", background: "var(--card2)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                {[
                  { label: "User ID", val: userModal.id },
                  { label: "Email", val: userModal.email },
                  { label: "Role", val: userModal.role },
                  { label: "Registration IP", val: userModal.registrationIp ?? "—" },
                  { label: "Registered", val: new Date(userModal.createdAt).toLocaleString() },
                  { label: "Name / Club", val: userModal.player ? `${userModal.player.firstName} ${userModal.player.lastName}` : userModal.club?.name ?? "—" },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", flexShrink: 0 }}>{row.label}</span>
                    <span style={{ fontSize: "0.85rem", color: "var(--white)", textAlign: "right", wordBreak: "break-all" }}>{String(row.val)}</span>
                  </div>
                ))}
              </div>
              {userModal.role !== "ADMIN" && (
                <div style={{ marginTop: 16 }}>
                  <button className="btn btn-danger" style={{ width: "100%", justifyContent: "center" }} onClick={() => { setUserModal(null); setConfirmDelete({ id: userModal.id, name: userModal.email }); }}>
                    🗑 Delete Account
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Chat Modal ── */}
        {chatModal && (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setChatModal(null); }}>
            <div className="modal" style={{ maxWidth: 600, width: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h2 className="modal-title" style={{ marginBottom: 4 }}>💬 Conversation</h2>
                  <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                    <span style={{ color: "var(--accent)", fontWeight: 700 }}>{chatModal.clubName}</span>
                    <span style={{ margin: "0 8px", opacity: 0.4 }}>↔</span>
                    <span style={{ color: "var(--white)", fontWeight: 700 }}>{chatModal.playerName}</span>
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 4 }}>Read-only admin view</div>
                </div>
                <button onClick={() => setChatModal(null)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 0", display: "flex", flexDirection: "column", gap: 10, minHeight: 200 }}>
                {chatModal.loading ? (
                  <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}><span className="spinner" style={{ marginRight: 8 }} />Loading…</div>
                ) : chatModal.messages.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>No messages yet.</div>
                ) : (
                  chatModal.messages.map((m: any) => {
                    const isClub = m.sender?.role === "CLUB";
                    return (
                      <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: isClub ? "flex-end" : "flex-start" }}>
                        <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginBottom: 2, paddingLeft: 4, paddingRight: 4 }}>
                          {isClub ? `🏟 ${chatModal.clubName}` : `🏐 ${chatModal.playerName}`}
                        </div>
                        <div style={{ maxWidth: "75%", background: isClub ? "rgba(232,255,71,0.12)" : "var(--card2)", border: `1px solid ${isClub ? "rgba(232,255,71,0.2)" : "var(--border)"}`, borderRadius: isClub ? "14px 14px 4px 14px" : "14px 14px 14px 4px", padding: "10px 14px", fontSize: "0.88rem", lineHeight: 1.5, color: "var(--white)" }}>
                          <div>{m.content}</div>
                          <div style={{ fontSize: "0.65rem", opacity: 0.5, marginTop: 4, textAlign: isClub ? "right" : "left" }}>{new Date(m.createdAt).toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 8, textAlign: "center" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Admin view — messages cannot be sent or edited</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
