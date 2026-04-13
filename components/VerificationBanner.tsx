"use client";
// components/VerificationBanner.tsx
// Shown on every page for unverified players.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  status: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
  rejectionNote?: string | null;
}

export default function VerificationBanner({ status, rejectionNote }: Props) {
  const router = useRouter();
  // Verified players — show a one-time "Congrats" toast then never show again
  const [showVerifiedToast, setShowVerifiedToast] = useState(false);
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

  // Verified players only see the toast, nothing persistent
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
        <span style={{ fontSize: "1.3rem" }}>🎉</span>
        <div>
          <div>Account Verified!</div>
          <div style={{ fontSize: "0.75rem", fontWeight: 500, opacity: 0.8, textTransform: "none" }}>
            Your profile is now visible to clubs.
          </div>
        </div>
        <button onClick={() => setShowVerifiedToast(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem", opacity: 0.7, marginLeft: 8 }}>✕</button>
        <style>{`@keyframes slideUp { from { transform:translateY(20px); opacity:0 } to { transform:translateY(0); opacity:1 } }`}</style>
      </div>
    );
  }

  const isPending  = status === "PENDING";
  const isRejected = status === "REJECTED";

  const bg      = isPending ? "rgba(232,255,71,0.07)" : isRejected ? "rgba(255,59,59,0.08)" : "rgba(255,255,255,0.04)";
  const border  = isPending ? "rgba(232,255,71,0.35)" : isRejected ? "rgba(255,59,59,0.4)"  : "rgba(255,255,255,0.12)";
  const accent  = isPending ? "var(--accent)"         : isRejected ? "var(--red)"            : "var(--muted)";
  const icon    = isPending ? "⏳" : isRejected ? "❌" : "⚠️";
  const title   = isPending ? "Verification Pending"  : isRejected ? "Verification Rejected" : "Account Not Verified";
  const message = isPending
    ? "Your documents are under review. You will be notified once an admin verifies your account."
    : isRejected
    ? "Your verification was rejected. Please resubmit your documents."
    : "Your profile is not yet visible to clubs. Complete identity verification to appear in player searches.";

  return (
    <div style={{
      position: "sticky",
      top: 64,
      zIndex: 99,
      background: bg,
      borderBottom: `2px solid ${border}`,
      padding: "12px 0",
    }}>
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "1.2rem" }}>{icon}</span>
          <div>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.85rem", textTransform: "uppercase", color: accent, marginRight: 10 }}>
              {title}
            </span>
            <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{message}</span>
            {isRejected && rejectionNote && (
              <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.6)", marginTop: 3 }}>
                <strong>Reason:</strong> {rejectionNote}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
          {(status === "UNVERIFIED" || status === "REJECTED") && (
            <button
              className="btn btn-primary"
              style={{ fontSize: "0.82rem", padding: "8px 18px" }}
              onClick={() => router.push("/dashboard/player?tab=verification")}
            >
              {isRejected ? "Resubmit Documents →" : "Verify Account →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
