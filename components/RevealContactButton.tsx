"use client";
// components/RevealContactButton.tsx
import { useState } from "react";
import { useRouter } from "next/navigation";

type ContactInfo = {
  email: string | null;
  phone: string | null;
  agentName: string | null;
  agentPhone: string | null;
  agentEmail: string | null;
};

type Props = {
  playerId: string;
  playerName: string;
  // Pre-populated when club already revealed before (from server)
  initialInteractionId?: string | null;
  initialContact?: ContactInfo | null;
};

type UIState = "idle" | "modal_open" | "loading" | "revealed" | "error";

const TOS_VERSION = "v1.0";

export default function RevealContactButton({
  playerId,
  playerName,
  initialInteractionId,
  initialContact,
}: Props) {
  const router = useRouter();
  const [state, setState] = useState<UIState>(
    initialContact ? "revealed" : "idle"
  );
  const [contact, setContact] = useState<ContactInfo | null>(initialContact ?? null);
  const [interactionId, setInteractionId] = useState<string | null>(initialInteractionId ?? null);
  const [alreadyRevealed, setAlreadyRevealed] = useState(!!initialContact);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleTosAccept() {
    setState("loading");
    try {
      const res = await fetch("/api/interactions/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, tosAccepted: true, tosVersion: TOS_VERSION }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error ?? "Something went wrong.");
        setState("error");
        return;
      }
      setContact(json.data.contact);
      setInteractionId(json.data.interactionId);
      setAlreadyRevealed(json.data.alreadyRevealed);
      setState("revealed");
    } catch {
      setErrorMsg("Network error. Please check your connection.");
      setState("error");
    }
  }

  // ── Revealed state ────────────────────────────────────────────
  if (state === "revealed" && contact) {
    const hasContact = contact.email || contact.phone || contact.agentName || contact.agentPhone || contact.agentEmail;
    return (
      <div style={{
        background: "rgba(0,200,100,0.06)",
        border: "1px solid rgba(0,200,100,0.25)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ background: "rgba(0,200,100,0.1)", padding: "12px 20px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(0,200,100,0.15)" }}>
          <span style={{ fontSize: "1rem" }}>✅</span>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.85rem", textTransform: "uppercase", color: "#00c864" }}>
              Contact Unlocked
            </div>
            {alreadyRevealed && (
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 1 }}>Previously revealed</div>
            )}
          </div>
        </div>

        {/* Contact rows */}
        <div style={{ padding: "16px 20px" }}>
          {!hasContact ? (
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 16 }}>
              This player hasn't added contact details yet.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {contact.email && (
                <ContactRow icon="✉" label="Email">
                  <a href={`mailto:${contact.email}`} style={{ color: "var(--accent)" }}>{contact.email}</a>
                </ContactRow>
              )}
              {contact.phone && (
                <ContactRow icon="📞" label="Phone">
                  <a href={`tel:${contact.phone}`} style={{ color: "var(--accent)" }}>{contact.phone}</a>
                </ContactRow>
              )}
              {contact.agentName && (
                <ContactRow icon="🤝" label="Agent">{contact.agentName}</ContactRow>
              )}
              {contact.agentPhone && (
                <ContactRow icon="📱" label="Agent Phone">
                  <a href={`tel:${contact.agentPhone}`} style={{ color: "var(--accent)" }}>{contact.agentPhone}</a>
                </ContactRow>
              )}
              {contact.agentEmail && (
                <ContactRow icon="📧" label="Agent Email">
                  <a href={`mailto:${contact.agentEmail}`} style={{ color: "var(--accent)" }}>{contact.agentEmail}</a>
                </ContactRow>
              )}
            </div>
          )}

          {/* Chat button */}
          {interactionId && (
            <button
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", gap: 8, fontSize: "0.9rem", padding: "12px 0" }}
              onClick={() => router.push(`/messages/${interactionId}`)}
            >
              <span style={{ fontSize: "1.1rem" }}>💬</span>
              Chat with {playerName.split(" ")[0]}
            </button>
          )}

          <p style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 12, lineHeight: 1.5 }}>
            A 5% commission fee applies to any signed transfer. This access is logged.{" "}
            <a href="/terms" target="_blank" style={{ color: "var(--muted)" }}>Terms of Service</a>
          </p>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────
  if (state === "error") {
    return (
      <div style={{ background: "rgba(255,59,59,0.1)", border: "1px solid rgba(255,59,59,0.3)", borderRadius: "var(--radius)", padding: "16px" }}>
        <p style={{ fontSize: "0.85rem", color: "var(--red)", marginBottom: 12 }}>{errorMsg}</p>
        <button onClick={() => setState("idle")} className="btn btn-outline">Try again</button>
      </div>
    );
  }

  // ── Idle / Modal states ───────────────────────────────────────
  return (
    <>
      <button
        onClick={() => setState("modal_open")}
        disabled={state === "loading"}
        className="btn btn-primary"
        style={{ width: "100%", justifyContent: "center" }}
      >
        {state === "loading" ? (
          <><span className="spinner" /> Unlocking…</>
        ) : (
          <><LockIcon /> Reveal Contact Details</>
        )}
      </button>

      {/* ToS Modal */}
      {state === "modal_open" && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2 className="modal-title">Confirm Contact Access</h2>
            <div>
              <p>You are about to reveal the contact information for <strong>{playerName}</strong>.</p>
              <p style={{ marginTop: 8 }}>By clicking <em>Accept &amp; Reveal</em> you confirm:</p>
              <ol style={{ paddingLeft: 20, marginTop: 12, display: "flex", flexDirection: "column", gap: 8, fontSize: "0.85rem", color: "rgba(245,243,238,0.7)", lineHeight: 1.6 }}>
                <li>This access is logged with your club ID, timestamp and IP address as required by our <a href="/terms" target="_blank">Terms of Service ({TOS_VERSION})</a>.</li>
                <li>A <strong>5% commission fee</strong> on the gross annual salary of any transfer agreement signed with this player becomes legally payable.</li>
                <li>This log constitutes a legally binding digital footprint.</li>
              </ol>
            </div>
            <div className="modal-actions">
              <button onClick={() => setState("idle")} className="btn btn-ghost">Cancel</button>
              <button onClick={handleTosAccept} className="btn btn-danger" autoFocus>
                Accept &amp; Reveal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ContactRow({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ fontSize: "0.9rem", width: 20, textAlign: "center", flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", width: 80, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: "0.88rem" }}>{children}</span>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
