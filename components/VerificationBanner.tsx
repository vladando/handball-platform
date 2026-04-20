"use client";
// components/VerificationBanner.tsx
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface Props {
  status: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
  rejectionNote?: string | null;
  onboardingCompleted?: boolean;
}

export default function VerificationBanner({ status, rejectionNote, onboardingCompleted }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [showPopup, setShowPopup] = useState(false);
  const [showVerifiedToast, setShowVerifiedToast] = useState(false);

  // Show popup on every page navigation — but not during onboarding,
  // not on the verification page/tab, and not before onboarding is done.
  useEffect(() => {
    if (status === "VERIFIED" || status === "PENDING") return;
    if (!onboardingCompleted) return;
    if (pathname.startsWith("/onboarding")) return;
    // Suppress on the dedicated verify page
    if (pathname.startsWith("/dashboard/player/verify")) return;
    // Suppress on verification tab (check URL directly — avoids Suspense issues)
    if (typeof window !== "undefined" && window.location.search.includes("tab=verification")) return;
    const t = setTimeout(() => setShowPopup(true), 700);
    return () => clearTimeout(t);
  }, [pathname, status, onboardingCompleted]);

  // Verified players — one-time congrats toast
  useEffect(() => {
    if (status !== "VERIFIED") return;
    const key = "verif_toast_shown";
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      setShowVerifiedToast(true);
      const t = setTimeout(() => setShowVerifiedToast(false), 6000);
      return () => clearTimeout(t);
    }
  }, [status]);

  // ── Verified congrats toast ───────────────────────────────────
  if (status === "VERIFIED") {
    if (!showVerifiedToast) return null;
    return (
      <div style={{
        position: "fixed", bottom: 28, right: 28, zIndex: 8000,
        background: "#00c864", color: "#000",
        padding: "14px 20px", borderRadius: 10,
        fontFamily: "var(--font-display)", fontWeight: 800,
        fontSize: "0.95rem", textTransform: "uppercase",
        boxShadow: "0 8px 32px rgba(0,200,100,0.4)",
        display: "flex", alignItems: "center", gap: 12,
        animation: "slideUp 0.35s ease",
      }}>
        <span style={{ fontSize: "1.3rem" }}>&#127881;</span>
        <div>
          <div>Account Verified!</div>
          <div style={{ fontSize: "0.75rem", fontWeight: 500, opacity: 0.8, textTransform: "none" }}>
            Your profile is now visible to clubs.
          </div>
        </div>
        <button onClick={() => setShowVerifiedToast(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem", opacity: 0.7, marginLeft: 8 }}>&#x2715;</button>
        <style>{`@keyframes slideUp { from { transform:translateY(20px); opacity:0 } to { transform:translateY(0); opacity:1 } }`}</style>
      </div>
    );
  }

  // ── Pending — sticky banner only, no popup ────────────────────
  if (status === "PENDING") {
    return (
      <div style={{
        position: "sticky", top: 64, zIndex: 99,
        background: "rgba(232,255,71,0.07)",
        borderBottom: "2px solid rgba(232,255,71,0.35)",
        padding: "11px 0",
      }}>
        <div className="container" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "1.1rem" }}>&#9203;</span>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.82rem", textTransform: "uppercase", color: "var(--accent)", marginRight: 8 }}>
            Verification Pending
          </span>
          <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
            Your documents are under review. You will be notified once an admin approves your account.
          </span>
        </div>
      </div>
    );
  }

  // ── UNVERIFIED / REJECTED — sticky bar + popup modal ─────────
  const isRejected = status === "REJECTED";

  return (
    <>
      {/* Sticky top bar */}
      <div style={{
        position: "sticky", top: 64, zIndex: 99,
        background: isRejected ? "rgba(255,59,59,0.08)" : "rgba(255,255,255,0.04)",
        borderBottom: `2px solid ${isRejected ? "rgba(255,59,59,0.4)" : "rgba(255,255,255,0.12)"}`,
        padding: "10px 0",
      }}>
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1rem" }}>{isRejected ? <span>&#10060;</span> : <span>&#9888;</span>}</span>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.82rem", textTransform: "uppercase", color: isRejected ? "var(--red)" : "var(--muted)" }}>
              {isRejected ? "Verification Rejected" : "Account Not Verified"}
            </span>
            <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
              &mdash; Your profile is not visible to clubs yet.
            </span>
          </div>
          <button
            className="btn btn-primary"
            style={{ fontSize: "0.78rem", padding: "6px 16px" }}
            onClick={() => { setShowPopup(false); router.push("/dashboard/player/verify"); }}
          >
            {isRejected ? "Resubmit Documents" : "Verify Now"} &rarr;
          </button>
        </div>
      </div>

      {/* Popup modal */}
      {showPopup && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9000,
          background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "24px 16px",
        }}>
          <div style={{
            background: "var(--card)", border: `2px solid ${isRejected ? "rgba(255,59,59,0.5)" : "rgba(232,255,71,0.3)"}`,
            borderRadius: "var(--radius-lg)", padding: "36px 32px",
            maxWidth: 420, width: "100%", position: "relative",
            boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          }}>
            {/* Close */}
            <button
              onClick={() => setShowPopup(false)}
              style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "1.2rem", lineHeight: 1 }}
            >
              &#x2715;
            </button>

            {/* Icon */}
            <div style={{ fontSize: "3rem", marginBottom: 16, textAlign: "center" }}>
              {isRejected ? <span>&#10060;</span> : <span>&#128274;</span>}
            </div>

            {/* Title */}
            <h3 style={{ textAlign: "center", marginBottom: 12, fontSize: "1.4rem" }}>
              {isRejected ? "Verification Rejected" : "Verify Your Profile"}
            </h3>

            {/* Message */}
            <p style={{ color: "var(--muted)", lineHeight: 1.7, fontSize: "0.9rem", textAlign: "center", marginBottom: isRejected && rejectionNote ? 12 : 28 }}>
              {isRejected
                ? "Your verification was rejected. Please resubmit your documents to make your profile visible to clubs."
                : "Your profile is currently hidden from clubs. Complete identity verification to appear in player searches and start receiving club interest."}
            </p>

            {/* Rejection reason */}
            {isRejected && rejectionNote && (
              <div style={{ background: "rgba(255,59,59,0.08)", border: "1px solid rgba(255,59,59,0.3)", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 24, fontSize: "0.82rem", color: "rgba(255,255,255,0.7)" }}>
                <strong style={{ color: "var(--red)" }}>Reason:</strong> {rejectionNote}
              </div>
            )}

            {/* Benefits */}
            {!isRejected && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
                {[
                  "Appear in club search results",
                  "Receive direct contact from clubs",
                  "Build credibility with verified badge",
                ].map((b, i) => (
                  <div key={i} style={{ fontSize: "0.85rem", color: "rgba(245,243,238,0.8)", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#00c864", fontWeight: 700, flexShrink: 0 }}>&#10003;</span>
                    {b}
                  </div>
                ))}
              </div>
            )}

            {/* CTA buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: "1rem" }}
                onClick={() => { setShowPopup(false); router.push("/dashboard/player/verify"); }}
              >
                {isRejected ? "Resubmit Documents" : "Verify My Profile"} &rarr;
              </button>
              <button
                onClick={() => setShowPopup(false)}
                style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "0.82rem", cursor: "pointer", padding: "6px" }}
              >
                Remind me later
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
