"use client";
import { useState } from "react";

type ContactInfo = { phone: string | null; agentName: string | null; agentPhone: string | null; agentEmail: string | null };
type Props = { playerId: string; playerName: string };
type UIState = "idle" | "modal_open" | "loading" | "revealed" | "error";

export default function RevealContactButton({ playerId, playerName }: Props) {
  const [state, setState] = useState<UIState>("idle");
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleAccept() {
    setState("loading");
    try {
      const res = await fetch("/api/interactions/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, tosAccepted: true, tosVersion: "v1.0" }),
      });
      const json = await res.json();
      if (!res.ok) { setErrorMsg(json.error ?? "Something went wrong."); setState("error"); return; }
      setContact(json.data.contact);
      setState("revealed");
    } catch { setErrorMsg("Network error."); setState("error"); }
  }

  if (state === "revealed" && contact) {
    return (
      <div className="reveal-card">
        <h4 className="reveal-card__heading">Contact Information</h4>
        <ul className="reveal-card__list">
          {contact.phone && <li><span className="label">Direct phone</span><a href={`tel:${contact.phone}`}>{contact.phone}</a></li>}
          {contact.agentName && <li><span className="label">Agent</span><span>{contact.agentName}</span></li>}
          {contact.agentPhone && <li><span className="label">Agent phone</span><a href={`tel:${contact.agentPhone}`}>{contact.agentPhone}</a></li>}
          {contact.agentEmail && <li><span className="label">Agent email</span><a href={`mailto:${contact.agentEmail}`}>{contact.agentEmail}</a></li>}
          {!contact.phone && !contact.agentName && <li>No contact details on file yet.</li>}
        </ul>
        <p className="reveal-card__legal">A 5% commission fee applies to any signed transfer agreement with this player.</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div>
        <p style={{ color:"var(--red)", fontSize:"0.85rem", marginBottom:12 }}>{errorMsg}</p>
        <button onClick={() => setState("idle")} className="btn btn-outline" style={{ fontSize:"0.85rem" }}>Try again</button>
      </div>
    );
  }

  return (
    <>
      <button onClick={() => setState("modal_open")} disabled={state === "loading"} className="btn btn-primary" style={{ width:"100%", justifyContent:"center" }}>
        {state === "loading" ? <><span className="spinner" /> Logging…</> : "🔒 Reveal Contact Details"}
      </button>

      {state === "modal_open" && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2 className="modal-title">Confirm Contact Access</h2>
            <div>
              <p style={{ marginBottom:16, color:"var(--muted)" }}>You are about to reveal contact info for <strong style={{ color:"var(--white)" }}>{playerName}</strong>.</p>
              <ol style={{ paddingLeft:20, display:"flex", flexDirection:"column", gap:10 }}>
                <li style={{ fontSize:"0.9rem", color:"var(--muted)", lineHeight:1.6 }}>This access is logged with your Club ID, timestamp, and IP as required by our Terms of Service (v1.0).</li>
                <li style={{ fontSize:"0.9rem", color:"var(--muted)", lineHeight:1.6 }}>A <strong style={{ color:"var(--accent)" }}>5% commission</strong> on any signed transfer with this player becomes legally payable.</li>
                <li style={{ fontSize:"0.9rem", color:"var(--muted)", lineHeight:1.6 }}>This log is a legally binding digital footprint.</li>
              </ol>
            </div>
            <div className="modal-actions">
              <button onClick={() => setState("idle")} className="btn btn-ghost">Cancel</button>
              <button onClick={handleAccept} className="btn btn-danger" autoFocus>Accept &amp; Reveal</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
