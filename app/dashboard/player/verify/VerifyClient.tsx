"use client";
import { useState, useRef } from "react";
import Link from "next/link";

export default function VerifyClient({ player }: { player: any }) {
  const [verificationStatus, setVerificationStatus] = useState(player.verificationStatus ?? "UNVERIFIED");
  const [verificationNote] = useState(player.verificationNote ?? "");
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const passportInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  async function submitVerification() {
    if (!passportFile || !selfieFile) { setVerifyMsg("Both passport and selfie are required."); return; }
    if (!termsAccepted) { setVerifyMsg("You must accept the Terms of Service before submitting."); return; }
    setVerifying(true); setVerifyMsg("");
    const fd = new FormData();
    fd.append("passport", passportFile);
    fd.append("selfie", selfieFile);
    const res = await fetch("/api/player/verification", { method: "POST", body: fd });
    const data = await res.json();
    setVerifying(false);
    if (res.ok) {
      setVerificationStatus("PENDING");
      setVerifyMsg("✓ Documents submitted! Redirecting to your profile...");
      setPassportFile(null); setSelfieFile(null);
      setTimeout(() => { window.location.href = `/players/${player.slug}`; }, 1500);
    } else {
      setVerifyMsg("✕ " + (data.error ?? "Upload failed."));
    }
  }

  return (
    <main className="page" style={{ minHeight: "100vh", padding: "40px 20px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <Link href="/" style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.4rem", textTransform: "uppercase" }}>
            Handball<span style={{ color: "var(--accent)" }}>Hub</span>
          </Link>
          <Link href={`/players/${player.slug}`} style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            ← Back to profile
          </Link>
        </div>

        <h2 style={{ marginBottom: 6 }}>Identity Verification</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 28 }}>
          Verify your identity to make your profile visible to clubs worldwide.
        </p>

        {/* Status banner */}
        <div style={{
          padding: "16px 20px", borderRadius: "var(--radius)", marginBottom: 24,
          background: verificationStatus === "VERIFIED"  ? "rgba(0,200,100,0.1)"  :
                      verificationStatus === "PENDING"   ? "rgba(232,255,71,0.08)" :
                      verificationStatus === "REJECTED"  ? "rgba(255,59,59,0.1)"  :
                      "rgba(255,255,255,0.04)",
          border: `1px solid ${
            verificationStatus === "VERIFIED"  ? "rgba(0,200,100,0.3)"  :
            verificationStatus === "PENDING"   ? "rgba(232,255,71,0.25)" :
            verificationStatus === "REJECTED"  ? "rgba(255,59,59,0.3)"  :
            "var(--border)"
          }`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: "1.6rem" }}>
              {verificationStatus === "VERIFIED" ? "✅" : verificationStatus === "PENDING" ? "⏳" : verificationStatus === "REJECTED" ? "❌" : "📋"}
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, textTransform: "uppercase", fontSize: "0.95rem",
                color: verificationStatus === "VERIFIED" ? "#00c864" : verificationStatus === "PENDING" ? "var(--accent)" : verificationStatus === "REJECTED" ? "var(--red)" : "var(--white)"
              }}>
                {verificationStatus === "VERIFIED" ? "Account Verified" :
                 verificationStatus === "PENDING"  ? "Under Review"     :
                 verificationStatus === "REJECTED" ? "Verification Rejected" :
                 "Not Verified"}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: 4 }}>
                {verificationStatus === "VERIFIED"   && "Your profile is public and visible to clubs."}
                {verificationStatus === "PENDING"    && "We received your documents. An admin will verify your account within 24–48 hours."}
                {verificationStatus === "REJECTED"   && "Your verification was rejected. Please resubmit correct documents."}
                {verificationStatus === "UNVERIFIED" && "Verify your identity to make your profile visible to clubs."}
              </div>
              {verificationStatus === "REJECTED" && verificationNote && (
                <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(255,59,59,0.08)", borderRadius: 6, fontSize: "0.82rem", color: "rgba(255,255,255,0.7)" }}>
                  <strong>Admin note:</strong> {verificationNote}
                </div>
              )}
            </div>
          </div>
        </div>

        {verificationStatus === "VERIFIED" ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 24px" }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>✅</div>
            <h3 style={{ color: "#00c864", marginBottom: 12 }}>You're verified!</h3>
            <p style={{ color: "var(--muted)", marginBottom: 24 }}>Your profile is visible to clubs worldwide.</p>
            <Link href={`/players/${player.slug}`} className="btn btn-primary" style={{ justifyContent: "center" }}>
              View My Profile →
            </Link>
          </div>
        ) : verificationStatus === "PENDING" ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 24px" }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>⏳</div>
            <h3 style={{ color: "var(--accent)", marginBottom: 12 }}>Under Review</h3>
            <p style={{ color: "var(--muted)", marginBottom: 24 }}>Your documents are being reviewed. This usually takes 24–48 hours.</p>
            <Link href={`/players/${player.slug}`} className="btn btn-primary" style={{ justifyContent: "center" }}>
              View My Profile →
            </Link>
          </div>
        ) : (
          <>
            {/* Why verify */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="section-label" style={{ marginBottom: 12 }}>Why verify?</div>
              {[
                "Your profile becomes visible in club searches",
                "Clubs can find and contact you directly",
                "Builds trust with professional clubs",
                "One-time process — takes under 2 minutes",
              ].map(t => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", fontSize: "0.85rem", color: "rgba(245,243,238,0.8)" }}>
                  <span style={{ color: "#00c864" }}>✓</span> {t}
                </div>
              ))}
            </div>

            {/* Upload form */}
            <div className="card">
              <h4 style={{ textTransform: "uppercase", marginBottom: 6, fontSize: "0.9rem" }}>Submit Verification Documents</h4>
              <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 20, lineHeight: 1.6 }}>
                Upload a photo of your passport and a selfie holding it. Your data is stored securely and only seen by admins.
              </p>

              {verifyMsg && (
                <div style={{
                  padding: "10px 14px", borderRadius: 6, marginBottom: 16, fontSize: "0.85rem",
                  background: verifyMsg.startsWith("✓") ? "rgba(0,200,100,0.1)" : "rgba(255,59,59,0.1)",
                  border: `1px solid ${verifyMsg.startsWith("✓") ? "rgba(0,200,100,0.3)" : "rgba(255,59,59,0.3)"}`,
                  color: verifyMsg.startsWith("✓") ? "#00c864" : "var(--red)",
                }}>
                  {verifyMsg}
                </div>
              )}

              {/* Passport */}
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="label">Passport / ID Photo</label>
                <input ref={passportInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => setPassportFile(e.target.files?.[0] ?? null)} />
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button className="btn btn-outline" style={{ fontSize: "0.85rem" }} onClick={() => passportInputRef.current?.click()}>
                    📄 Choose File
                  </button>
                  <span style={{ fontSize: "0.82rem", color: passportFile ? "#00c864" : "var(--muted)" }}>
                    {passportFile ? `✓ ${passportFile.name}` : "No file chosen"}
                  </span>
                </div>
              </div>

              {/* Selfie */}
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="label">Selfie with Passport</label>
                <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: 8 }}>Take a photo of yourself holding your passport open to the photo page.</p>
                <input ref={selfieInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => setSelfieFile(e.target.files?.[0] ?? null)} />
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button className="btn btn-outline" style={{ fontSize: "0.85rem" }} onClick={() => selfieInputRef.current?.click()}>
                    🤳 Choose Selfie
                  </button>
                  <span style={{ fontSize: "0.82rem", color: selfieFile ? "#00c864" : "var(--muted)" }}>
                    {selfieFile ? `✓ ${selfieFile.name}` : "No file chosen"}
                  </span>
                </div>
              </div>

              {/* Previews */}
              {(passportFile || selfieFile) && (
                <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                  {[{ file: passportFile, label: "Passport" }, { file: selfieFile, label: "Selfie" }].map(({ file, label }) => file ? (
                    <div key={label} style={{ flex: 1, textAlign: "center" }}>
                      <img src={URL.createObjectURL(file)} alt={label} style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }} />
                      <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 4 }}>{label}</div>
                    </div>
                  ) : null)}
                </div>
              )}

              {/* Terms */}
              <div style={{ padding: "16px 20px", borderRadius: "var(--radius)", background: "rgba(232,255,71,0.04)", border: "1px solid rgba(232,255,71,0.15)", marginBottom: 20 }}>
                <label style={{ display: "flex", gap: 14, alignItems: "flex-start", cursor: "pointer" }}>
                  <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
                    style={{ accentColor: "var(--accent)", width: 18, height: 18, flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: "0.82rem", color: "rgba(245,243,238,0.8)", lineHeight: 1.7 }}>
                    I have read and agree to the{" "}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "underline" }}>
                      Terms of Service &amp; Privacy Policy
                    </a>
                    . I confirm that all documents and information I submit are genuine, accurate and belong to me.
                    I understand that my profile information will be visible to clubs on this platform, and that{" "}
                    <strong style={{ color: "var(--white)" }}>all platform activity is logged and may serve as digital evidence</strong>{" "}
                    in the event of a dispute or legal proceeding.
                  </span>
                </label>
              </div>

              <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "14px" }}
                onClick={submitVerification} disabled={verifying || !passportFile || !selfieFile || !termsAccepted}>
                {verifying ? <><span className="spinner" /> Submitting...</> : "Submit for Verification →"}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
