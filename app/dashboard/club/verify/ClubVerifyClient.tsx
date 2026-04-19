"use client";
import { useState, useRef } from "react";
import Link from "next/link";

export default function ClubVerifyClient({ club }: { club: any }) {
  const [status, setStatus] = useState(club.verificationStatus ?? "PENDING");
  const [verificationNote] = useState(club.verificationNote ?? "");
  const [officialDoc, setOfficialDoc] = useState<File | null>(null);
  const [authDoc, setAuthDoc] = useState<File | null>(null);
  const [passport, setPassport] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const officialRef  = useRef<HTMLInputElement>(null);
  const authRef      = useRef<HTMLInputElement>(null);
  const passportRef  = useRef<HTMLInputElement>(null);

  async function submit() {
    if (!officialDoc)   { setMsg("Official club document is required."); return; }
    if (!authDoc)       { setMsg("Authorization document is required."); return; }
    if (!passport)      { setMsg("Representative passport/ID is required."); return; }
    if (!termsAccepted) { setMsg("You must accept the Terms of Service."); return; }

    setSubmitting(true); setMsg("");
    const fd = new FormData();
    fd.append("officialDoc", officialDoc);
    fd.append("authorizationDoc", authDoc);
    fd.append("representativePassport", passport);

    const res = await fetch("/api/club/verification", { method: "POST", body: fd });
    const data = await res.json();
    setSubmitting(false);

    if (res.ok) {
      setStatus("PENDING");
      setMsg("✓ Documents submitted! Redirecting...");
      setTimeout(() => { window.location.href = "/dashboard/club"; }, 1500);
    } else {
      setMsg("✕ " + (data.error ?? "Upload failed."));
    }
  }

  const FileInput = ({ label, hint, file, setFile, inputRef, accept = "image/*,.pdf" }: {
    label: string; hint: string; file: File | null;
    setFile: (f: File | null) => void; inputRef: React.RefObject<HTMLInputElement | null>;
    accept?: string;
  }) => (
    <div className="form-group" style={{ marginBottom: 20 }}>
      <label className="label">{label}</label>
      <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: 8, lineHeight: 1.5 }}>{hint}</p>
      <input ref={inputRef} type="file" accept={accept} style={{ display: "none" }} onChange={e => setFile(e.target.files?.[0] ?? null)} />
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn btn-outline" style={{ fontSize: "0.85rem" }} onClick={() => inputRef.current?.click()}>
          📎 Choose File
        </button>
        <span style={{ fontSize: "0.82rem", color: file ? "#00c864" : "var(--muted)" }}>
          {file ? `✓ ${file.name}` : "No file chosen"}
        </span>
      </div>
    </div>
  );

  return (
    <main className="page" style={{ minHeight: "100vh", padding: "40px 20px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <Link href="/" style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.4rem", textTransform: "uppercase" }}>
            Handball<span style={{ color: "var(--accent)" }}>Hub</span>
          </Link>
          <Link href="/dashboard/club" style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            ← Back to dashboard
          </Link>
        </div>

        <h2 style={{ marginBottom: 6 }}>Club Verification</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 28 }}>
          Submit official documents to verify <strong style={{ color: "var(--white)" }}>{club.name}</strong> and unlock full access to the player database.
        </p>

        {/* Status banner */}
        <div style={{
          padding: "16px 20px", borderRadius: "var(--radius)", marginBottom: 24,
          background: status === "VERIFIED" ? "rgba(0,200,100,0.1)" : status === "PENDING" ? "rgba(232,255,71,0.08)" : status === "REJECTED" ? "rgba(255,59,59,0.1)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${status === "VERIFIED" ? "rgba(0,200,100,0.3)" : status === "PENDING" ? "rgba(232,255,71,0.25)" : status === "REJECTED" ? "rgba(255,59,59,0.3)" : "var(--border)"}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: "1.6rem" }}>
              {status === "VERIFIED" ? "✅" : status === "PENDING" ? "⏳" : status === "REJECTED" ? "❌" : "📋"}
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, textTransform: "uppercase", fontSize: "0.95rem", color: status === "VERIFIED" ? "#00c864" : status === "PENDING" ? "var(--accent)" : status === "REJECTED" ? "var(--red)" : "var(--white)" }}>
                {status === "VERIFIED" ? "Club Verified" : status === "PENDING" ? "Under Review" : status === "REJECTED" ? "Verification Rejected" : "Not Verified"}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: 4 }}>
                {status === "VERIFIED"   && "Your club is verified and has full access to the player database."}
                {status === "PENDING"    && "Documents are being reviewed. This usually takes 24–48 hours."}
                {status === "REJECTED"   && "Your verification was rejected. Please resubmit correct documents."}
                {status === "UNVERIFIED" || (!["VERIFIED","PENDING","REJECTED"].includes(status)) && "Submit documents to verify your club."}
              </div>
              {status === "REJECTED" && verificationNote && (
                <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(255,59,59,0.08)", borderRadius: 6, fontSize: "0.82rem", color: "rgba(255,255,255,0.7)" }}>
                  <strong>Admin note:</strong> {verificationNote}
                </div>
              )}
            </div>
          </div>
        </div>

        {status === "VERIFIED" ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 24px" }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>✅</div>
            <h3 style={{ color: "#00c864", marginBottom: 12 }}>Club Verified!</h3>
            <p style={{ color: "var(--muted)", marginBottom: 24 }}>Your club has full access to the HandballHub player database.</p>
            <Link href="/dashboard/club" className="btn btn-primary" style={{ justifyContent: "center" }}>
              Go to Dashboard →
            </Link>
          </div>
        ) : status === "PENDING" ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 24px" }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>⏳</div>
            <h3 style={{ color: "var(--accent)", marginBottom: 12 }}>Under Review</h3>
            <p style={{ color: "var(--muted)", marginBottom: 24, lineHeight: 1.7 }}>
              Your documents are being reviewed by our team. You will be notified by email once the verification is complete.
            </p>
            <Link href="/dashboard/club" className="btn btn-primary" style={{ justifyContent: "center" }}>
              Back to Dashboard →
            </Link>
          </div>
        ) : (
          <>
            {/* Why verify */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="section-label" style={{ marginBottom: 12 }}>What you unlock after verification</div>
              {[
                "Full access to the verified player database",
                "Direct contact with players and agents",
                "Scouting tools — watchlist and notes",
                "Send transfer interest requests",
              ].map(t => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", fontSize: "0.85rem", color: "rgba(245,243,238,0.8)" }}>
                  <span style={{ color: "#00c864" }}>✓</span> {t}
                </div>
              ))}
            </div>

            {/* Document upload */}
            <div className="card">
              <h4 style={{ textTransform: "uppercase", marginBottom: 6, fontSize: "0.9rem" }}>Submit Verification Documents</h4>
              <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: 24, lineHeight: 1.6 }}>
                All 3 documents are required. Accepted formats: JPEG, PNG, PDF. Max 5MB each.
                Your documents are stored securely and only reviewed by HandballHub admins.
              </p>

              {msg && (
                <div style={{ padding: "10px 14px", borderRadius: 6, marginBottom: 16, fontSize: "0.85rem", background: msg.startsWith("✓") ? "rgba(0,200,100,0.1)" : "rgba(255,59,59,0.1)", border: `1px solid ${msg.startsWith("✓") ? "rgba(0,200,100,0.3)" : "rgba(255,59,59,0.3)"}`, color: msg.startsWith("✓") ? "#00c864" : "var(--red)" }}>
                  {msg}
                </div>
              )}

              {/* Document 1 */}
              <div style={{ background: "var(--card2)", borderRadius: "var(--radius)", padding: "16px", marginBottom: 12, border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ background: "var(--accent)", color: "#000", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}>1</span>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.88rem", textTransform: "uppercase" }}>Official Club Document</span>
                </div>
                <FileInput
                  label=""
                  hint="Club registration certificate, official handball federation license, or equivalent official club document."
                  file={officialDoc}
                  setFile={setOfficialDoc}
                  inputRef={officialRef}
                  accept="image/*,.pdf"
                />
              </div>

              {/* Document 2 */}
              <div style={{ background: "var(--card2)", borderRadius: "var(--radius)", padding: "16px", marginBottom: 12, border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ background: "var(--accent)", color: "#000", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}>2</span>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.88rem", textTransform: "uppercase" }}>Authorization Letter</span>
                </div>
                <FileInput
                  label=""
                  hint={`Official letter on club letterhead confirming that ${club.contactName || "the representative"} (${club.contactTitle || "authorized person"}) is authorized to represent the club on this platform. Must include club stamp/seal if applicable.`}
                  file={authDoc}
                  setFile={setAuthDoc}
                  inputRef={authRef}
                  accept="image/*,.pdf"
                />
              </div>

              {/* Document 3 */}
              <div style={{ background: "var(--card2)", borderRadius: "var(--radius)", padding: "16px", marginBottom: 20, border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ background: "var(--accent)", color: "#000", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}>3</span>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.88rem", textTransform: "uppercase" }}>Representative Passport / ID</span>
                </div>
                <FileInput
                  label=""
                  hint="Valid passport or government-issued ID of the authorized club representative named above."
                  file={passport}
                  setFile={setPassport}
                  inputRef={passportRef}
                  accept="image/*,.pdf"
                />
              </div>

              {/* Terms */}
              <div style={{ padding: "16px 20px", borderRadius: "var(--radius)", background: "rgba(232,255,71,0.04)", border: "1px solid rgba(232,255,71,0.15)", marginBottom: 20 }}>
                <label style={{ display: "flex", gap: 14, alignItems: "flex-start", cursor: "pointer" }}>
                  <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
                    style={{ accentColor: "var(--accent)", width: 18, height: 18, flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: "0.82rem", color: "rgba(245,243,238,0.8)", lineHeight: 1.7 }}>
                    I confirm that I am legally authorized to represent <strong style={{ color: "var(--white)" }}>{club.name}</strong> on this platform.
                    I have read and agree to the{" "}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>Terms of Service</a>.
                    All submitted documents are genuine and I understand that submitting false documents may result in permanent account suspension
                    and potential legal consequences.
                  </span>
                </label>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: "1rem" }}
                onClick={submit}
                disabled={submitting || !officialDoc || !authDoc || !passport || !termsAccepted}
              >
                {submitting ? <><span className="spinner" /> Submitting...</> : "Submit for Verification →"}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
