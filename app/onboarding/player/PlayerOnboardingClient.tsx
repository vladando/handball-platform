"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { COUNTRIES } from "@/lib/countries";
import PhotoCropModal from "@/components/PhotoCropModal";

const POSITIONS = [
  { value: "GOALKEEPER",     label: "Goalkeeper" },
  { value: "LEFT_BACK",      label: "Left Back" },
  { value: "RIGHT_BACK",     label: "Right Back" },
  { value: "LEFT_WING",      label: "Left Wing" },
  { value: "RIGHT_WING",     label: "Right Wing" },
  { value: "CENTRE_BACK",    label: "Centre Back" },
  { value: "PIVOT",          label: "Pivot" },
  { value: "CENTRE_FORWARD", label: "Centre Forward" },
];

const DEFENSIVE_POSITIONS = [
  { value: "POS_1",  label: "1" },
  { value: "POS_2",  label: "2" },
  { value: "POS_3",  label: "3" },
  { value: "POS_4",  label: "4" },
  { value: "POS_5",  label: "5" },
  { value: "POS_6",  label: "6" },
  { value: "POS_51", label: "5:1" },
];

const THIS_YEAR = new Date().getFullYear();

// step 0 = welcome, steps 1-10 = content, step 11 = done
const TOTAL = 10;

