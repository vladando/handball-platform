"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const params = useSearchParams();
  const defaultRole = (params.get("role") ?? "PLAYER") as "PLAYER" | "CLUB";
  const [role, setRole] = useState<"PLAYER" | "CLUB">(defaultRole);
  const [form, setForm] = useState({ email:"", password:"", name:"", confirmPassword:"" });
  const [gender, setGender] = useState<"MALE"|"FEMALE">("MALE");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, password: form.password, name: form.name, role, gender: role === "CLUB" ? gender : undefined }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Registration failed."); return; }
    router.push(`/auth/login?registered=1&next=/onboarding/${role.toLowerCase()}`);
  }

  return (
    <main className="page" style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", padding:"40px 24px" }}>
      <div style={{ width:"100%", maxWidth:460 }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <Link href="/" style={{ fontFamily:"var(--font-display)", fontWeight:900, fontSize:"1.6rem", textTransform:"uppercase" }}>
            Handball<span style={{ color:"var(--accent)" }}>Hub</span>
          </Link>
          <h3 style={{ marginTop:24, marginBottom:8 }}>Create Account</h3>
          <p style={{ color:"var(--muted)", fontSize:"0.9rem" }}>Join the handball transfer marketplace</p>
        </div>

        {/* Role selector */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:24 }}>
          {(["PLAYER","CLUB"] as const).map(r => (
            <button key={r} type="button" onClick={() => setRole(r)} style={{
              padding:"14px", borderRadius:"var(--radius)", fontFamily:"var(--font-display)",
              fontWeight:700, fontSize:"0.9rem", letterSpacing:"0.05em", textTransform:"uppercase",
              cursor:"pointer", transition:"all 0.15s",
              background: role === r ? "var(--accent)" : "var(--card)",
              color: role === r ? "var(--black)" : "var(--muted)",
              border: role === r ? "none" : "1px solid var(--border)",
            }}>
              {r === "PLAYER" ? "👤 Player" : "🏟 Club"}
            </button>
          ))}
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">{role === "PLAYER" ? "Full Name" : "Club Name"}</label>
              <input className="input" value={form.name} onChange={e => set("name", e.target.value)}
                placeholder={role === "PLAYER" ? "Ivan Petrović" : "RK Zagreb"} required />
            </div>

            {/* Gender selector — clubs only */}
            {role === "CLUB" && (
              <div className="form-group">
                <label className="label">Club Type <span style={{ color:"var(--accent)" }}>*</span></label>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {(["MALE","FEMALE"] as const).map(g => (
                    <button key={g} type="button" onClick={() => setGender(g)} style={{
                      padding:"11px", borderRadius:"var(--radius)", fontFamily:"var(--font-display)",
                      fontWeight:700, fontSize:"0.82rem", letterSpacing:"0.04em", textTransform:"uppercase",
                      cursor:"pointer", transition:"all 0.15s",
                      background: gender === g ? "var(--accent)" : "var(--card2)",
                      color: gender === g ? "var(--black)" : "var(--muted)",
                      border: gender === g ? "none" : "1px solid var(--border)",
                    }}>
                      {g === "MALE" ? "♂ Men's Club" : "♀ Women's Club"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="you@email.com" required />
            </div>
            <div className="form-group">
              <label className="label">Password</label>
              <input className="input" type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Min 8 characters" required />
            </div>
            <div className="form-group">
              <label className="label">Confirm Password</label>
              <input className="input" type="password" value={form.confirmPassword} onChange={e => set("confirmPassword", e.target.value)} placeholder="Repeat password" required />
            </div>
            {role === "CLUB" && (
              <div style={{ background:"rgba(232,255,71,0.05)", border:"1px solid rgba(232,255,71,0.15)", borderRadius:"var(--radius)", padding:"12px 16px", fontSize:"0.82rem", color:"rgba(245,243,238,0.6)", marginBottom:20 }}>
                ℹ Club accounts require admin verification before accessing the player database.
              </div>
            )}
            {error && (
              <div style={{ background:"rgba(255,59,59,0.1)", border:"1px solid rgba(255,59,59,0.3)", borderRadius:"var(--radius)", padding:"10px 14px", fontSize:"0.85rem", color:"var(--red)", marginBottom:16 }}>
                {error}
              </div>
            )}
            <button type="submit" className="btn btn-primary" style={{ width:"100%", justifyContent:"center" }} disabled={loading}>
              {loading ? <><span className="spinner" /> Creating…</> : `Create ${role === "PLAYER" ? "Player" : "Club"} Account`}
            </button>
          </form>
        </div>
        <p style={{ textAlign:"center", marginTop:20, fontSize:"0.85rem", color:"var(--muted)" }}>
          Already registered? <Link href="/auth/login" style={{ color:"var(--accent)" }}>Sign in →</Link>
        </p>
      </div>
    </main>
  );
}
