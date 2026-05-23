"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const COUNTRIES = [
  "Bosnia and Herzegovina","Serbia","Croatia","Slovenia","Montenegro","North Macedonia",
  "Germany","France","Spain","Denmark","Sweden","Norway","Hungary","Poland","Romania",
  "Austria","Switzerland","Portugal","Netherlands","Belgium","Czech Republic","Slovakia",
  "Qatar","Bahrain","Saudi Arabia","Kuwait","UAE","Egypt","Tunisia","Algeria","Morocco",
  "Brazil","Argentina","United States","Other"
];

export default function AgentOnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "", country: "", website: "", licenseNumber: "", bio: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.country) {
      setError("Please fill in all required fields."); return;
    }
    setLoading(true); setError("");
    const res = await fetch("/api/agent/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, onboardingCompleted: true }),
    });
    setLoading(false);
    if (!res.ok) { setError("Failed to save profile."); return; }
    router.push("/dashboard/agent");
  }

  return (
    <main className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "40px 24px" }}>
      <div style={{ width: "100%", maxWidth: 560 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <Link href="/" style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.6rem", textTransform: "uppercase" }}>
            Handball<span style={{ color: "var(--accent)" }}>Hub</span>
          </Link>
          <h3 style={{ marginTop: 24, marginBottom: 8 }}>Set Up Agent Profile</h3>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Complete your profile to start managing players</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="label">First Name <span style={{ color: "var(--accent)" }}>*</span></label>
                <input className="input" value={form.firstName} onChange={e => set("firstName", e.target.value)} placeholder="Marko" required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="label">Last Name <span style={{ color: "var(--accent)" }}>*</span></label>
                <input className="input" value={form.lastName} onChange={e => set("lastName", e.target.value)} placeholder="Nikolić" required />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="label">Country <span style={{ color: "var(--accent)" }}>*</span></label>
              <select className="input" value={form.country} onChange={e => set("country", e.target.value)} required>
                <option value="">Select country…</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+387 61 000 000" />
            </div>

            <div className="form-group">
              <label className="label">Website / Social</label>
              <input className="input" value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://..." />
            </div>

            <div className="form-group">
              <label className="label">License / Certification Number</label>
              <input className="input" value={form.licenseNumber} onChange={e => set("licenseNumber", e.target.value)} placeholder="Optional — FIFA license, national federation, etc." />
            </div>

            <div className="form-group">
              <label className="label">Bio</label>
              <textarea className="input" rows={3} value={form.bio} onChange={e => set("bio", e.target.value)}
                placeholder="Brief description of your agency and experience…"
                style={{ resize: "vertical", minHeight: 80 }} />
            </div>

            {error && (
              <div style={{ background: "rgba(255,59,59,0.1)", border: "1px solid rgba(255,59,59,0.3)", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: "0.85rem", color: "var(--red)", marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={loading}>
              {loading ? <><span className="spinner" /> Saving…</> : "Complete Setup →"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
