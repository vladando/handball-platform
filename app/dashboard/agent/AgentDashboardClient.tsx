"use client";
import { useState } from "react";
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

const EMPTY_FORM = {
  firstName: "", lastName: "", dateOfBirth: "", nationality: "", position: "CENTRE_BACK",
  heightCm: "", weightKg: "", dominantHand: "RIGHT", currentClub: "", bio: "",
  phone: "", isAvailable: true, expectedSalaryMin: "", expectedSalaryMax: "",
};

export default function AgentDashboardClient({ agent }: { agent: any }) {
  const [tab, setTab] = useState<"players" | "settings">("players");
  const [players, setPlayers] = useState<any[]>(agent.players ?? []);

  // Add/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  function setField(k: string, v: any) { setForm(f => ({ ...f, [k]: v })); }

  function openAdd() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setFormError("");
    setShowModal(true);
  }

  function openEdit(p: any) {
    setEditingId(p.id);
    setForm({
      firstName: p.firstName ?? "",
      lastName: p.lastName ?? "",
      dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().slice(0, 10) : "",
      nationality: p.nationality ?? "",
      position: p.position ?? "CENTRE_BACK",
      heightCm: p.heightCm?.toString() ?? "",
      weightKg: p.weightKg?.toString() ?? "",
      dominantHand: p.dominantHand ?? "RIGHT",
      currentClub: p.currentClub ?? "",
      bio: p.bio ?? "",
      phone: p.phone ?? "",
      isAvailable: p.isAvailable ?? true,
      expectedSalaryMin: p.expectedSalaryMin?.toString() ?? "",
      expectedSalaryMax: p.expectedSalaryMax?.toString() ?? "",
    });
    setFormError("");
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.dateOfBirth || !form.nationality || !form.heightCm || !form.weightKg) {
      setFormError("Please fill in all required fields."); return;
    }
    setSaving(true); setFormError("");
    let res: Response;
    if (editingId) {
      res = await fetch(`/api/agent/players/${editingId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
    } else {
      res = await fetch("/api/agent/players", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
    }
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setFormError(data.error ?? "Failed to save."); return; }
    if (editingId) {
      setPlayers(ps => ps.map(p => p.id === editingId ? { ...p, ...data.player } : p));
    } else {
      setPlayers(ps => [data.player, ...ps]);
    }
    setShowModal(false);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    await fetch(`/api/agent/players/${confirmDelete.id}`, { method: "DELETE" });
    setDeleting(false);
    setPlayers(ps => ps.filter(p => p.id !== confirmDelete.id));
    setConfirmDelete(null);
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
                    <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: 2 }}>
                      {posLabel(p.position)} · {p.nationality} · {p.heightCm}cm
                      {p.currentClub && ` · ${p.currentClub}`}
                    </div>
                  </div>
                  {/* Badges */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span className={`badge ${VERIF_COLORS[p.verificationStatus]}`}>{p.verificationStatus}</span>
                    <span className={`badge ${p.isAvailable ? "badge-green" : "badge-muted"}`}>
                      {p.isAvailable ? "Available" : "Unavailable"}
                    </span>
                  </div>
                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <Link href={`/players/${p.slug}`} target="_blank" className="btn btn-outline" style={{ fontSize: "0.75rem", padding: "6px 12px" }}>
                      View ↗
                    </Link>
                    <button className="btn btn-outline" style={{ fontSize: "0.75rem", padding: "6px 12px" }} onClick={() => openEdit(p)}>
                      ✏️ Edit
                    </button>
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 640, width: "100%", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>{editingId ? "Edit Player" : "Add Player"}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.4rem", cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">First Name <span style={{ color: "var(--accent)" }}>*</span></label>
                  <input className="input" value={form.firstName} onChange={e => setField("firstName", e.target.value)} required />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Last Name <span style={{ color: "var(--accent)" }}>*</span></label>
                  <input className="input" value={form.lastName} onChange={e => setField("lastName", e.target.value)} required />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Date of Birth <span style={{ color: "var(--accent)" }}>*</span></label>
                  <input className="input" type="date" value={form.dateOfBirth} onChange={e => setField("dateOfBirth", e.target.value)} required />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Nationality <span style={{ color: "var(--accent)" }}>*</span></label>
                  <select className="input" value={form.nationality} onChange={e => setField("nationality", e.target.value)} required>
                    <option value="">Select…</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="label">Position <span style={{ color: "var(--accent)" }}>*</span></label>
                <select className="input" value={form.position} onChange={e => setField("position", e.target.value)}>
                  {POSITIONS.map(p => <option key={p} value={p}>{posLabel(p)}</option>)}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Height (cm) <span style={{ color: "var(--accent)" }}>*</span></label>
                  <input className="input" type="number" min={150} max={230} value={form.heightCm} onChange={e => setField("heightCm", e.target.value)} required />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Weight (kg) <span style={{ color: "var(--accent)" }}>*</span></label>
                  <input className="input" type="number" min={50} max={150} value={form.weightKg} onChange={e => setField("weightKg", e.target.value)} required />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Dom. Hand</label>
                  <select className="input" value={form.dominantHand} onChange={e => setField("dominantHand", e.target.value)}>
                    <option value="RIGHT">Right</option>
                    <option value="LEFT">Left</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="label">Current Club</label>
                <input className="input" value={form.currentClub} onChange={e => setField("currentClub", e.target.value)} placeholder="Free Agent if empty" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Expected Salary Min (€)</label>
                  <input className="input" type="number" value={form.expectedSalaryMin} onChange={e => setField("expectedSalaryMin", e.target.value)} placeholder="0" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Expected Salary Max (€)</label>
                  <input className="input" type="number" value={form.expectedSalaryMax} onChange={e => setField("expectedSalaryMax", e.target.value)} placeholder="0" />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="label">Phone</label>
                <input className="input" value={form.phone} onChange={e => setField("phone", e.target.value)} placeholder="+387 61 000 000" />
              </div>

              <div className="form-group">
                <label className="label">Bio</label>
                <textarea className="input" rows={3} value={form.bio} onChange={e => setField("bio", e.target.value)}
                  style={{ resize: "vertical" }} placeholder="Player description, strengths…" />
              </div>

              <div className="form-group">
                <label className="label">Availability</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {([true, false] as const).map(v => (
                    <button key={String(v)} type="button" onClick={() => setField("isAvailable", v)} style={{
                      flex: 1, padding: "10px", borderRadius: "var(--radius)", fontFamily: "var(--font-display)",
                      fontWeight: 700, fontSize: "0.82rem", textTransform: "uppercase", cursor: "pointer",
                      background: form.isAvailable === v ? "var(--accent)" : "var(--card2)",
                      color: form.isAvailable === v ? "var(--black)" : "var(--muted)",
                      border: form.isAvailable === v ? "none" : "1px solid var(--border)",
                    }}>
                      {v ? "✓ Available" : "✕ Not Available"}
                    </button>
                  ))}
                </div>
              </div>

              {formError && (
                <div style={{ background: "rgba(255,59,59,0.1)", border: "1px solid rgba(255,59,59,0.3)", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: "0.85rem", color: "var(--red)", marginBottom: 16 }}>
                  {formError}
                </div>
              )}

              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={saving}>
                  {saving ? <><span className="spinner" /> Saving…</> : editingId ? "Save Changes" : "Add Player"}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
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