export default function PlayerOnboardingClient({ player }: { player: any }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ── DOB parts ─────────────────────────────────────────────────
  const _parseDob = () => {
    if (!player.dateOfBirth) return { d: "", m: "", y: "" };
    try {
      const dt = new Date(player.dateOfBirth);
      if (isNaN(dt.getTime())) return { d: "", m: "", y: "" };
      return { d: String(dt.getUTCDate()), m: String(dt.getUTCMonth() + 1), y: String(dt.getUTCFullYear()) };
    } catch { return { d: "", m: "", y: "" }; }
  };
  const _initDob = _parseDob();
  const [dobDay,   setDobDay]   = useState(_initDob.d);
  const [dobMonth, setDobMonth] = useState(_initDob.m);
  const [dobYear,  setDobYear]  = useState(_initDob.y);

  // ── Basic profile (steps 1-6) ─────────────────────────────────
  const [form, setForm] = useState({
    firstName:         player.firstName && player.firstName !== "—" ? player.firstName : "",
    lastName:          player.lastName  && player.lastName  !== "—" ? player.lastName  : "",
    bio:               player.bio ?? "",
    achievements:      (player as any).achievements ?? "",
    defensivePosition: (player as any).defensivePosition ?? "",
    dateOfBirth:       player.dateOfBirth
                         ? new Date(player.dateOfBirth).toISOString().split("T")[0]
                         : "",
    nationality:       player.nationality === "Unknown" ? "" : (player.nationality ?? ""),
    position:          player.position    ?? "CENTRE_BACK",
    dominantHand:      player.dominantHand ?? "RIGHT",
    heightCm:          player.heightCm === 185 ? "" : String(player.heightCm ?? ""),
    weightKg:          player.weightKg  === 85  ? "" : String(player.weightKg  ?? ""),
    phone:             player.phone      ?? "",
    agentName:         player.agentName  ?? "",
    agentPhone:        player.agentPhone ?? "",
    agentEmail:        player.agentEmail ?? "",
    isAvailable:       player.isAvailable ?? true,
    currentClub:       player.currentClub ?? "",
    expectedSalaryMin: player.expectedSalaryMin
                         ? String(Math.round(player.expectedSalaryMin / 100)) : "",
    expectedSalaryMax: player.expectedSalaryMax
                         ? String(Math.round(player.expectedSalaryMax / 100)) : "",
  });
  function setF(k: string, v: any) { setForm(f => ({ ...f, [k]: v })); setError(""); }

  // ── Career (step 7) ───────────────────────────────────────────
  const [career, setCareer] = useState<any[]>([]);
  const [newCareer, setNewCareer] = useState({
    clubName: "", country: "", startYear: "", endYear: "", isCurrentClub: false,
  });
  const [careerSaving, setCareerSaving] = useState(false);
  const [careerMsg, setCareerMsg] = useState("");

  async function addCareer() {
    if (!newCareer.clubName.trim() || !newCareer.country.trim() || !newCareer.startYear) {
      setCareerMsg("Club name, country and start year are required."); return;
    }
    setCareerSaving(true); setCareerMsg("");
    const payload = {
      clubName: newCareer.clubName,
      country: newCareer.country,
      startDate: `${newCareer.startYear}-01-01`,
      endDate: newCareer.endYear ? `${newCareer.endYear}-07-01` : undefined,
      isCurrentClub: newCareer.isCurrentClub,
    };
    const res = await fetch("/api/player/career", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setCareer(c => [data.entry, ...c]);
      setNewCareer({ clubName: "", country: "", startYear: "", endYear: "", isCurrentClub: false });
      setCareerMsg("✓ Entry saved.");
      setTimeout(() => setCareerMsg(""), 2000);
    }
    setCareerSaving(false);
  }

  async function deleteCareer(id: string) {
    await fetch(`/api/player/career/${id}`, { method: "DELETE" });
    setCareer(c => c.filter(x => x.id !== id));
  }

  // ── Medical (step 8) ──────────────────────────────────────────
  const [medical, setMedical] = useState<any[]>([]);
  const [medType, setMedType] = useState<"INJURY" | "PHYSICAL_TEST">("INJURY");
  const [newMed, setNewMed] = useState({
    testName: "", testResult: "", testUnit: "",
    injuryType: "", bodyPart: "", injuryDate: "", returnDate: "",
    notes: "", isVisibleToClubs: true,
  });
  const [medSaving, setMedSaving] = useState(false);
  const [medMsg, setMedMsg] = useState("");

  async function addMedical() {
    setMedSaving(true); setMedMsg("");
    const res = await fetch("/api/player/medical", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newMed, recordType: medType }),
    });
    if (res.ok) {
      const data = await res.json();
      setMedical(m => [data.record, ...m]);
      setNewMed({ testName: "", testResult: "", testUnit: "", injuryType: "", bodyPart: "", injuryDate: "", returnDate: "", notes: "", isVisibleToClubs: true });
      setMedMsg("✓ Record saved.");
      setTimeout(() => setMedMsg(""), 2000);
    }
    setMedSaving(false);
  }

  async function deleteMedical(id: string) {
    await fetch(`/api/player/medical/${id}`, { method: "DELETE" });
    setMedical(m => m.filter(x => x.id !== id));
  }

  // ── Videos (step 9) ───────────────────────────────────────────
  const [videos, setVideos] = useState<any[]>([]);
  const [newVideo, setNewVideo] = useState({ title: "", youtubeUrl: "", description: "" });
  const [videoSaving, setVideoSaving] = useState(false);
  const [videoMsg, setVideoMsg] = useState("");

  async function addVideo() {
    if (!newVideo.title.trim() || !newVideo.youtubeUrl.trim()) {
      setVideoMsg("Title and YouTube URL are required."); return;
    }
    setVideoSaving(true); setVideoMsg("");
    const res = await fetch("/api/player/videos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newVideo),
    });
    if (res.ok) {
      const data = await res.json();
      setVideos(v => [...v, data.video]);
      setNewVideo({ title: "", youtubeUrl: "", description: "" });
      setVideoMsg("✓ Video added.");
      setTimeout(() => setVideoMsg(""), 2000);
    }
    setVideoSaving(false);
  }

  async function deleteVideo(id: string) {
    await fetch(`/api/player/videos/${id}`, { method: "DELETE" });
    setVideos(v => v.filter(x => x.id !== id));
  }

  // ── Photo + Gallery (step 10) ─────────────────────────────────
  const [photoUrl, setPhotoUrl] = useState<string | null>(player.photoUrl ?? null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoMsg, setPhotoMsg] = useState("");
  const [cropFile, setCropFile] = useState<File | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const [gallery, setGallery] = useState<any[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryCaption, setGalleryCaption] = useState("");
  const [galleryError, setGalleryError] = useState("");
  const galleryRef = useRef<HTMLInputElement>(null);

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropFile(file);
    if (photoRef.current) photoRef.current.value = "";
  }

  async function handleCropConfirm(croppedFile: File, posX: number, posY: number) {
    setCropFile(null);
    setPhotoUploading(true); setPhotoMsg("");
    const fd = new FormData();
    fd.append("file", croppedFile);
    const res = await fetch("/api/player/upload-photo", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) {
      setPhotoUrl(data.photoUrl);
      // Save position
      await fetch("/api/player/photo-position", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x: posX, y: posY }),
      });
      setPhotoMsg("✓ Photo uploaded!");
    } else {
      setPhotoMsg("Upload failed. Try again.");
    }
    setPhotoUploading(false);
  }

  async function handleGallerySelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setGalleryUploading(true); setGalleryError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("caption", galleryCaption);
    const res = await fetch("/api/player/gallery", { method: "POST", body: fd });
    const data = await res.json();
    setGalleryUploading(false);
    if (res.ok) {
      setGallery(g => [...g, data.image]);
      setGalleryCaption("");
    } else {
      setGalleryError(data.error ?? "Upload failed.");
    }
    if (galleryRef.current) galleryRef.current.value = "";
  }

  async function deleteGalleryImage(id: string) {
    await fetch(`/api/player/gallery/${id}`, { method: "DELETE" });
    setGallery(g => g.filter(x => x.id !== id));
  }

  // ── Navigation ────────────────────────────────────────────────
  function next() {
    if (step === 1 && (!form.firstName.trim() || !form.lastName.trim())) {
      setError("Please enter your first and last name."); return;
    }
    if (step === 2 && (!dobDay || !dobMonth || !dobYear || !form.nationality.trim())) {
      setError("Please fill in date of birth and nationality."); return;
    }
    if (step === 4 && (!form.heightCm || !form.weightKg)) {
      setError("Please enter your height and weight."); return;
    }
    if (step === 5 && !form.phone.trim()) {
      setError("Phone number is required."); return;
    }
    setError(""); setStep(s => s + 1);
  }

  function back() { setError(""); setCareerMsg(""); setMedMsg(""); setVideoMsg(""); setStep(s => Math.max(0, s - 1)); }

  // After step 6: save basic profile + mark onboardingCompleted
  async function finishBasic() {
    setSaving(true); setError("");
    const res = await fetch("/api/player/onboarding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        dateOfBirth: (dobYear && dobMonth && dobDay)
          ? `${dobYear}-${String(dobMonth).padStart(2,"0")}-${String(dobDay).padStart(2,"0")}`
          : form.dateOfBirth,
        heightCm: parseInt(form.heightCm) || 185,
        weightKg: parseInt(form.weightKg) || 85,
        // Send raw EUR — API multiplies x100
        expectedSalaryMin: form.expectedSalaryMin ? parseFloat(form.expectedSalaryMin) : null,
        expectedSalaryMax: form.expectedSalaryMax ? parseFloat(form.expectedSalaryMax) : null,
      }),
    });
    setSaving(false);
    if (res.ok) setStep(7);
    else setError("Something went wrong. Please try again.");
  }

  // ── UI helpers ────────────────────────────────────────────────
  const progress = step >= 1 && step <= TOTAL ? step / TOTAL : 0;

  const card: React.CSSProperties = {
    background: "var(--card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)", padding: "32px 28px",
  };

  function StepLabel({ n, title, sub }: { n: number; title: string; sub?: string }) {
    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: "0.68rem", color: "var(--accent)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
          Step {n} of {TOTAL}
        </div>
        <h3 style={{ fontSize: "1.5rem", margin: 0, lineHeight: 1.2 }}>{title}</h3>
        {sub && <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: 8, marginBottom: 0, lineHeight: 1.6 }}>{sub}</p>}
      </div>
    );
  }

  function ContinueBtn({ onClick, label = "Continue \u2192", disabled = false }: { onClick: () => void; label?: string; disabled?: boolean }) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "13px" }} onClick={onClick} disabled={disabled}>
          {label}
        </button>
        {step > 0 && (
          <div style={{ textAlign: "center" }}>
            <button type="button" onClick={() => setStep(s => s - 1)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "0.82rem", cursor: "pointer", padding: "6px" }}>
              &larr; Back
            </button>
          </div>
        )}
      </div>
    );
  }

  function Msg({ text }: { text: string }) {
    if (!text) return null;
    const ok = text.startsWith("✓");
    return (
      <div style={{ fontSize: "0.82rem", marginBottom: 12, color: ok ? "#00c864" : "var(--red)" }}>{text}</div>
    );
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: "24px 16px" }}>

      {/* Crop modal */}
      {cropFile && (
        <PhotoCropModal
          file={cropFile}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropFile(null)}
        />
      )}

      {/* Logo */}
      <div style={{ marginBottom: 24, textAlign: "center" }}>
        <Link href="/" style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.4rem", textTransform: "uppercase", color: "var(--white)", textDecoration: "none" }}>
          Handball<span style={{ color: "var(--accent)" }}>Hub</span>
        </Link>
      </div>

      {/* Progress bar */}
      {step >= 1 && step <= TOTAL && (
        <div style={{ width: "100%", maxWidth: 520, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>Step {step} of {TOTAL}</span>
            <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{Math.round(progress * 100)}%</span>
          </div>
          <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress * 100}%`, background: "var(--accent)", borderRadius: 2, transition: "width 0.3s ease" }} />
          </div>
        </div>
      )}

      <div style={{ width: "100%", maxWidth: 520 }}>

        {/* ── Step 0: Welcome ── */}
        {step === 0 && (
          <div style={{ ...card, textAlign: "center", padding: "44px 32px" }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>&#128075;</div>
            <h2 style={{ fontSize: "1.8rem", marginBottom: 12 }}>
              Welcome to <span style={{ color: "var(--accent)" }}>HandballHub!</span>
            </h2>
            <p style={{ color: "var(--muted)", lineHeight: 1.7, marginBottom: 8 }}>
              Let&apos;s build your player profile in <strong style={{ color: "var(--white)" }}>10 steps</strong>.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "20px 0 28px", textAlign: "left" }}>
              {[
                ["1–6", "Personal & contact info"],
                ["7", "Career history"],
                ["8", "Medical records"],
                ["9", "Highlight videos"],
                ["10", "Profile photo & gallery"],
              ].map(([num, label]) => (
                <div key={num} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem", color: "var(--muted)" }}>
                  <span style={{ background: "var(--accent)", color: "var(--black)", borderRadius: 4, padding: "1px 6px", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.72rem", flexShrink: 0 }}>{num}</span>
                  {label}
                </div>
              ))}
            </div>
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", fontSize: "1rem", padding: "15px" }} onClick={() => setStep(1)}>
              Let&apos;s Go &rarr;
            </button>
          </div>
        )}

        {/* ── Step 1: Name ── */}
        {step === 1 && (
          <div style={card}>
            <StepLabel n={1} title="What's your name?" sub="This appears on your public profile visible to clubs." />
            <div className="form-group">
              <label className="label">First Name</label>
              <input className="input" style={{ fontSize: "1.1rem", padding: "13px 16px" }} value={form.firstName} onChange={e => setF("firstName", e.target.value)} placeholder="Ivan" autoFocus />
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="label">Last Name</label>
              <input className="input" style={{ fontSize: "1.1rem", padding: "13px 16px" }} value={form.lastName} onChange={e => setF("lastName", e.target.value)} placeholder="Petrovic" />
            </div>
            {error && <div style={{ color: "var(--red)", fontSize: "0.85rem", marginBottom: 14 }}>{error}</div>}
            <ContinueBtn onClick={next} />
          </div>
        )}

        {/* ── Step 2: DOB + Nationality ── */}
        {step === 2 && (
          <div style={card}>
            <StepLabel n={2} title="Tell us about yourself" sub="Your age and nationality help clubs find the right player." />
            <div className="form-group">
              <label className="label">Date of Birth</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.6fr", gap: 8 }}>
                <input className="input" type="number" min={1} max={31} value={dobDay} onChange={e => setDobDay(e.target.value)} placeholder="DD" style={{ textAlign: "center", fontSize: "1.1rem", padding: "13px 8px" }} autoFocus />
                <input className="input" type="number" min={1} max={12} value={dobMonth} onChange={e => setDobMonth(e.target.value)} placeholder="MM" style={{ textAlign: "center", fontSize: "1.1rem", padding: "13px 8px" }} />
                <input className="input" type="number" min={1950} max={2010} value={dobYear} onChange={e => setDobYear(e.target.value)} placeholder="YYYY" style={{ textAlign: "center", fontSize: "1.1rem", padding: "13px 8px" }} />
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 6 }}>Day / Month / Year</div>
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="label">Nationality</label>
              <select className="input" style={{ fontSize: "1rem", padding: "13px 16px" }} value={form.nationality} onChange={e => setF("nationality", e.target.value)}>
                <option value="">— Select country —</option>
                {COUNTRIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {error && <div style={{ color: "var(--red)", fontSize: "0.85rem", marginBottom: 14 }}>{error}</div>}
            <ContinueBtn onClick={next} />
          </div>
        )}

        {/* ── Step 3: Position + Hand ── */}
        {step === 3 && (
          <div style={card}>
            <StepLabel n={3} title="Your position on court" sub="Select your primary playing position and dominant hand." />
            <div className="form-group">
              <label className="label">Position</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 6 }}>
                {POSITIONS.map(p => (
                  <button key={p.value} type="button" onClick={() => setF("position", p.value)} style={{ padding: "10px 8px", borderRadius: "var(--radius)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.03em", cursor: "pointer", transition: "all 0.15s", background: form.position === p.value ? "var(--accent)" : "var(--card2)", color: form.position === p.value ? "var(--black)" : "var(--muted)", border: form.position === p.value ? "2px solid var(--accent)" : "1px solid var(--border)" }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="label">Dominant Hand</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
                {[{ value: "RIGHT", label: "Right Hand" }, { value: "LEFT", label: "Left Hand" }].map(h => (
                  <button key={h.value} type="button" onClick={() => setF("dominantHand", h.value)} style={{ padding: "13px", borderRadius: "var(--radius)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", transition: "all 0.15s", background: form.dominantHand === h.value ? "var(--accent)" : "var(--card2)", color: form.dominantHand === h.value ? "var(--black)" : "var(--muted)", border: form.dominantHand === h.value ? "2px solid var(--accent)" : "1px solid var(--border)" }}>
                    {h.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="label">Defensive Position <span style={{ fontSize: "0.73rem", color: "var(--muted)", fontWeight: 400 }}>(optional)</span></label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 6 }}>
                {DEFENSIVE_POSITIONS.map(p => {
                  const selected = (form.defensivePosition || "").split(",").filter(Boolean).includes(p.value);
                  return (
                    <button key={p.value} type="button" onClick={() => {
                      const cur = (form.defensivePosition || "").split(",").filter(Boolean);
                      const idx = cur.indexOf(p.value);
                      if (idx >= 0) cur.splice(idx, 1); else cur.push(p.value);
                      setF("defensivePosition", cur.join(","));
                    }} style={{ padding: "10px 8px", borderRadius: "var(--radius)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.03em", cursor: "pointer", transition: "all 0.15s", background: selected ? "var(--accent)" : "var(--card2)", color: selected ? "var(--black)" : "var(--muted)", border: selected ? "2px solid var(--accent)" : "1px solid var(--border)" }}>
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <ContinueBtn onClick={next} />
          </div>
        )}

        {/* ── Step 4: Height + Weight ── */}
        {step === 4 && (
          <div style={card}>
            <StepLabel n={4} title="Your physical profile" sub="Clubs need this for player matching. You can update it later." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="label" style={{ textAlign: "center", display: "block" }}>Height (cm)</label>
                <input className="input" style={{ fontSize: "1.8rem", padding: "16px 12px", textAlign: "center", fontFamily: "var(--font-mono)", fontWeight: 700 }} type="number" min={150} max={230} value={form.heightCm} onChange={e => setF("heightCm", e.target.value)} placeholder="190" autoFocus />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="label" style={{ textAlign: "center", display: "block" }}>Weight (kg)</label>
                <input className="input" style={{ fontSize: "1.8rem", padding: "16px 12px", textAlign: "center", fontFamily: "var(--font-mono)", fontWeight: 700 }} type="number" min={50} max={180} value={form.weightKg} onChange={e => setF("weightKg", e.target.value)} placeholder="90" />
              </div>
            </div>
            {error && <div style={{ color: "var(--red)", fontSize: "0.85rem", marginBottom: 14 }}>{error}</div>}
            <ContinueBtn onClick={next} />
          </div>
        )}

        {/* ── Step 5: Contact ── */}
        {step === 5 && (
          <div style={card}>
            <StepLabel n={5} title="How can clubs reach you?" sub="Your contact details are hidden from the public. Clubs receive them only after formally expressing interest and accepting our Terms of Service." />
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label className="label">Phone Number <span style={{ color: "var(--accent)" }}>*</span></label>
              <input className="input" style={{ fontSize: "1.1rem", padding: "14px 16px" }} type="tel" value={form.phone} onChange={e => setF("phone", e.target.value)} placeholder="+385 91 234 5678" autoFocus />
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--muted)", marginBottom: 20, display: "flex", gap: 6 }}>
              <span>&#128274;</span><span>Encrypted and never shown publicly</span>
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginBottom: 20 }}>
              <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 12 }}>
                Agent contact <span style={{ fontStyle: "italic" }}>(optional — fill only if you have an agent)</span>
              </div>
              <div className="form-group">
                <label className="label">Agent Name</label>
                <input className="input" value={form.agentName} onChange={e => setF("agentName", e.target.value)} placeholder="John Smith" />
              </div>
              <div className="form-group">
                <label className="label">Agent Phone</label>
                <input className="input" type="tel" value={form.agentPhone} onChange={e => setF("agentPhone", e.target.value)} placeholder="+44 7700 900000" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label">Agent Email</label>
                <input className="input" type="email" value={form.agentEmail} onChange={e => setF("agentEmail", e.target.value)} placeholder="agent@sports.com" />
              </div>
            </div>

            {error && <div style={{ color: "var(--red)", fontSize: "0.85rem", marginBottom: 14 }}>{error}</div>}
            <ContinueBtn onClick={next} />
          </div>
        )}

        {/* ── Step 6: Availability + Salary ── */}
        {step === 6 && (
          <div style={card}>
            <StepLabel n={6} title="Your availability" sub="Tell clubs whether you're open to offers right now." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {[
                { value: true,  label: "Available",    sub: "Open to offers" },
                { value: false, label: "Not Available", sub: "Under contract" },
              ].map(opt => (
                <button key={String(opt.value)} type="button" onClick={() => setF("isAvailable", opt.value)} style={{ padding: "14px 10px", borderRadius: "var(--radius)", cursor: "pointer", transition: "all 0.15s", textAlign: "left", background: form.isAvailable === opt.value ? "var(--accent)" : "var(--card2)", color: form.isAvailable === opt.value ? "var(--black)" : "var(--white)", border: form.isAvailable === opt.value ? "2px solid var(--accent)" : "1px solid var(--border)" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.83rem" }}>{opt.label}</div>
                  <div style={{ fontSize: "0.7rem", opacity: 0.7, marginTop: 2 }}>{opt.sub}</div>
                </button>
              ))}
            </div>
            <div className="form-group">
              <label className="label">Current Club <span style={{ fontSize: "0.73rem", color: "var(--muted)", fontWeight: 400 }}>(optional)</span></label>
              <input className="input" value={form.currentClub} onChange={e => setF("currentClub", e.target.value)} placeholder="RK Zagreb, FC Barcelona..." />
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="label">Expected Annual Salary &euro; <span style={{ fontSize: "0.73rem", color: "var(--muted)", fontWeight: 400 }}>(optional)</span></label>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input className="input" type="number" min={0} value={form.expectedSalaryMin} onChange={e => setF("expectedSalaryMin", e.target.value)} placeholder="From" style={{ flex: 1, textAlign: "center" }} />
                <span style={{ color: "var(--muted)", fontSize: "1.2rem", flexShrink: 0 }}>&mdash;</span>
                <input className="input" type="number" min={0} value={form.expectedSalaryMax} onChange={e => setF("expectedSalaryMax", e.target.value)} placeholder="To" style={{ flex: 1, textAlign: "center" }} />
              </div>
            </div>
            {error && <div style={{ color: "var(--red)", fontSize: "0.85rem", marginBottom: 14 }}>{error}</div>}
            <ContinueBtn onClick={finishBasic} label={saving ? "Saving..." : "Save & Continue \u2192"} disabled={saving} />
          </div>
        )}

        {/* ── Step 7: Career History ── */}
        {step === 7 && (
          <div style={card}>
            <StepLabel n={7} title="Career &amp; About You" sub="Add your clubs, trophies and tell clubs something about yourself." />

            {/* Trophies & Achievements */}
            <div style={{ background: "var(--card2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px", marginBottom: 16 }}>
              <div style={{ fontSize: "0.78rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, fontFamily: "var(--font-mono)" }}>&#127942; Trophies &amp; Achievements</div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label" style={{ fontSize: "0.72rem" }}>List your trophies, titles and achievements <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional)</span></label>
                <textarea className="input" rows={4} value={form.achievements} onChange={e => setF("achievements", e.target.value)} placeholder="EHF Champions League winner 2022, Croatian national champion 2021..." style={{ resize: "none", lineHeight: 1.5 }} />
              </div>
            </div>

            {/* Add form */}
            <div style={{ background: "var(--card2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px", marginBottom: 16 }}>
              <div className="grid-2">
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label className="label" style={{ fontSize: "0.72rem" }}>Club Name *</label>
                  <input className="input" value={newCareer.clubName} onChange={e => setNewCareer(c => ({ ...c, clubName: e.target.value }))} placeholder="RK Zagreb" />
                </div>
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label className="label" style={{ fontSize: "0.72rem" }}>Country *</label>
                  <input className="input" value={newCareer.country} onChange={e => setNewCareer(c => ({ ...c, country: e.target.value }))} placeholder="Croatia" />
                </div>
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label className="label" style={{ fontSize: "0.72rem" }}>Start Year *</label>
                  <input className="input" type="number" min={1960} max={THIS_YEAR} value={newCareer.startYear} onChange={e => setNewCareer(c => ({ ...c, startYear: e.target.value }))} placeholder="2020" />
                </div>
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label className="label" style={{ fontSize: "0.72rem" }}>End Year <span style={{ color: "var(--muted)", fontWeight: 400 }}>(blank = current)</span></label>
                  <input className="input" type="number" min={1960} max={THIS_YEAR} value={newCareer.endYear} onChange={e => setNewCareer(c => ({ ...c, endYear: e.target.value }))} placeholder="2023" />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <input type="checkbox" id="isCurrent" checked={newCareer.isCurrentClub} onChange={e => setNewCareer(c => ({ ...c, isCurrentClub: e.target.checked }))} style={{ accentColor: "var(--accent)", width: 15, height: 15 }} />
                <label htmlFor="isCurrent" className="label" style={{ margin: 0, fontSize: "0.78rem" }}>This is my current club</label>
              </div>
              <Msg text={careerMsg} />
              <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "10px", fontSize: "0.88rem" }} onClick={addCareer} disabled={careerSaving}>
                {careerSaving ? <><span className="spinner" /> Saving...</> : "+ Add Entry"}
              </button>
            </div>

            {/* Added entries */}
            {career.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {career.map((e: any) => (
                  <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--card2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "10px 14px" }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.9rem", textTransform: "uppercase" }}>
                        {e.clubName} {e.isCurrentClub && <span className="badge badge-green" style={{ fontSize: "0.65rem", marginLeft: 6 }}>Current</span>}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{e.country} &middot; {new Date(e.startDate).getFullYear()} &mdash; {e.endDate ? new Date(e.endDate).getFullYear() : "Present"}</div>
                    </div>
                    <button onClick={() => deleteCareer(e.id)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "0.85rem", padding: "4px 8px" }}>&#x2715;</button>
                  </div>
                ))}
              </div>
            )}

            <ContinueBtn onClick={next} />
          </div>
        )}

        {/* ── Step 8: Medical Records ── */}
        {step === 8 && (
          <div style={card}>
            <StepLabel n={8} title="Medical Records" sub="Add physical test results or injury history. Clubs use this to assess your fitness. Optional." />

            <div style={{ background: "var(--card2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px", marginBottom: 16 }}>
              {/* Record type tabs */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 14 }}>
                {(["INJURY", "PHYSICAL_TEST"] as const).map(t => (
                  <button key={t} type="button" onClick={() => setMedType(t)} style={{ padding: "8px 4px", borderRadius: "var(--radius)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer", transition: "all 0.15s", background: medType === t ? "var(--accent)" : "transparent", color: medType === t ? "var(--black)" : "var(--muted)", border: medType === t ? "2px solid var(--accent)" : "1px solid var(--border)" }}>
                    {t === "PHYSICAL_TEST" ? "Physical Test" : "Injury"}
                  </button>
                ))}
              </div>

              {medType === "PHYSICAL_TEST" && (
                <div className="grid-2">
                  <div className="form-group" style={{ marginBottom: 10 }}>
                    <label className="label" style={{ fontSize: "0.72rem" }}>Test Name</label>
                    <input className="input" value={newMed.testName} onChange={e => setNewMed(m => ({ ...m, testName: e.target.value }))} placeholder="Yo-Yo Test Level 2" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 10 }}>
                    <label className="label" style={{ fontSize: "0.72rem" }}>Result</label>
                    <input className="input" value={newMed.testResult} onChange={e => setNewMed(m => ({ ...m, testResult: e.target.value }))} placeholder="18.5" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 10 }}>
                    <label className="label" style={{ fontSize: "0.72rem" }}>Unit</label>
                    <input className="input" value={newMed.testUnit} onChange={e => setNewMed(m => ({ ...m, testUnit: e.target.value }))} placeholder="ml/kg/min" />
                  </div>
                </div>
              )}
              {medType === "INJURY" && (
                <div className="grid-2">
                  <div className="form-group" style={{ marginBottom: 10 }}>
                    <label className="label" style={{ fontSize: "0.72rem" }}>Injury Type</label>
                    <input className="input" value={newMed.injuryType} onChange={e => setNewMed(m => ({ ...m, injuryType: e.target.value }))} placeholder="ACL tear, muscle strain..." />
                  </div>
                  <div className="form-group" style={{ marginBottom: 10 }}>
                    <label className="label" style={{ fontSize: "0.72rem" }}>Body Part</label>
                    <input className="input" value={newMed.bodyPart} onChange={e => setNewMed(m => ({ ...m, bodyPart: e.target.value }))} placeholder="Right knee..." />
                  </div>
                  <div className="form-group" style={{ marginBottom: 10 }}>
                    <label className="label" style={{ fontSize: "0.72rem" }}>Injury Date</label>
                    <input className="input" type="date" value={newMed.injuryDate} onChange={e => setNewMed(m => ({ ...m, injuryDate: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 10 }}>
                    <label className="label" style={{ fontSize: "0.72rem" }}>Return to Play Date</label>
                    <input className="input" type="date" value={newMed.returnDate} onChange={e => setNewMed(m => ({ ...m, returnDate: e.target.value }))} />
                  </div>
                </div>
              )}
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label className="label" style={{ fontSize: "0.72rem" }}>Notes <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional)</span></label>
                <textarea className="input" rows={2} value={newMed.notes} onChange={e => setNewMed(m => ({ ...m, notes: e.target.value }))} placeholder="Additional details..." style={{ resize: "none" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <input type="checkbox" id="visClubs" checked={newMed.isVisibleToClubs} onChange={e => setNewMed(m => ({ ...m, isVisibleToClubs: e.target.checked }))} style={{ accentColor: "var(--accent)", width: 15, height: 15 }} />
                <label htmlFor="visClubs" className="label" style={{ margin: 0, fontSize: "0.78rem" }}>Visible to clubs</label>
              </div>
              <Msg text={medMsg} />
              <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "10px", fontSize: "0.88rem" }} onClick={addMedical} disabled={medSaving}>
                {medSaving ? <><span className="spinner" /> Saving...</> : "+ Add Record"}
              </button>
            </div>

            {/* Added records */}
            {medical.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {medical.map((r: any) => (
                  <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--card2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "10px 14px" }}>
                    <div>
                      <span className={`badge ${r.recordType === "INJURY" ? "badge-red" : r.recordType === "PHYSICAL_TEST" ? "badge-blue" : "badge-green"}`} style={{ fontSize: "0.65rem", marginRight: 6 }}>
                        {r.recordType.replace("_", " ")}
                      </span>
                      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.88rem", textTransform: "uppercase" }}>
                        {r.testName ?? r.injuryType ?? "Record"}
                      </span>
                      {r.testResult && <span style={{ color: "var(--accent)", marginLeft: 8, fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>{r.testResult} {r.testUnit}</span>}
                    </div>
                    <button onClick={() => deleteMedical(r.id)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "0.85rem", padding: "4px 8px" }}>&#x2715;</button>
                  </div>
                ))}
              </div>
            )}

            <ContinueBtn onClick={next} />
          </div>
        )}

        {/* ── Step 9: Videos ── */}
        {step === 9 && (
          <div style={card}>
            <StepLabel n={9} title="Highlight Videos" sub="Add YouTube links to your best match highlights. Clubs love video proof of your skills." />

            <div style={{ background: "var(--card2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px", marginBottom: 16 }}>
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label className="label" style={{ fontSize: "0.72rem" }}>Video Title</label>
                <input className="input" value={newVideo.title} onChange={e => setNewVideo(v => ({ ...v, title: e.target.value }))} placeholder="Highlights vs THW Kiel 2024" />
              </div>
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label className="label" style={{ fontSize: "0.72rem" }}>YouTube URL</label>
                <input className="input" value={newVideo.youtubeUrl} onChange={e => setNewVideo(v => ({ ...v, youtubeUrl: e.target.value }))} placeholder="https://youtube.com/watch?v=..." />
              </div>
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label className="label" style={{ fontSize: "0.72rem" }}>Description <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional)</span></label>
                <input className="input" value={newVideo.description} onChange={e => setNewVideo(v => ({ ...v, description: e.target.value }))} placeholder="EHF Champions League Quarter Final..." />
              </div>
              <Msg text={videoMsg} />
              <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "10px", fontSize: "0.88rem" }} onClick={addVideo} disabled={videoSaving}>
                {videoSaving ? <><span className="spinner" /> Saving...</> : "+ Add Video"}
              </button>
            </div>

            {/* Added videos */}
            {videos.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {videos.map((v: any) => (
                  <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--card2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "10px 14px" }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.88rem", textTransform: "uppercase" }}>&#9654; {v.title}</div>
                      {v.description && <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{v.description}</div>}
                    </div>
                    <button onClick={() => deleteVideo(v.id)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "0.85rem", padding: "4px 8px" }}>&#x2715;</button>
                  </div>
                ))}
              </div>
            )}

            <ContinueBtn onClick={next} />
          </div>
        )}

        {/* ── Step 10: Profile Photo + Gallery ── */}
        {step === 10 && (
          <div style={card}>
            <StepLabel n={10} title="Profile Photo & Gallery" sub="A professional photo makes your profile stand out. You can also add action shots to your gallery." />

            {/* Profile photo */}
            <div style={{ background: "var(--card2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px", marginBottom: 20 }}>
              <div style={{ fontSize: "0.78rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, fontFamily: "var(--font-mono)" }}>Profile Photo</div>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ width: 90, height: 90, borderRadius: "50%", flexShrink: 0, border: "3px solid var(--border)", overflow: "hidden", background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>
                  {photoUrl
                    ? <img src={photoUrl} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span>&#128100;</span>
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handlePhotoSelect} />
                  <button className="btn btn-primary" style={{ marginBottom: 8, justifyContent: "center" }} onClick={() => photoRef.current?.click()} disabled={photoUploading}>
                    {photoUploading
                      ? <><span className="spinner" /> Uploading...</>
                      : photoUrl ? "Change Photo" : "Upload Photo"
                    }
                  </button>
                  {photoMsg && (
                    <div style={{ fontSize: "0.78rem", color: photoMsg.startsWith("✓") ? "#00c864" : "var(--red)" }}>{photoMsg}</div>
                  )}
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 4 }}>JPEG, PNG or WebP &middot; max 5 MB &middot; crop &amp; position after upload</div>
                </div>
              </div>
            </div>

            {/* Gallery */}
            <div style={{ background: "var(--card2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px", marginBottom: 20 }}>
              <div style={{ fontSize: "0.78rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, fontFamily: "var(--font-mono)" }}>Photo Gallery <span style={{ color: "var(--muted)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></div>

              <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 12, flexWrap: "wrap" }}>
                <div className="form-group" style={{ flex: 1, minWidth: 160, margin: 0 }}>
                  <label className="label" style={{ fontSize: "0.72rem" }}>Caption (optional)</label>
                  <input className="input" value={galleryCaption} onChange={e => setGalleryCaption(e.target.value)} placeholder="Training session, match action..." />
                </div>
                <div>
                  <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleGallerySelect} />
                  <button className="btn btn-primary" style={{ fontSize: "0.85rem", justifyContent: "center" }} onClick={() => galleryRef.current?.click()} disabled={galleryUploading || gallery.length >= 12}>
                    {galleryUploading ? <><span className="spinner" /> Uploading...</> : gallery.length >= 12 ? "Gallery Full" : "+ Add Photo"}
                  </button>
                </div>
              </div>

              {galleryError && <div style={{ fontSize: "0.78rem", color: "var(--red)", marginBottom: 8 }}>{galleryError}</div>}

              {gallery.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8, marginTop: 4 }}>
                  {gallery.map((img: any) => (
                    <div key={img.id} style={{ position: "relative", aspectRatio: "1", borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--border)" }}>
                      <img src={img.url} alt={img.caption ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button onClick={() => deleteGalleryImage(img.id)} style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", cursor: "pointer", fontSize: "0.7rem", display: "flex", alignItems: "center", justifyContent: "center" }}>&#x2715;</button>
                    </div>
                  ))}
                </div>
              )}
              {gallery.length === 0 && (
                <div style={{ fontSize: "0.78rem", color: "var(--muted)", textAlign: "center", padding: "12px 0" }}>No gallery photos yet.</div>
              )}
            </div>

            <ContinueBtn onClick={() => setStep(11)} label={photoUrl ? "Finish \u2192" : "Finish Without Photo \u2192"} />
          </div>
        )}

        {/* ── Step 11: Done ── */}
        {step === 11 && (
          <div style={{ ...card, textAlign: "center", padding: "48px 32px" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: 16 }}>&#127881;</div>
            <h2 style={{ fontSize: "1.8rem", marginBottom: 12 }}>Profile Complete!</h2>
            <p style={{ color: "var(--muted)", lineHeight: 1.7, marginBottom: 8 }}>
              Your player profile is fully set up.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "16px 0 28px", textAlign: "left" }}>
              {[
                career.length > 0   && `&#10003; ${career.length} career entr${career.length === 1 ? "y" : "ies"} added`,
                medical.length > 0  && `&#10003; ${medical.length} medical record${medical.length === 1 ? "" : "s"} added`,
                videos.length > 0   && `&#10003; ${videos.length} video${videos.length === 1 ? "" : "s"} added`,
                photoUrl            && "&#10003; Profile photo uploaded",
                gallery.length > 0  && `&#10003; ${gallery.length} gallery photo${gallery.length === 1 ? "" : "s"} added`,
              ].filter(Boolean).map((item, i) => (
                <div key={i} style={{ fontSize: "0.85rem", color: "#00c864" }} dangerouslySetInnerHTML={{ __html: item as string }} />
              ))}
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginBottom: 28, lineHeight: 1.6 }}>
              Once an admin verifies your identity, your profile becomes visible in the player directory and clubs can contact you.
            </p>
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "15px", fontSize: "1rem" }} onClick={() => { window.location.href = player.slug ? `/players/${player.slug}` : "/dashboard/player"; }}>
              Go to My Profile &rarr;
            </button>
          </div>
        )}

        {/* Back button */}
        {step >= 1 && step <= TOTAL && (
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <button onClick={back} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "0.83rem", cursor: "pointer" }}>
              &larr; Back
            </button>
          </div>
        )}

      </div>
    </main>
  );
}
