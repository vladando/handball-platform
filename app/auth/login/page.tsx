"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) setError("Invalid email or password.");
    else {
      const next = params.get("next");
      router.push(next ?? "/");
      router.refresh();
    }
  }

  return (
    <main className="page" style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}>
      <div style={{ width:"100%", maxWidth:420, padding:"0 24px" }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <Link href="/" style={{ fontFamily:"var(--font-display)", fontWeight:900, fontSize:"1.6rem", textTransform:"uppercase" }}>
            Handball<span style={{ color:"var(--accent)" }}>Hub</span>
          </Link>
          <h3 style={{ marginTop:24, marginBottom:8 }}>Welcome Back</h3>
          <p style={{ color:"var(--muted)", fontSize:"0.9rem" }}>Sign in to your account</p>
          {params.get("registered") && (
            <div style={{ marginTop:12, padding:"10px 14px", background:"rgba(0,200,100,0.1)", border:"1px solid rgba(0,200,100,0.3)", borderRadius:"var(--radius)", fontSize:"0.85rem", color:"#00c864" }}>
              Account created! Sign in below.
            </div>
          )}
        </div>
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required />
            </div>
            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label className="label" style={{ marginBottom: 0 }}>Password</label>
                <Link href="/auth/forgot-password" style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Forgot password?</Link>
              </div>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            {error && (
              <div style={{ background:"rgba(255,59,59,0.1)", border:"1px solid rgba(255,59,59,0.3)", borderRadius:"var(--radius)", padding:"10px 14px", fontSize:"0.85rem", color:"var(--red)", marginBottom:16 }}>
                {error}
              </div>
            )}
            <button type="submit" className="btn btn-primary" style={{ width:"100%", justifyContent:"center" }} disabled={loading}>
              {loading ? <><span className="spinner" /> Signing in…</> : "Sign In"}
            </button>
          </form>
        </div>
        <p style={{ textAlign:"center", marginTop:20, fontSize:"0.85rem", color:"var(--muted)" }}>
          No account? <Link href="/auth/register" style={{ color:"var(--accent)" }}>Join free →</Link>
        </p>
        <p style={{ textAlign:"center", marginTop:10, fontSize:"0.85rem", color:"var(--muted)" }}>
          <Link href="/auth/forgot-password" style={{ color:"var(--muted)" }}>Forgot your password?</Link>
        </p>
      </div>
    </main>
  );
}
