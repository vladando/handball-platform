"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ width: "100%", maxWidth: 420, padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <Link href="/" style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.6rem", textTransform: "uppercase" }}>
            Handball<span style={{ color: "var(--accent)" }}>Hub</span>
          </Link>
          <h3 style={{ marginTop: 24, marginBottom: 8 }}>Forgot Password</h3>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {sent ? (
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>&#128231;</div>
            <h4 style={{ marginBottom: 12 }}>Check your email</h4>
            <p style={{ color: "var(--muted)", fontSize: "0.88rem", lineHeight: 1.7, marginBottom: 24 }}>
              If an account exists for <strong style={{ color: "var(--white)" }}>{email}</strong>,
              you will receive a password reset link shortly.
            </p>
            <Link href="/auth/login" className="btn btn-primary" style={{ justifyContent: "center" }}>
              Back to Login
            </Link>
          </div>
        ) : (
          <div className="card">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="label">Email address</label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                  autoFocus
                />
              </div>
              {error && (
                <div style={{ background: "rgba(255,59,59,0.1)", border: "1px solid rgba(255,59,59,0.3)", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: "0.85rem", color: "var(--red)", marginBottom: 16 }}>
                  {error}
                </div>
              )}
              <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={loading}>
                {loading ? <><span className="spinner" /> Sending…</> : "Send Reset Link →"}
              </button>
            </form>
          </div>
        )}

        <p style={{ textAlign: "center", marginTop: 20, fontSize: "0.85rem", color: "var(--muted)" }}>
          Remember your password? <Link href="/auth/login" style={{ color: "var(--accent)" }}>Sign in →</Link>
        </p>
      </div>
    </main>
  );
}
