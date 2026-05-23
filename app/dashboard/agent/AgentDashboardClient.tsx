"use client";
import { useState, useRef } from "react";
import Link from "next/link";

const POSITIONS = [
  "GOALKEEPER","LEFT_BACK","RIGHT_BACK","LEFT_WING","RIGHT_WING","CENTRE_BACK","PIVOT","CENTRE_FORWARD"
];
const COUNTRIES = [
  "Bosnia and Herzegovina","Serbia","Croatia","Slovenia","Montenegro","North Macedonia",
  "Germany","France","Spain","Denmark","Sweden","Norway","Hungary","Poland","Romania",
  "Austria","Switzerland","Portugal","Netherlands","Belgium","Czech Republic","Slovakia",
  "Qatar","Bahrain","Saudi Arabia","Kuwait","UAE","Egypt","Tunisia","Algeria","Morocco",
  "Brazil","Argentina","United States","Other"
];
const VERIF_COLORS: Record<string, string> = {
  UNVERIFIED: "badge-muted", PENDING: "badge-accent", VERIFIED: "badge-green", REJECTED: "badge-red",
};

function posLabel(p: string) {
  return p.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

const EMPTY_EDIT_FORM = {
  firstName: "", lastName: "", dateOfBirth: "", nationality: "", position: "CENTRE_BACK",
  heightCm: "", weightKg: "", dominantHand: "RIGHT", currentClub: "", bio: "",
  phone: "", isAvailable: true, expectedSalaryMin: "", expectedSalaryMax: "",
};

export default function AgentDashboardClient({ agent }: { agent: any }) {
  const [tab, setTab] = useState<"players" | "settings">("players");
  const [players, setPlayers] = useState<any[]>(agent.players ?? []);

  // Add Player modal (simple — redirects to onboarding)
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ firstName: "", lastName: "" });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");

  // Edit Player modal (full form)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_EDIT_FORM });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Verification modal
  const [verifyPlayer, setVerifyPlayer] = useState<{ id: string; name: string; status: string } | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");
  const docInputRef = useRef<HTMLInputElement>(null);
  const contractInputRef = useRef<HTMLInputElement>(null);

  // Settings form
  const [settings, setSettings] = useState({
    firstName: agent.firstName ?? "",
    lastName: agent.lastName ?? "",
    phone: agent.phone ?? "",
    country: agent.country ?? "",
    website: agent.website ?? "",
    licenseNumber: agent.licenseNumber ?? "",
    bio: agent.bio ?? "",
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  function openAdd() {
    setAddForm({ firstName: "", lastName: "" });
    setAddError("");
    setShowAddModal(true);
  }

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.firstName.trim() || !addForm.lastName.trim()) {
      setAddError("Please enter first and last name."); return;
    }
    setAddSaving(true); setAddError("");
    const res = await fetch("/api/agent/players", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName: addForm.firstName.trim(), lastName: addForm.lastName.trim() }),
    });
    const data = await res.json();
    setAddSaving(false);
    if (!res.ok) { setAddError(data.error ?? "Failed to create player."); return; }
    // Redirect to onboarding flow
    window.location.href = `/onboarding/agent-player/${data.player.id}`;
  }

  function openEdit(p: any) {
    setEditingId(p.id);
    setEditForm({
      firstName: p.firstName ?? "",
      lastName: p.lastName ?? "",
      dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().slice(0, 10) : "",
      nationality: p.nationality === "Unknown" ? "" : (p.nationality ?? ""),
      position: p.position ?? "CENTRE_BACK",
      heightCm: p.heightCm === 185 ? "" : (p.heightCm?.toString() ?? ""),
      weightKg: p.weightKg === 85 ? "" : (p.weightKg?.toString() ?? ""),
      dominantHand: p.dominantHand ?? "RIGHT",
      currentClub: p.currentClub ?? "",
      bio: p.bio ?? "",
      phone: p.phone ?? "",
      isAvailable: p.isAvailable ?? true,
      expectedSalaryMin: p.expectedSalaryMin?.toString() ?? "",
      expectedSalaryMax: p.expectedSalaryMax?.toString() ?? "",
    });
    setEditError("");
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditSaving(true); setEditError("");
    const res = await fetch(`/api/agent/players/${editingId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm),
    });
    const data = await res.json();
    setEditSaving(false);
    if (!res.ok) { setEditError(data.error ?? "Failed to save."); return; }
    setPlayers(ps => ps.map(p => p.id === editingId ? { ...p, ...data.player } : p));
    setEditingId(null);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    await fetch(`/api/agent/players/${confirmDelete.id}`, { method: "DELETE" });
    setDeleting(false);
    setPlayers(ps => ps.filter(p => p.id !== confirmDelete.id));
    setConfirmDelete(null);
  }

  async function handleVerifySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!verifyPlayer) return;
    if (!docFile) { setVerifyMsg("Player identity document is required."); return; }
    if (!contractFile) { setVerifyMsg("Signed contract is required."); return; }
    setVerifying(true); setVerifyMsg("");
    const fd = new FormData();
    fd.append("document", docFile);
    fd.append("contract", contractFile);
    const res = await fetch(`/api/agent/players/${verifyPlayer.id}/verify`, { method: "POST", body: fd });
    const data = await res.json();
    setVerifying(false);
    if (res.ok) {
      setPlayers(ps => ps.map(p => p.id === verifyPlayer.id ? { ...p, verificationStatus: "PENDING" } : p));
      setVerifyPlayer(null);
      setDocFile(null); setContractFile(null);
    } else {
      setVerifyMsg(data.error ?? "Upload failed. Please try again.");
    }
  }

  async function handleSettingsSave(e: React.FormEvent) {
    e.preventDefault();
    setSettingsSaving(true);
    await fetch("/api/agent/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings),
    });
    setSettingsSaving(false);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  }

  function setEditField(k: string, v: any) { setEditForm(f => ({ ...f, [k]: v })); }

  const stats = {
    total: players.length,
    verified: players.filter(p => p.verificationStatus === "VERIFIED").length,
    pending: players.filter(p => p.verificationStatus === "PENDING").length,
    available: players.filter(p => p.isAvailable).length,
  };

  return (
    <div className="page" style={{ padding: "80px 24px 60px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="section-label">Agent Dashboard</div>
          <h2 style={{ margin: 0 }}>{agent.firstName} {agent.lastName}</h2>
          {agent.country && <p style={{ color: "var(--muted)", margin: "4px 0 0", fontSize: "0.9rem" }}>📍 {agent.country}</p>}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-outline" onClick={() => setTab("settings")} style={{ fontSize: "0.85rem" }}>⚙️ Settings</button>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Player</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 32 }}>
        {[
          { label: "Total Players", val: stats.total },
          { label: "Verified", val: stats.verified },
          { label: "Pending", val: stats.pending, alert: stats.pending > 0 },
          { label: "Available", val: stats.available },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: "center", borderColor: (s as any).alert ? "rgba(232,255,71,0.4)" : undefined }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "2.2rem", color: (s as any).alert ? "var(--accent)" : "var(--white)", lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        {(["players", "settings"] as const).map(t => (
          <button key={t} className={`tab-btn${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
            {t === "players" ? `👤 My Players (${players.length})` : "⚙️ Settings"}
          </button>
        ))}
      </div>

      {/* Players tab */}
      {tab === "players" && (
        <div>
          {players.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
              <div style={{ fontSize: "3rem", marginBottom: 16 }}>👤</div>
              <h4 style={{ marginBottom: 8 }}>No Players Yet</h4>
              <p style={{ color: "var(--muted)", marginBottom: 24 }}>Add your first player to start managing their career.</p>
              <button className="btn btn-primary" onClick={openAdd}>+ Add First Player</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {players.map(p => (
                <div key={p.id} className="card" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  {/* Photo */}
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--card2)", border: "2px solid var(--border)", overflow: "hidden", flexShrink: 0 }}>
                    {p.photoUrl
                      ? <img src={p.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem" }}>👤</div>
                    }
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.05rem", textTransform: "uppercase" }}>
                      {p.firstName} {p.lastName}
                    </div>
                    {p.onboardingCompleted ? (
                      <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: 2 }}>
                        {posLabel(p.position ?? "—")} · {p.nationality === "Unknown" ? "—" : (p.nationality ?? "—")} · {p.heightCm}cm
                        {p.currentClub && ` · ${p.currentClub}`}
                      </div>
                    ) : (
                      <div style={{ fontSize: "0.78rem", color: "var(--accent)", marginTop: 2 }}>
                        ⚠️ Profile setup not completed
                      </div>
                    )}
                  </div>
                  {/* Badges */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {!p.onboardingCompleted && (
                      <span className="badge badge-accent">Incomplete</span>
                    )}
                    <span className={`badge ${VERIF_COLORS[p.verificationStatus]}`}>{p.verificationStatus}</span>
                    <span className={`badge ${p.isAvailable ? "badge-green" : "badge-muted"}`}>
                      {p.isAvailable ? "Available" : "Unavailable"}
                    </span>
                  </div>
                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {!p.onboardingCompleted ? (
                      <Link href={`/onboarding/agent-player/${p.id}`} className="btn btn-primary" style={{ fontSize: "0.75rem", padding: "6px 12px" }}>
                        Continue Setup →
                      </Link>
                    ) : (
                      <>
                        <Link href={`/players/${p.slug}`} target="_blank" className="btn btn-outline" style={{ fontSize: "0.75rem", padding: "6px 12px" }}>
                          View ↗
                        </Link>
                        {p.verificationStatus !== "VERIFIED" && p.verificationStatus !== "PENDING" && (
                          <button className="btn btn-primary" style={{ fontSize: "0.75rem", padding: "6px 12px" }}
                            onClick={() => { setVerifyPlayer({ id: p.id, name: `${p.firstName} ${p.lastName}`, status: p.verificationStatus }); setDocFile(null); setContractFile(null); setVerifyMsg(""); }}>
                            🔐 Verify
                          </button>
                        )}
                        {p.verificationStatus === "PENDING" && (
                          <span className="badge badge-accent" style={{ fontSize: "0.72rem", padding: "6px 10px" }}>⏳ Pending Review</span>
                        )}
                      </>
                    )}
                    <Link href={`/dashboard/agent/player/${p.id}/edit`} className="btn btn-outline" style={{ fontSize: "0.75rem", padding: "6px 12px" }}>
                      ✏️ Edit
                    </Link>
                    <button className="btn btn-danger" style={{ fontSize: "0.75rem", padding: "6px 10px" }} onClick={() => setConfirmDelete({ id: p.id, name: `${p.firstName} ${p.lastName}` })}>
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings tab */}
      {tab === "settings" && (
        <div className="card" style={{ maxWidth: 560 }}>
          <h4 style={{ marginBottom: 20, textTransform: "uppercase" }}>Agent Profile</h4>
          <form onSubmit={handleSettingsSave}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="label">First Name</label>
                <input className="input" value={settings.firstName} onChange={e => setSettings(s => ({ ...s, firstName: e.target.value }))} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="label">Last Name</label>
                <input className="input" value={settings.lastName} onChange={e => setSettings(s => ({ ...s, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="label">Country</label>
              <select className="input" value={settings.country} onChange={e => setSettings(s => ({ ...s, country: e.target.value }))}>
                <option value="">Select…</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Phone</label>
              <input className="input" value={settings.phone} onChange={e => setSettings(s => ({ ...s, phone: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Website</label>
              <input className="input" value={settings.website} onChange={e => setSettings(s => ({ ...s, website: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">License Number</label>
              <input className="input" value={settings.licenseNumber} onChange={e => setSettings(s => ({ ...s, licenseNumber: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Bio</label>
              <textarea className="input" rows={3} value={settings.bio} onChange={e => setSettings(s => ({ ...s, bio: e.target.value }))} style={{ resize: "vertical" }} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={settingsSaving} style={{ justifyContent: "center" }}>
              {settingsSaving ? <><span className="spinner" /> Saving…</> : settingsSaved ? "✓ Saved!" : "Save Changes"}
            </button>
          </form>
        </div>
      )}

      {/* ── Add Player Modal (simple: first + last name only, then redirect to onboarding) ── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" style={{ maxWidth: 440, width: "100%" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>Add Player</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.4rem", cursor: "pointer" }}>✕</button>
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem", lineHeight: 1.6, marginBottom: 20 }}>
              Enter the player&apos;s name to get started. You&apos;ll complete the full profile in the next step using our 10-step setup wizard.
            </p>
            <form onSubmit={handleAddPlayer}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">First Name <span style={{ color: "var(--accent)" }}>*</span></label>
                  <input className="input" value={addForm.firstName} onChange={e => setAddForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Ivan" autoFocus />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Last Name <span style={{ color: "var(--accent)" }}>*</span></label>
                  <input className="input" value={addForm.lastName} onChange={e => setAddForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Petrović" />
                </div>
              </div>
              {addError && (
                <div style={{ background: "rgba(255,59,59,0.1)", border: "1px solid rgba(255,59,59,0.3)", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: "0.85rem", color: "var(--red)", marginBottom: 16 }}>
                  {addError}
                </div>
              )}
              <div style={{ display: "flex", gap: 12 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={addSaving}>
                  {addSaving ? <><span className="spinner" /> Creating…</> : "Create & Setup Profile →"}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Player Modal (full form) ── */}
      {editingId && (
        <div className="modal-overlay" onClick={() => setEditingId(null)}>
          <div className="modal" style={{ maxWidth: 640, width: "100%", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>Edit Player</h3>
              <button onClick={() => setEditingId(null)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.4rem", cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={handleEditSave}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">First Name</label>
                  <input className="input" value={editForm.firstName} onChange={e => setEditField("firstName", e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Last Name</label>
                  <input className="input" value={editForm.lastName} onChange={e => setEditField("lastName", e.target.value)} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Date of Birth</label>
                  <input className="input" type="date" value={editForm.dateOfBirth} onChange={e => setEditField("dateOfBirth", e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Nationality</label>
                  <select className="input" value={editForm.nationality} onChange={e => setEditField("nationality", e.target.value)}>
                    <option value="">Select…</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="label">Position</label>
                <select className="input" value={editForm.position} onChange={e => setEditField("position", e.target.value)}>
                  {POSITIONS.map(p => <option key={p} value={p}>{posLabel(p)}</option>)}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Height (cm)</label>
                  <input className="input" type="number" min={150} max={230} value={editForm.heightCm} onChange={e => setEditField("heightCm", e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Weight (kg)</label>
                  <input className="input" type="number" min={50} max={150} value={editForm.weightKg} onChange={e => setEditField("weightKg", e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Dom. Hand</label>
                  <select className="input" value={editForm.dominantHand} onChange={e => setEditField("dominantHand", e.target.value)}>
                    <option value="RIGHT">Right</option>
                    <option value="LEFT">Left</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="label">Current Club</label>
                <input className="input" value={editForm.currentClub} onChange={e => setEditField("currentClub", e.target.value)} placeholder="Free Agent if empty" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Expected Salary Min (€)</label>
                  <input className="input" type="number" value={editForm.expectedSalaryMin} onChange={e => setEditField("expectedSalaryMin", e.target.value)} placeholder="0" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Expected Salary Max (€)</label>
                  <input className="input" type="number" value={editForm.expectedSalaryMax} onChange={e => setEditField("expectedSalaryMax", e.target.value)} placeholder="0" />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="label">Phone</label>
                <input className="input" value={editForm.phone} onChange={e => setEditField("phone", e.target.value)} placeholder="+387 61 000 000" />
              </div>

              <div className="form-group">
                <label className="label">Bio</label>
                <textarea className="input" rows={3} value={editForm.bio} onChange={e => setEditField("bio", e.target.value)}
                  style={{ resize: "vertical" }} placeholder="Player description, strengths…" />
              </div>

              <div className="form-group">
                <label className="label">Availability</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {([true, false] as const).map(v => (
                    <button key={String(v)} type="button" onClick={() => setEditField("isAvailable", v)} style={{
                      flex: 1, padding: "10px", borderRadius: "var(--radius)", fontFamily: "var(--font-display)",
                      fontWeight: 700, fontSize: "0.82rem", textTransform: "uppercase", cursor: "pointer",
                      background: editForm.isAvailable === v ? "var(--accent)" : "var(--card2)",
                      color: editForm.isAvailable === v ? "var(--black)" : "var(--muted)",
                      border: editForm.isAvailable === v ? "none" : "1px solid var(--border)",
                    }}>
                      {v ? "✓ Available" : "✕ Not Available"}
                    </button>
                  ))}
                </div>
              </div>

              {editError && (
                <div style={{ background: "rgba(255,59,59,0.1)", border: "1px solid rgba(255,59,59,0.3)", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: "0.85rem", color: "var(--red)", marginBottom: 16 }}>
                  {editError}
                </div>
              )}

              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={editSaving}>
                  {editSaving ? <><span className="spinner" /> Saving…</> : "Save Changes"}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Verification Modal ── */}
      {verifyPlayer && (
        <div className="modal-overlay" onClick={() => { setVerifyPlayer(null); setDocFile(null); setContractFile(null); setVerifyMsg(""); }}>
          <div className="modal" style={{ maxWidth: 500, width: "100%" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>🔐 Verify Player</h3>
              <button onClick={() => { setVerifyPlayer(null); setDocFile(null); setContractFile(null); setVerifyMsg(""); }} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.4rem", cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.05rem", textTransform: "uppercase", marginBottom: 6 }}>{verifyPlayer.name}</div>
              <p style={{ color: "var(--muted)", fontSize: "0.85rem", lineHeight: 1.6, margin: 0 }}>
                To verify this player, upload their identity document (passport or national ID) and the signed representation contract between you and the player. The admin will review and approve the verification.
              </p>
            </div>

            <form onSubmit={handleVerifySubmit}>
              {/* Document upload */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: "0.75rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontFamily: "var(--font-mono)" }}>
                  Player Identity Document <span style={{ color: "var(--accent)" }}>*</span>
                </div>
                <div style={{ background: "var(--card2)", border: `2px dashed ${docFile ? "var(--accent)" : "var(--border)"}`, borderRadius: "var(--radius)", padding: "16px", textAlign: "center", cursor: "pointer" }}
                  onClick={() => docInputRef.current?.click()}>
                  <input ref={docInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style={{ display: "none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) setDocFile(f); }} />
                  {docFile ? (
                    <div style={{ fontSize: "0.85rem", color: "var(--white)" }}>✓ {docFile.name}</div>
                  ) : (
                    <>
                      <div style={{ fontSize: "1.5rem", marginBottom: 6 }}>🪪</div>
                      <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>Click to upload passport or ID card</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 4 }}>JPEG, PNG, WebP or PDF · max 15 MB</div>
                    </>
                  )}
                </div>
              </div>

              {/* Contract upload */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: "0.75rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontFamily: "var(--font-mono)" }}>
                  Signed Agent-Player Contract <span style={{ color: "var(--accent)" }}>*</span>
                </div>
                <div style={{ background: "var(--card2)", border: `2px dashed ${contractFile ? "var(--accent)" : "var(--border)"}`, borderRadius: "var(--radius)", padding: "16px", textAlign: "center", cursor: "pointer" }}
                  onClick={() => contractInputRef.current?.click()}>
                  <input ref={contractInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style={{ display: "none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) setContractFile(f); }} />
                  {contractFile ? (
                    <div style={{ fontSize: "0.85rem", color: "var(--white)" }}>✓ {contractFile.name}</div>
                  ) : (
                    <>
                      <div style={{ fontSize: "1.5rem", marginBottom: 6 }}>📄</div>
                      <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>Click to upload signed contract</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 4 }}>JPEG, PNG, WebP or PDF · max 15 MB</div>
                    </>
                  )}
                </div>
              </div>

              {verifyMsg && (
                <div style={{ background: "rgba(255,59,59,0.1)", border: "1px solid rgba(255,59,59,0.3)", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: "0.85rem", color: "var(--red)", marginBottom: 16 }}>
                  {verifyMsg}
                </div>
              )}

              <div style={{ display: "flex", gap: 12 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={verifying}>
                  {verifying ? <><span className="spinner" /> Submitting…</> : "Submit for Verification"}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => { setVerifyPlayer(null); setDocFile(null); setContractFile(null); setVerifyMsg(""); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h4 style={{ textTransform: "uppercase", marginBottom: 8, color: "var(--red)" }}>⚠ Remove Player</h4>
            <p style={{ fontSize: "0.88rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: 20 }}>
              Are you sure you want to remove <strong style={{ color: "var(--white)" }}>{confirmDelete.name}</strong> from your roster? This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn btn-danger" style={{ flex: 1, justifyContent: "center" }} onClick={handleDelete} disabled={deleting}>
                {deleting ? <><span className="spinner" /> Deleting…</> : "🗑 Remove"}
              </button>
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={() => setConfirmDelete(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
