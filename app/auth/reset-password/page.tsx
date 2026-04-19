"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (!token) setError("Invalid reset link. Please request a new one.");
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
      setSuccess(true);
      setTimeout(() => router.push("/auth/login"), 3000);
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
          <h3 style={{ marginTop: 24, marginBottom: 8 }}>Set New Password</h3>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Choose a strong new password for your account.</p>
        </div>

        {success ? (
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>&#10003;</div>
            <h4 style={{ marginBottom: 12, color: "#00c864" }}>Password updated!</h4>
            <p style={{ color: "var(--muted)", fontSize: "0.88rem", lineHeight: 1.7, marginBottom: 24 }}>
              Your password has been changed. Redirecting to login…
            </p>
            <Link href="/auth/login" className="btn btn-primary" style={{ justifyContent: "center" }}>
              Sign In Now
            </Link>
          </div>
        ) : (
          <div className="card">
            {!token ? (
              <div style={{ textAlign: "center" }}>
                <p style={{ color: "var(--red)", marginBottom: 20 }}>Invalid or missing reset token.</p>
                <Link href="/auth/forgot-password" className="btn btn-primary" style={{ justifyContent: "center" }}>
                  Request New Link
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="label">New Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      className="input"
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      required
                      autoFocus
                      style={{ paddingRight: 44 }}
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "0.85rem" }}>
                      {showPass ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">Confirm Password</label>
                  <input
                    className="input"
                    type={showPass ? "text" : "password"}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat new password"
                    required
                  />
                </div>
                {error && (
                  <div style={{ background: "rgba(255,59,59,0.1)", border: "1px solid rgba(255,59,59,0.3)", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: "0.85rem", color: "var(--red)", marginBottom: 16 }}>
                    {error}
                  </div>
                )}
                <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={loading}>
                  {loading ? <><span className="spinner" /> Updating…</> : "Update Password →"}
                </button>
              </form>
            )}
          </div>
        )}

        <p style={{ textAlign: "center", marginTop: 20, fontSize: "0.85rem", color: "var(--muted)" }}>
          <Link href="/auth/forgot-password" style={{ color: "var(--accent)" }}>Request a new link</Link>
        </p>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}><span className="spinner" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
