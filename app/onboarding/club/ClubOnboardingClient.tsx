"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { COUNTRIES } from "@/lib/countries";

const TOTAL = 6;

const TITLES = [
  "General Manager", "Club Manager", "Sporting Director",
  "Head Coach", "President", "CEO", "Director", "Secretary General", "Other",
];

export default function ClubOnboardingClient({ club }: { club: any }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    country:      club.country      === "Unknown" ? "" : (club.country      ?? ""),
    city:         club.city         === "Unknown" ? "" : (club.city         ?? ""),
    address:      club.address      ?? "",
    foundedYear:  club.foundedYear  ? String(club.foundedYear) : "",
    leagueName:   club.leagueName   ?? "",
    contactPhone: club.contactPhone ?? "",
    contactEmail: club.contactEmail ?? "",
    website:      club.website      ?? "",
    contactName:  club.contactName  ?? "",
    contactTitle: club.contactTitle ?? "",
    description:  club.description  ?? "",
  });

  // Step 6 — verification docs
  const [officialDoc, setOfficialDoc] = useState<File | null>(null);
  const [authDoc, setAuthDoc]         = useState<File | null>(null);
  const [passport, setPassport]       = useState<File | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const officialRef  = useRef<HTMLInputElement>(null);
  const authRef      = useRef<HTMLInputElement>(null);
  const passportRef  = useRef<HTMLInputElement>(null);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); setError(""); }
  function next() { setError(""); setStep(s => s + 1); }
  function back() { setError(""); setStep(s => Math.max(0, s - 1)); }

  function validateAndNext() {
    if (step === 1 && (!form.country.trim() || !form.city.trim())) {
      setError("Country and city are required."); return;
    }
    if (step === 2 && !form.leagueName.trim()) {
      setError("League / Competition is required."); return;
    }
    if (step === 3) {
      if (!form.contactPhone.trim()) { setError("Contact phone is required."); return; }
      if (!form.contactEmail.trim()) { setError("Contact email is required."); return; }
    }
    if (step === 4 && (!form.contactName.trim() || !form.contactTitle.trim())) {
      setError("Full name and position are required."); return;
    }
    next();
  }

  async function finishProfile() {
    setSaving(true); setError("");
    const res = await fetch("/api/club/onboarding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) setStep(6);
    else setError("Something went wrong. Please try again.");
  }

  async function submitDocs() {
    if (!officialDoc)   { setError("Official club document is required."); return; }
    if (!authDoc)       { setError("Authorization document is required."); return; }
    if (!passport)      { setError("Representative passport/ID is required."); return; }
    if (!termsAccepted) { setError("You must accept the Terms of Service."); return; }

    setSubmitting(true); setError("");
    const fd = new FormData();
    fd.append("officialDoc", officialDoc);
    fd.append("authorizationDoc", authDoc);
    fd.append("representativePassport", passport);

    const res = await fetch("/api/club/verification", { method: "POST", body: fd });
    const data = await res.json();
    setSubmitting(false);

    if (res.ok) {
      setStep(7);
    } else {
      setError(data.error ?? "Upload failed.");
    }
  }

  const progress = step >= 1 && step <= TOTAL ? step / TOTAL : 0;

  const card: React.CSSProperties = {
    background: "var(--card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)", padding: "36px 32px",
  };

  function StepLabel({ n, title, sub }: { n: number; title: string; sub?: string }) {
    return (
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: "0.68rem", color: "var(--accent)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>
          Step {n} of {TOTAL}
        </div>
        <h3 style={{ fontSize: "1.6rem", margin: 0, lineHeight: 1.2 }}>{title}</h3>
        {sub && <p style={{ color: "var(--muted)", fontSize: "0.87rem", marginTop: 10, marginBottom: 0, lineHeight: 1.6 }}>{sub}</p>}
      </div>
    );
  }

  function ContinueBtn({ onClick, label = "Continue →", disabled = false }: { onClick: () => void; label?: string; disabled?: boolean }) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "14px" }} onClick={onClick} disabled={disabled}>
          {label}
        </button>
        {step > 1 && (
          <div style={{ textAlign: "center" }}>
            <button type="button" onClick={back} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "0.82rem", cursor: "pointer", padding: "6px" }}>
              ← Back
            </button>
          </div>
        )}
      </div>
    );
  }

  function FileInput({ label, hint, file, setFile, inputRef, accept = "image/*,.pdf" }: {
    label: string; hint: string; file: File | null;
    setFile: (f: File | null) => void; inputRef: React.RefObject<HTMLInputElement | null>;
    accept?: string;
  }) {
    return (
      <div style={{ marginBottom: 4 }}>
        {label && <label className="label">{label}</label>}
        <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: 8, lineHeight: 1.5, marginTop: 2 }}>{hint}</p>
        <input ref={inputRef} type="file" accept={accept} style={{ display: "none" }} onChange={e => setFile(e.target.files?.[0] ?? null)} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button type="button" className="btn btn-outline" style={{ fontSize: "0.82rem", padding: "7px 14px" }} onClick={() => inputRef.current?.click()}>
            📎 Choose File
          </button>
          <span style={{ fontSize: "0.8rem", color: file ? "#00c864" : "var(--muted)" }}>
            {file ? `✓ ${file.name}` : "No file chosen"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: "24px 16px" }}>

      {/* Logo */}
      <div style={{ marginBottom: 28, textAlign: "center" }}>
        <Link href="/" style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.4rem", textTransform: "uppercase", color: "var(--white)", textDecoration: "none" }}>
          Handball<span style={{ color: "var(--accent)" }}>Hub</span>
        </Link>
      </div>

      {/* Progress bar */}
      {step >= 1 && step <= TOTAL && (
        <div style={{ width: "100%", maxWidth: 560, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: "0.73rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>Step {step} of {TOTAL}</span>
            <span style={{ fontSize: "0.73rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{Math.round(progress * 100)}%</span>
          </div>
          <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress * 100}%`, background: "var(--accent)", borderRadius: 2, transition: "width 0.35s ease" }} />
          </div>
        </div>
      )}

      <div style={{ width: "100%", maxWidth: 560 }}>

        {/* ── Step 0: Welcome ── */}
        {step === 0 && (
          <div style={{ ...card, textAlign: "center", padding: "48px 36px" }}>
            <div style={{ fontSize: "3.2rem", marginBottom: 20 }}>🏟️</div>
            <h2 style={{ fontSize: "1.9rem", marginBottom: 14 }}>
              Welcome to <span style={{ color: "var(--accent)" }}>HandballHub!</span>
            </h2>
            <p style={{ color: "var(--muted)", marginBottom: 8, lineHeight: 1.75, fontSize: "0.95rem" }}>
              Let&apos;s set up your club profile in <strong style={{ color: "var(--white)" }}>{TOTAL} quick steps</strong>.
            </p>
            <p style={{ color: "var(--muted)", fontSize: "0.83rem", marginBottom: 36, lineHeight: 1.6 }}>
              After completing your profile and submitting verification documents,
              an admin will review your club and grant full access to the player database.
            </p>
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", fontSize: "1.05rem", padding: "16px" }} onClick={() => setStep(1)}>
              Let&apos;s Go →
            </button>
            <div style={{ marginTop: 16 }}>
              <button onClick={() => router.push("/dashboard/club")} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "0.8rem", cursor: "pointer" }}>
                Skip for now, I&apos;ll complete later
              </button>
            </div>
          </div>
        )}

        {/* ── Step 1: Location ── */}
        {step === 1 && (
          <div style={card}>
            <StepLabel n={1} title="Where is your club based?" sub="Players use location to find clubs in their region." />
            <div className="form-group">
              <label className="label">Country <span style={{ color: "var(--accent)" }}>*</span></label>
              <select className="input" value={form.country} onChange={e => set("country", e.target.value)}>
                <option value="">Select country...</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">City <span style={{ color: "var(--accent)" }}>*</span></label>
              <input className="input" value={form.city} onChange={e => set("city", e.target.value)} placeholder="Zagreb, Hamburg, Paris…" />
            </div>
            <div className="form-group">
              <label className="label">Club Address <span style={{ fontSize: "0.73rem", color: "var(--muted)", fontWeight: 400 }}>(optional)</span></label>
              <input className="input" value={form.address} onChange={e => set("address", e.target.value)} placeholder="Ilica 1, 10000 Zagreb" />
            </div>
            <div className="form-group" style={{ marginBottom: 28 }}>
              <label className="label">Year Founded <span style={{ fontSize: "0.73rem", color: "var(--muted)", fontWeight: 400 }}>(optional)</span></label>
              <input className="input" type="number" min={1800} max={2025} value={form.foundedYear} onChange={e => set("foundedYear", e.target.value)} placeholder="e.g. 1985" />
            </div>
            {error && <div style={{ color: "var(--red)", fontSize: "0.85rem", marginBottom: 16 }}>{error}</div>}
            <ContinueBtn onClick={validateAndNext} />
          </div>
        )}

        {/* ── Step 2: League ── */}
        {step === 2 && (
          <div style={card}>
            <StepLabel n={2} title="Which league do you compete in?" sub="Helps players understand the level and ambition of your club. Optional." />
            <div className="form-group" style={{ marginBottom: 28 }}>
              <label className="label">League / Competition <span style={{ color: "var(--accent)" }}>*</span></label>
              <input className="input" value={form.leagueName} onChange={e => set("leagueName", e.target.value)} placeholder="EHF Champions League, Bundesliga, SEHA…" autoFocus />
            </div>
            {error && <div style={{ color: "var(--red)", fontSize: "0.85rem", marginBottom: 16 }}>{error}</div>}
            <ContinueBtn onClick={validateAndNext} />
          </div>
        )}

        {/* ── Step 3: Contact Info ── */}
        {step === 3 && (
          <div style={card}>
            <StepLabel n={3} title="Club contact information" sub="How can players and agents reach your club?" />
            <div className="form-group">
              <label className="label">Contact Phone <span style={{ color: "var(--accent)" }}>*</span></label>
              <input className="input" type="tel" value={form.contactPhone} onChange={e => set("contactPhone", e.target.value)} placeholder="+385 1 234 5678" autoFocus />
            </div>
            <div className="form-group">
              <label className="label">Contact Email <span style={{ color: "var(--accent)" }}>*</span></label>
              <input className="input" type="email" value={form.contactEmail} onChange={e => set("contactEmail", e.target.value)} placeholder="transfers@club.com" />
            </div>
            <div className="form-group" style={{ marginBottom: 28 }}>
              <label className="label">Club Website <span style={{ fontSize: "0.73rem", color: "var(--muted)", fontWeight: 400 }}>(optional)</span></label>
              <input className="input" type="url" value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://yourclub.com" />
            </div>
            {error && <div style={{ color: "var(--red)", fontSize: "0.85rem", marginBottom: 16 }}>{error}</div>}
            <ContinueBtn onClick={validateAndNext} />
          </div>
        )}

        {/* ── Step 4: Representative ── */}
        {step === 4 && (
          <div style={card}>
            <StepLabel n={4} title="Club representative" sub="Who is managing this account? This person will be responsible for all club activity on HandballHub." />
            <div className="form-group">
              <label className="label">Full Name <span style={{ color: "var(--accent)" }}>*</span></label>
              <input className="input" value={form.contactName} onChange={e => set("contactName", e.target.value)} placeholder="John Smith" autoFocus />
            </div>
            <div className="form-group" style={{ marginBottom: 28 }}>
              <label className="label">Position / Title <span style={{ color: "var(--accent)" }}>*</span></label>
              <select className="input" value={form.contactTitle} onChange={e => set("contactTitle", e.target.value)}>
                <option value="">Select title...</option>
                {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {error && <div style={{ color: "var(--red)", fontSize: "0.85rem", marginBottom: 16 }}>{error}</div>}
            <ContinueBtn onClick={validateAndNext} />
          </div>
        )}

        {/* ── Step 5: Description ── */}
        {step === 5 && (
          <div style={card}>
            <StepLabel n={5} title="About your club" sub="Tell players about your club's history, ambitions and playing style. Optional." />
            <div className="form-group" style={{ marginBottom: 28 }}>
              <label className="label">Club Description <span style={{ fontSize: "0.73rem", color: "var(--muted)", fontWeight: 400 }}>(optional)</span></label>
              <textarea className="input" rows={5} value={form.description} onChange={e => set("description", e.target.value)}
                placeholder="Founded in 1985, RK Zagreb is one of the most successful handball clubs in Europe, with 6 EHF Champions League titles..."
                style={{ resize: "vertical", lineHeight: 1.6 }} autoFocus />
            </div>
            {error && <div style={{ color: "var(--red)", fontSize: "0.85rem", marginBottom: 16 }}>{error}</div>}
            <ContinueBtn onClick={finishProfile} label={saving ? "Saving..." : "Continue →"} disabled={saving} />
          </div>
        )}

        {/* ── Step 6: Verification Documents ── */}
        {step === 6 && (
          <div style={card}>
            <StepLabel n={6} title="Verification documents" sub="Upload 3 required documents to verify your club. Accepted: JPEG, PNG, PDF. Max 5MB each." />

            {error && (
              <div style={{ padding: "10px 14px", borderRadius: 6, marginBottom: 16, fontSize: "0.85rem", background: "rgba(255,59,59,0.1)", border: "1px solid rgba(255,59,59,0.3)", color: "var(--red)" }}>
                {error}
              </div>
            )}

            {/* Doc 1 */}
            <div style={{ background: "var(--card2)", borderRadius: "var(--radius)", padding: "14px 16px", marginBottom: 10, border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ background: "var(--accent)", color: "#000", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}>1</span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase" }}>Official Club Document</span>
              </div>
              <FileInput
                label=""
                hint="Club registration certificate, official handball federation license, or equivalent official club document."
                file={officialDoc}
                setFile={setOfficialDoc}
                inputRef={officialRef}
              />
            </div>

            {/* Doc 2 */}
            <div style={{ background: "var(--card2)", borderRadius: "var(--radius)", padding: "14px 16px", marginBottom: 10, border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ background: "var(--accent)", color: "#000", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}>2</span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase" }}>Authorization Letter</span>
              </div>
              <FileInput
                label=""
                hint={`Official letter on club letterhead confirming that ${form.contactName || "the representative"} is authorized to represent the club. Must include club stamp/seal if applicable.`}
                file={authDoc}
                setFile={setAuthDoc}
                inputRef={authRef}
              />
            </div>

            {/* Doc 3 */}
            <div style={{ background: "var(--card2)", borderRadius: "var(--radius)", padding: "14px 16px", marginBottom: 18, border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ background: "var(--accent)", color: "#000", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}>3</span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase" }}>Representative Passport / ID</span>
              </div>
              <FileInput
                label=""
                hint="Valid passport or government-issued ID of the authorized club representative."
                file={passport}
                setFile={setPassport}
                inputRef={passportRef}
              />
            </div>

            {/* Terms */}
            <div style={{ padding: "14px 16px", borderRadius: "var(--radius)", background: "rgba(232,255,71,0.04)", border: "1px solid rgba(232,255,71,0.15)", marginBottom: 20 }}>
              <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}>
                <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
                  style={{ accentColor: "var(--accent)", width: 18, height: 18, flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: "0.8rem", color: "rgba(245,243,238,0.8)", lineHeight: 1.7 }}>
                  I confirm that I am legally authorized to represent <strong style={{ color: "var(--white)" }}>{club.name}</strong> on this platform and agree to the{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>Terms of Service</a>.
                  All submitted documents are genuine.
                </span>
              </label>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: "1rem" }}
              onClick={submitDocs}
              disabled={submitting || !officialDoc || !authDoc || !passport || !termsAccepted}
            >
              {submitting ? <><span className="spinner" /> Submitting...</> : "Submit for Verification →"}
            </button>

            <div style={{ textAlign: "center", marginTop: 10 }}>
              <button type="button" onClick={back} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "0.82rem", cursor: "pointer", padding: "6px" }}>
                ← Back
              </button>
              <span style={{ color: "var(--border)", margin: "0 8px" }}>|</span>
              <button type="button" onClick={() => { window.location.href = "/dashboard/club"; }} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "0.82rem", cursor: "pointer", padding: "6px" }}>
                Skip — verify later
              </button>
            </div>
          </div>
        )}

        {/* ── Step 7: All Done ── */}
        {step === 7 && (
          <div style={{ ...card, textAlign: "center", padding: "52px 36px" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: 20 }}>🎉</div>
            <h2 style={{ fontSize: "1.9rem", marginBottom: 14 }}>Setup Complete!</h2>
            <p style={{ color: "var(--muted)", marginBottom: 8, lineHeight: 1.75, fontSize: "0.95rem" }}>
              Your club profile is set up and verification documents have been submitted.
            </p>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: 32, lineHeight: 1.6 }}>
              Our team will review your documents within <strong style={{ color: "var(--white)" }}>24–48 hours</strong>. You will be notified by email once verified.
            </p>
            <div style={{ background: "rgba(0,200,100,0.08)", border: "1px solid rgba(0,200,100,0.25)", borderRadius: "var(--radius)", padding: "16px 20px", marginBottom: 28 }}>
              <div style={{ fontSize: "0.85rem", color: "rgba(245,243,238,0.85)", lineHeight: 1.7 }}>
                ⏳ <strong style={{ color: "#00c864" }}>Under Review</strong> — documents submitted successfully.
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: "1rem" }}
              onClick={() => { window.location.href = "/dashboard/club"; }}>
              Go to Dashboard →
            </button>
          </div>
        )}

      </div>
    </main>
  );
}
