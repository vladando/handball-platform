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

const NAV_ITEMS = [
  { id: "profile",  label: "Edit Profile",  icon: "👤" },
  { id: "career",   label: "Career",        icon: "📅" },
  { id: "videos",   label: "Videos",        icon: "▶" },
  { id: "medical",  label: "Medical",       icon: "⚕" },
  { id: "gallery",  label: "Photo & Gallery", icon: "📷" },
  { id: "health",   label: "Notes & Health", icon: "🏥" },
];

const HEALTH_STATUSES = ["HEALTHY", "INJURED", "REHAB", "SUSPENDED"] as const;
const HEALTH_COLORS: Record<string, string> = {
  HEALTHY: "#00c864", INJURED: "var(--red)", REHAB: "var(--accent)", SUSPENDED: "var(--muted)",
};
const NOTE_CATEGORIES = ["general", "financial", "personal", "contract", "tactical"] as const;

export default function AgentPlayerEditClient({ player }: { player: any }) {
  const agentPlayerId: string = player.id;
  const [tab, setTab] = useState("profile");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Profile form ─────────────────────────────────────────────────
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

  const [form, setForm] = useState({
    firstName:         player.firstName && player.firstName !== "—" ? player.firstName : "",
    lastName:          player.lastName  && player.lastName  !== "—" ? player.lastName  : "",
    bio:               player.bio ?? "",
    achievements:      player.achievements ?? "",
    defensivePosition: player.defensivePosition ?? "",
    nationality:       player.nationality === "Unknown" ? "" : (player.nationality ?? ""),
    position:          player.position    ?? "CENTRE_BACK",
    dominantHand:      player.dominantHand ?? "RIGHT",
    heightCm:          player.heightCm === 185 ? "" : String(player.heightCm ?? ""),
    weightKg:          player.weightKg  === 85  ? "" : String(player.weightKg  ?? ""),
    phone:             player.phone      ?? "",
    currentClub:       player.currentClub ?? "",
    isAvailable:       player.isAvailable ?? true,
    expectedSalaryMin: player.expectedSalaryMin ? String(Math.round(player.expectedSalaryMin / 100)) : "",
    expectedSalaryMax: player.expectedSalaryMax ? String(Math.round(player.expectedSalaryMax / 100)) : "",
  });
  function setF(k: string, v: any) { setForm(f => ({ ...f, [k]: v })); }
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true); setProfileMsg("");
    const res = await fetch("/api/player/onboarding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        agentPlayerId,
        dateOfBirth: (dobYear && dobMonth && dobDay)
          ? `${dobYear}-${String(dobMonth).padStart(2,"0")}-${String(dobDay).padStart(2,"0")}`
          : undefined,
        heightCm: parseInt(form.heightCm) || 185,
        weightKg: parseInt(form.weightKg) || 85,
        expectedSalaryMin: form.expectedSalaryMin ? parseFloat(form.expectedSalaryMin) : null,
        expectedSalaryMax: form.expectedSalaryMax ? parseFloat(form.expectedSalaryMax) : null,
      }),
    });
    setProfileSaving(false);
    setProfileMsg(res.ok ? "✓ Profile saved!" : "Something went wrong. Please try again.");
    if (res.ok) setTimeout(() => setProfileMsg(""), 3000);
  }

  // ── Career ───────────────────────────────────────────────────────
  const [career, setCareer] = useState<any[]>(player.careerEntries ?? []);
  const [newCareer, setNewCareer] = useState({ clubName: "", country: "", startYear: "", endYear: "", isCurrentClub: false });
  const [careerSaving, setCareerSaving] = useState(false);
  const [careerMsg, setCareerMsg] = useState("");

  async function addCareer(e: React.FormEvent) {
    e.preventDefault();
    if (!newCareer.clubName.trim() || !newCareer.country.trim() || !newCareer.startYear) {
      setCareerMsg("Club name, country and start year are required."); return;
    }
    setCareerSaving(true); setCareerMsg("");
    const res = await fetch("/api/player/career", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentPlayerId,
        clubName: newCareer.clubName,
        country: newCareer.country,
        startDate: `${newCareer.startYear}-01-01`,
        endDate: newCareer.endYear ? `${newCareer.endYear}-07-01` : undefined,
        isCurrentClub: newCareer.isCurrentClub,
      }),
    });
    setCareerSaving(false);
    if (res.ok) {
      const data = await res.json();
      setCareer(c => [data.entry, ...c]);
      setNewCareer({ clubName: "", country: "", startYear: "", endYear: "", isCurrentClub: false });
      setCareerMsg("✓ Entry saved."); setTimeout(() => setCareerMsg(""), 2000);
    } else { setCareerMsg("Failed to save."); }
  }

  async function deleteCareer(id: string) {
    await fetch(`/api/player/career/${id}?agentPlayerId=${agentPlayerId}`, { method: "DELETE" });
    setCareer(c => c.filter(x => x.id !== id));
  }

  // ── Medical ──────────────────────────────────────────────────────
  const [medical, setMedical] = useState<any[]>(player.medicalRecords ?? []);
  const [medType, setMedType] = useState<"INJURY" | "PHYSICAL_TEST">("INJURY");
  const [newMed, setNewMed] = useState({
    testName: "", testResult: "", testUnit: "",
    injuryType: "", bodyPart: "", notes: "", isVisibleToClubs: true,
  });
  const [medSaving, setMedSaving] = useState(false);
  const [medMsg, setMedMsg] = useState("");

  async function addMedical(e: React.FormEvent) {
    e.preventDefault();
    setMedSaving(true); setMedMsg("");
    const res = await fetch("/api/player/medical", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newMed, recordType: medType, agentPlayerId }),
    });
    setMedSaving(false);
    if (res.ok) {
      const data = await res.json();
      setMedical(m => [data.record, ...m]);
      setNewMed({ testName: "", testResult: "", testUnit: "", injuryType: "", bodyPart: "", notes: "", isVisibleToClubs: true });
      setMedMsg("✓ Record saved."); setTimeout(() => setMedMsg(""), 2000);
    } else { setMedMsg("Failed to save."); }
  }

  async function deleteMedical(id: string) {
    await fetch(`/api/player/medical/${id}?agentPlayerId=${agentPlayerId}`, { method: "DELETE" });
    setMedical(m => m.filter(x => x.id !== id));
  }

  // ── Videos ───────────────────────────────────────────────────────
  const [videos, setVideos] = useState<any[]>(player.videos ?? []);
  const [newVideo, setNewVideo] = useState({ title: "", youtubeUrl: "", description: "" });
  const [videoSaving, setVideoSaving] = useState(false);
  const [videoMsg, setVideoMsg] = useState("");

  async function addVideo(e: React.FormEvent) {
    e.preventDefault();
    if (!newVideo.title.trim() || !newVideo.youtubeUrl.trim()) {
      setVideoMsg("Title and YouTube URL are required."); return;
    }
    setVideoSaving(true); setVideoMsg("");
    const res = await fetch("/api/player/videos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newVideo, agentPlayerId }),
    });
    setVideoSaving(false);
    if (res.ok) {
      const data = await res.json();
      setVideos(v => [...v, data.video]);
      setNewVideo({ title: "", youtubeUrl: "", description: "" });
      setVideoMsg("✓ Video added."); setTimeout(() => setVideoMsg(""), 2000);
    } else { setVideoMsg("Failed to save."); }
  }

  async function deleteVideo(id: string) {
    await fetch(`/api/player/videos/${id}?agentPlayerId=${agentPlayerId}`, { method: "DELETE" });
    setVideos(v => v.filter(x => x.id !== id));
  }

  // ── Photo + Gallery ───────────────────────────────────────────────
  const [photoUrl, setPhotoUrl] = useState<string | null>(player.photoUrl ?? null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoMsg, setPhotoMsg] = useState("");
  const [cropFile, setCropFile] = useState<File | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const [gallery, setGallery] = useState<any[]>(player.galleryImages ?? []);
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
    fd.append("agentPlayerId", agentPlayerId);
    const res = await fetch("/api/player/upload-photo", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) {
      setPhotoUrl(data.photoUrl);
      await fetch("/api/player/photo-position", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x: posX, y: posY, agentPlayerId }),
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
    fd.append("agentPlayerId", agentPlayerId);
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
    await fetch(`/api/player/gallery/${id}?agentPlayerId=${agentPlayerId}`, { method: "DELETE" });
    setGallery(g => g.filter(x => x.id !== id));
  }

  // ── Health & Notes ───────────────────────────────────────────────
  const [healthStatus, setHealthStatus] = useState<string>(player.healthStatus ?? "HEALTHY");
  const [rehabNote, setRehabNote] = useState<string>(player.rehabNote ?? "");
  const [rehabReturnDate, setRehabReturnDate] = useState<string>(
    player.rehabReturnDate ? new Date(player.rehabReturnDate).toISOString().slice(0, 10) : ""
  );
  const [healthSaving, setHealthSaving] = useState(false);
  const [healthMsg, setHealthMsg] = useState("");

  const [notes, setNotes] = useState<any[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [newNote, setNewNote] = useState({ content: "", category: "general" });
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteMsg, setNoteMsg] = useState("");

  async function loadNotes() {
    if (notesLoaded) return;
    setNotesLoading(true);
    const res = await fetch(`/api/agent/notes?playerId=${agentPlayerId}`);
    if (res.ok) {
      const data = await res.json();
      setNotes(data.notes);
    }
    setNotesLoading(false);
    setNotesLoaded(true);
  }

  async function saveHealth(e: React.FormEvent) {
    e.preventDefault();
    setHealthSaving(true); setHealthMsg("");
    const res = await fetch(`/api/agent/health/${agentPlayerId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ healthStatus, rehabNote, rehabReturnDate: rehabReturnDate || null }),
    });
    setHealthSaving(false);
    setHealthMsg(res.ok ? "✓ Health status saved!" : "Failed to save.");
    if (res.ok) setTimeout(() => setHealthMsg(""), 3000);
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNote.content.trim()) { setNoteMsg("Note content required."); return; }
    setNoteSaving(true); setNoteMsg("");
    const res = await fetch("/api/agent/notes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: agentPlayerId, content: newNote.content.trim(), category: newNote.category }),
    });
    setNoteSaving(false);
    if (res.ok) {
      const data = await res.json();
      setNotes(ns => [data.note, ...ns]);
      setNewNote({ content: "", category: "general" });
      setNoteMsg("✓ Note added."); setTimeout(() => setNoteMsg(""), 2000);
    } else { setNoteMsg("Failed to save note."); }
  }

  async function deleteNote(id: string) {
    await fetch(`/api/agent/notes/${id}`, { method: "DELETE" });
    setNotes(ns => ns.filter(n => n.id !== id));
  }

  const THIS_YEAR = new Date().getFullYear();

  function Msg({ text }: { text: string }) {
    if (!text) return null;
    const ok = text.startsWith("✓");
    return <div style={{ fontSize: "0.82rem", marginBottom: 8, color: ok ? "#00c864" : "var(--red)" }}>{text}</div>;
  }

  return (
    <div className="sidebar-layout" style={{ minHeight: "100vh" }}>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Crop modal */}
      {cropFile && (
        <PhotoCropModal
          file={cropFile}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropFile(null)}
        />
      )}

      <aside className={`sidebar${sidebarOpen ? " is-open" : ""}`}>
        <div style={{ padding: "0 24px 16px", borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
          <Link href="/dashboard/agent" style={{ fontSize: "0.78rem", color: "var(--muted)", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
            ← Back to Dashboard
          </Link>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", textTransform: "uppercase", marginTop: 12 }}>
            {player.firstName} {player.lastName}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 4 }}>Edit Player Profile</div>
        </div>
        <ul className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <li key={item.id}>
              <a href="#" className={tab === item.id ? "active" : ""} onClick={e => { e.preventDefault(); setTab(item.id); setSidebarOpen(false); if (item.id === "health") loadNotes(); }}>
                <span>{item.icon}</span> {item.label}
              </a>
            </li>
          ))}
        </ul>
        {player.slug && (
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", marginTop: "auto" }}>
            <Link href={`/players/${player.slug}`} target="_blank" className="btn btn-outline" style={{ width: "100%", justifyContent: "center", fontSize: "0.8rem" }}>
              View Public Profile ↗
            </Link>
          </div>
        )}
      </aside>

      <div className="main-content">
        <button className="sidebar-toggle" onClick={() => setSidebarOpen(o => !o)}>
          {sidebarOpen ? "✕ Close" : `☰ ${NAV_ITEMS.find(n => n.id === tab)?.label ?? "Menu"}`}
        </button>

        {/* ── Profile Tab ── */}
        {tab === "profile" && (
          <div className="tab-content">
            <div style={{ marginBottom: 24 }}>
              <div className="section-label">Player Profile</div>
              <h2 style={{ margin: 0 }}>{player.firstName} {player.lastName}</h2>
            </div>
            <div className="card" style={{ maxWidth: 680 }}>
              <form onSubmit={saveProfile}>
                {/* Name */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="label">First Name</label>
                    <input className="input" value={form.firstName} onChange={e => setF("firstName", e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="label">Last Name</label>
                    <input className="input" value={form.lastName} onChange={e => setF("lastName", e.target.value)} />
                  </div>
                </div>

                {/* DOB */}
                <div className="form-group">
                  <label className="label">Date of Birth</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 8 }}>
                    <input className="input" type="number" placeholder="Day" min={1} max={31} value={dobDay} onChange={e => setDobDay(e.target.value)} />
                    <input className="input" type="number" placeholder="Month" min={1} max={12} value={dobMonth} onChange={e => setDobMonth(e.target.value)} />
                    <input className="input" type="number" placeholder="Year" min={1960} max={THIS_YEAR - 14} value={dobYear} onChange={e => setDobYear(e.target.value)} />
                  </div>
                </div>

                {/* Nationality + Position */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="label">Nationality</label>
                    <select className="input" value={form.nationality} onChange={e => setF("nationality", e.target.value)}>
                      <option value="">Select…</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="label">Position</label>
                    <select className="input" value={form.position} onChange={e => setF("position", e.target.value)}>
                      {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Height, Weight, Hand */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="label">Height (cm)</label>
                    <input className="input" type="number" min={150} max={230} value={form.heightCm} onChange={e => setF("heightCm", e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="label">Weight (kg)</label>
                    <input className="input" type="number" min={50} max={150} value={form.weightKg} onChange={e => setF("weightKg", e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="label">Dom. Hand</label>
                    <select className="input" value={form.dominantHand} onChange={e => setF("dominantHand", e.target.value)}>
                      <option value="RIGHT">Right</option>
                      <option value="LEFT">Left</option>
                    </select>
                  </div>
                </div>

                {/* Defensive position */}
                <div className="form-group">
                  <label className="label">Defensive Position</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {DEFENSIVE_POSITIONS.map(dp => (
                      <button key={dp.value} type="button" onClick={() => setF("defensivePosition", form.defensivePosition === dp.value ? "" : dp.value)} style={{
                        padding: "6px 14px", borderRadius: "var(--radius)", fontFamily: "var(--font-display)",
                        fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
                        background: form.defensivePosition === dp.value ? "var(--accent)" : "var(--card2)",
                        color: form.defensivePosition === dp.value ? "var(--black)" : "var(--muted)",
                        border: form.defensivePosition === dp.value ? "none" : "1px solid var(--border)",
                      }}>{dp.label}</button>
                    ))}
                  </div>
                </div>

                {/* Current Club + Salary */}
                <div className="form-group">
                  <label className="label">Current Club</label>
                  <input className="input" value={form.currentClub} onChange={e => setF("currentClub", e.target.value)} placeholder="Free Agent if empty" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="label">Expected Salary Min (€/month)</label>
                    <input className="input" type="number" value={form.expectedSalaryMin} onChange={e => setF("expectedSalaryMin", e.target.value)} placeholder="0" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="label">Expected Salary Max (€/month)</label>
                    <input className="input" type="number" value={form.expectedSalaryMax} onChange={e => setF("expectedSalaryMax", e.target.value)} placeholder="0" />
                  </div>
                </div>

                {/* Availability */}
                <div className="form-group">
                  <label className="label">Availability</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {([true, false] as const).map(v => (
                      <button key={String(v)} type="button" onClick={() => setF("isAvailable", v)} style={{
                        flex: 1, padding: "10px", borderRadius: "var(--radius)", fontFamily: "var(--font-display)",
                        fontWeight: 700, fontSize: "0.82rem", textTransform: "uppercase", cursor: "pointer",
                        background: form.isAvailable === v ? "var(--accent)" : "var(--card2)",
                        color: form.isAvailable === v ? "var(--black)" : "var(--muted)",
                        border: form.isAvailable === v ? "none" : "1px solid var(--border)",
                      }}>{v ? "✓ Available" : "✕ Not Available"}</button>
                    ))}
                  </div>
                </div>

                {/* Phone */}
                <div className="form-group">
                  <label className="label">Phone</label>
                  <input className="input" value={form.phone} onChange={e => setF("phone", e.target.value)} placeholder="+387 61 000 000" />
                </div>

                {/* Bio */}
                <div className="form-group">
                  <label className="label">Bio</label>
                  <textarea className="input" rows={4} value={form.bio} onChange={e => setF("bio", e.target.value)} style={{ resize: "vertical" }} placeholder="Player description, strengths, playing style…" />
                </div>

                {/* Achievements */}
                <div className="form-group">
                  <label className="label">Achievements</label>
                  <textarea className="input" rows={3} value={form.achievements} onChange={e => setF("achievements", e.target.value)} style={{ resize: "vertical" }} placeholder="Championship titles, international caps, MVP awards…" />
                </div>

                <Msg text={profileMsg} />
                <button type="submit" className="btn btn-primary" style={{ justifyContent: "center", width: "100%" }} disabled={profileSaving}>
                  {profileSaving ? <><span className="spinner" /> Saving…</> : "Save Profile"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── Career Tab ── */}
        {tab === "career" && (
          <div className="tab-content">
            <div style={{ marginBottom: 24 }}>
              <div className="section-label">Career History</div>
              <h2 style={{ margin: 0 }}>Club Career</h2>
            </div>

            {/* Add entry form */}
            <div className="card" style={{ maxWidth: 680, marginBottom: 24 }}>
              <h4 style={{ textTransform: "uppercase", marginBottom: 16 }}>Add Career Entry</h4>
              <form onSubmit={addCareer}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="label">Club Name <span style={{ color: "var(--accent)" }}>*</span></label>
                    <input className="input" value={newCareer.clubName} onChange={e => setNewCareer(c => ({ ...c, clubName: e.target.value }))} placeholder="RK Zagreb" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="label">Country <span style={{ color: "var(--accent)" }}>*</span></label>
                    <select className="input" value={newCareer.country} onChange={e => setNewCareer(c => ({ ...c, country: e.target.value }))}>
                      <option value="">Select…</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="label">Start Year <span style={{ color: "var(--accent)" }}>*</span></label>
                    <input className="input" type="number" min={1990} max={THIS_YEAR} value={newCareer.startYear} onChange={e => setNewCareer(c => ({ ...c, startYear: e.target.value }))} placeholder="2020" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="label">End Year <span style={{ color: "var(--muted)", fontWeight: 400 }}>(leave empty if current)</span></label>
                    <input className="input" type="number" min={1990} max={THIS_YEAR + 5} value={newCareer.endYear} onChange={e => setNewCareer(c => ({ ...c, endYear: e.target.value }))} placeholder="2023" />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" checked={newCareer.isCurrentClub} onChange={e => setNewCareer(c => ({ ...c, isCurrentClub: e.target.checked }))} />
                    <span style={{ fontSize: "0.85rem" }}>This is the current club</span>
                  </label>
                </div>
                <Msg text={careerMsg} />
                <button type="submit" className="btn btn-primary" disabled={careerSaving} style={{ justifyContent: "center" }}>
                  {careerSaving ? <><span className="spinner" /> Saving…</> : "+ Add Entry"}
                </button>
              </form>
            </div>

            {/* Career list */}
            {career.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "40px 24px", color: "var(--muted)" }}>No career entries yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 680 }}>
                {career.map((e: any) => (
                  <div key={e.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase" }}>{e.clubName}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                        {e.country} · {new Date(e.startDate).getFullYear()}–{e.endDate ? new Date(e.endDate).getFullYear() : "Present"}
                        {e.isCurrentClub && <span className="badge badge-green" style={{ marginLeft: 8, fontSize: "0.65rem" }}>Current</span>}
                      </div>
                    </div>
                    <button onClick={() => deleteCareer(e.id)} className="btn btn-danger" style={{ fontSize: "0.75rem", padding: "6px 10px" }}>🗑</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Videos Tab ── */}
        {tab === "videos" && (
          <div className="tab-content">
            <div style={{ marginBottom: 24 }}>
              <div className="section-label">Video Vault</div>
              <h2 style={{ margin: 0 }}>Highlight Videos</h2>
            </div>

            <div className="card" style={{ maxWidth: 680, marginBottom: 24 }}>
              <h4 style={{ textTransform: "uppercase", marginBottom: 16 }}>Add Video</h4>
              <form onSubmit={addVideo}>
                <div className="form-group">
                  <label className="label">Video Title <span style={{ color: "var(--accent)" }}>*</span></label>
                  <input className="input" value={newVideo.title} onChange={e => setNewVideo(v => ({ ...v, title: e.target.value }))} placeholder="Highlights vs THW Kiel 2024" />
                </div>
                <div className="form-group">
                  <label className="label">YouTube URL <span style={{ color: "var(--accent)" }}>*</span></label>
                  <input className="input" value={newVideo.youtubeUrl} onChange={e => setNewVideo(v => ({ ...v, youtubeUrl: e.target.value }))} placeholder="https://youtube.com/watch?v=..." />
                </div>
                <div className="form-group">
                  <label className="label">Description <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional)</span></label>
                  <input className="input" value={newVideo.description} onChange={e => setNewVideo(v => ({ ...v, description: e.target.value }))} placeholder="EHF Champions League Quarter Final…" />
                </div>
                <Msg text={videoMsg} />
                <button type="submit" className="btn btn-primary" disabled={videoSaving} style={{ justifyContent: "center" }}>
                  {videoSaving ? <><span className="spinner" /> Saving…</> : "+ Add Video"}
                </button>
              </form>
            </div>

            {videos.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "40px 24px", color: "var(--muted)" }}>No videos yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 680 }}>
                {videos.map((v: any) => (
                  <div key={v.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase" }}>▶ {v.title}</div>
                      {v.description && <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{v.description}</div>}
                    </div>
                    <button onClick={() => deleteVideo(v.id)} className="btn btn-danger" style={{ fontSize: "0.75rem", padding: "6px 10px" }}>🗑</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Medical Tab ── */}
        {tab === "medical" && (
          <div className="tab-content">
            <div style={{ marginBottom: 24 }}>
              <div className="section-label">Medical Records</div>
              <h2 style={{ margin: 0 }}>Health & Fitness</h2>
            </div>

            <div className="card" style={{ maxWidth: 680, marginBottom: 24 }}>
              <h4 style={{ textTransform: "uppercase", marginBottom: 16 }}>Add Record</h4>

              {/* Type toggle */}
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {(["INJURY", "PHYSICAL_TEST"] as const).map(t => (
                  <button key={t} type="button" onClick={() => setMedType(t)} style={{
                    flex: 1, padding: "8px", borderRadius: "var(--radius)", cursor: "pointer",
                    background: medType === t ? "var(--accent)" : "var(--card2)",
                    color: medType === t ? "var(--black)" : "var(--muted)",
                    border: medType === t ? "none" : "1px solid var(--border)",
                    fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase",
                  }}>{t === "INJURY" ? "Injury" : "Physical Test"}</button>
                ))}
              </div>

              <form onSubmit={addMedical}>
                {medType === "PHYSICAL_TEST" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="label">Test Name</label>
                      <input className="input" value={newMed.testName} onChange={e => setNewMed(m => ({ ...m, testName: e.target.value }))} placeholder="VO2 Max" />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="label">Result</label>
                      <input className="input" value={newMed.testResult} onChange={e => setNewMed(m => ({ ...m, testResult: e.target.value }))} placeholder="58" />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="label">Unit</label>
                      <input className="input" value={newMed.testUnit} onChange={e => setNewMed(m => ({ ...m, testUnit: e.target.value }))} placeholder="ml/kg/min" />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="label">Injury Type</label>
                      <input className="input" value={newMed.injuryType} onChange={e => setNewMed(m => ({ ...m, injuryType: e.target.value }))} placeholder="Knee ligament" />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="label">Body Part</label>
                      <input className="input" value={newMed.bodyPart} onChange={e => setNewMed(m => ({ ...m, bodyPart: e.target.value }))} placeholder="Right knee" />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="label">Notes <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional)</span></label>
                  <input className="input" value={newMed.notes} onChange={e => setNewMed(m => ({ ...m, notes: e.target.value }))} placeholder="Additional notes…" />
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" checked={newMed.isVisibleToClubs} onChange={e => setNewMed(m => ({ ...m, isVisibleToClubs: e.target.checked }))} />
                    <span style={{ fontSize: "0.85rem" }}>Visible to clubs</span>
                  </label>
                </div>

                <Msg text={medMsg} />
                <button type="submit" className="btn btn-primary" disabled={medSaving} style={{ justifyContent: "center" }}>
                  {medSaving ? <><span className="spinner" /> Saving…</> : "+ Add Record"}
                </button>
              </form>
            </div>

            {medical.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "40px 24px", color: "var(--muted)" }}>No medical records yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 680 }}>
                {medical.map((r: any) => (
                  <div key={r.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div>
                      <span className={`badge ${r.recordType === "INJURY" ? "badge-red" : "badge-blue"}`} style={{ fontSize: "0.65rem", marginRight: 8 }}>
                        {r.recordType.replace("_", " ")}
                      </span>
                      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.88rem", textTransform: "uppercase" }}>
                        {r.testName ?? r.injuryType ?? "Record"}
                      </span>
                      {r.testResult && <span style={{ color: "var(--accent)", marginLeft: 8, fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>{r.testResult} {r.testUnit}</span>}
                    </div>
                    <button onClick={() => deleteMedical(r.id)} className="btn btn-danger" style={{ fontSize: "0.75rem", padding: "6px 10px" }}>🗑</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Gallery Tab ── */}
        {tab === "gallery" && (
          <div className="tab-content">
            <div style={{ marginBottom: 24 }}>
              <div className="section-label">Photo & Gallery</div>
              <h2 style={{ margin: 0 }}>Player Photos</h2>
            </div>

            {/* Profile photo */}
            <div className="card" style={{ maxWidth: 680, marginBottom: 24 }}>
              <h4 style={{ textTransform: "uppercase", marginBottom: 16 }}>Profile Photo</h4>
              <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                <div style={{ width: 100, height: 100, borderRadius: "50%", flexShrink: 0, border: "3px solid var(--border)", overflow: "hidden", background: "var(--card2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem" }}>
                  {photoUrl
                    ? <img src={photoUrl} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span>👤</span>
                  }
                </div>
                <div>
                  <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handlePhotoSelect} />
                  <button type="button" className="btn btn-primary" onClick={() => photoRef.current?.click()} disabled={photoUploading} style={{ marginBottom: 8 }}>
                    {photoUploading ? <><span className="spinner" /> Uploading…</> : photoUrl ? "Change Photo" : "Upload Photo"}
                  </button>
                  {photoMsg && <div style={{ fontSize: "0.8rem", color: photoMsg.startsWith("✓") ? "#00c864" : "var(--red)" }}>{photoMsg}</div>}
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 4 }}>JPEG, PNG or WebP · max 15 MB · crop after upload</div>
                </div>
              </div>
            </div>

            {/* Gallery */}
            <div className="card" style={{ maxWidth: 680 }}>
              <h4 style={{ textTransform: "uppercase", marginBottom: 16 }}>Photo Gallery <span style={{ color: "var(--muted)", fontWeight: 400, textTransform: "none" }}>({gallery.length}/12)</span></h4>

              <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap" }}>
                <div className="form-group" style={{ flex: 1, minWidth: 160, margin: 0 }}>
                  <label className="label">Caption (optional)</label>
                  <input className="input" value={galleryCaption} onChange={e => setGalleryCaption(e.target.value)} placeholder="Training session, match action…" />
                </div>
                <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleGallerySelect} />
                <button type="button" className="btn btn-primary" onClick={() => galleryRef.current?.click()} disabled={galleryUploading || gallery.length >= 12} style={{ fontSize: "0.85rem" }}>
                  {galleryUploading ? <><span className="spinner" /> Uploading…</> : gallery.length >= 12 ? "Gallery Full" : "+ Add Photo"}
                </button>
              </div>

              {galleryError && <div style={{ fontSize: "0.78rem", color: "var(--red)", marginBottom: 8 }}>{galleryError}</div>}

              {gallery.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8 }}>
                  {gallery.map((img: any) => (
                    <div key={img.id} style={{ position: "relative", aspectRatio: "1", borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--border)" }}>
                      <img src={img.url} alt={img.caption ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button onClick={() => deleteGalleryImage(img.id)} style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", cursor: "pointer", fontSize: "0.7rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)", fontSize: "0.85rem" }}>No gallery photos yet.</div>
              )}
            </div>
          </div>
        )}
        {/* ── Health & Notes Tab ── */}
        {tab === "health" && (
          <div className="tab-content">
            <div style={{ marginBottom: 24 }}>
              <div className="section-label">Private (not visible to clubs)</div>
              <h2 style={{ margin: 0 }}>Notes &amp; Health</h2>
            </div>

            {/* Health status */}
            <div className="card" style={{ maxWidth: 680, marginBottom: 24 }}>
              <h4 style={{ textTransform: "uppercase", marginBottom: 20, fontSize: "0.9rem" }}>Health Status</h4>
              <form onSubmit={saveHealth}>
                <div className="form-group">
                  <label className="label">Current Status</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {HEALTH_STATUSES.map(s => (
                      <button key={s} type="button" onClick={() => setHealthStatus(s)} style={{
                        padding: "8px 16px", borderRadius: "var(--radius)", cursor: "pointer",
                        fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.82rem", textTransform: "uppercase",
                        background: healthStatus === s ? HEALTH_COLORS[s] : "var(--card2)",
                        color: healthStatus === s ? (s === "HEALTHY" ? "var(--black)" : s === "REHAB" ? "var(--black)" : "var(--white)") : "var(--muted)",
                        border: healthStatus === s ? "none" : "1px solid var(--border)",
                      }}>{s}</button>
                    ))}
                  </div>
                </div>

                {healthStatus !== "HEALTHY" && (
                  <>
                    <div className="form-group">
                      <label className="label">Expected Return Date</label>
                      <input className="input" type="date" value={rehabReturnDate} onChange={e => setRehabReturnDate(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="label">Rehab / Injury Note</label>
                      <textarea className="input" rows={3} value={rehabNote} onChange={e => setRehabNote(e.target.value)} style={{ resize: "vertical" }} placeholder="Details about the injury, treatment, recovery plan…" />
                    </div>
                  </>
                )}

                <Msg text={healthMsg} />
                <button type="submit" className="btn btn-primary" style={{ justifyContent: "center" }} disabled={healthSaving}>
                  {healthSaving ? <><span className="spinner" /> Saving…</> : "Save Health Status"}
                </button>
              </form>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "0 0 24px" }} />

            {/* Internal notes */}
            <div style={{ maxWidth: 680 }}>
              <h4 style={{ textTransform: "uppercase", marginBottom: 16, fontSize: "0.9rem" }}>Internal Notes</h4>

              <div className="card" style={{ marginBottom: 20 }}>
                <h5 style={{ textTransform: "uppercase", fontSize: "0.8rem", marginBottom: 14, color: "var(--muted)" }}>Add Note</h5>
                <form onSubmit={addNote}>
                  <div className="form-group">
                    <label className="label">Category</label>
                    <select className="input" value={newNote.category} onChange={e => setNewNote(n => ({ ...n, category: e.target.value }))}>
                      {NOTE_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Note <span style={{ color: "var(--accent)" }}>*</span></label>
                    <textarea className="input" rows={4} value={newNote.content} onChange={e => setNewNote(n => ({ ...n, content: e.target.value }))} style={{ resize: "vertical" }} placeholder="Private note about this player…" />
                  </div>
                  <Msg text={noteMsg} />
                  <button type="submit" className="btn btn-primary" disabled={noteSaving} style={{ justifyContent: "center" }}>
                    {noteSaving ? <><span className="spinner" /> Saving…</> : "+ Add Note"}
                  </button>
                </form>
              </div>

              {notesLoading ? (
                <div style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>Loading notes…</div>
              ) : notes.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: "32px 24px", color: "var(--muted)" }}>No notes yet for this player.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {notes.map((n: any) => (
                    <div key={n.id} className="card" style={{ padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", background: "rgba(107,107,107,0.2)", color: "var(--muted)", padding: "2px 6px", borderRadius: 2, textTransform: "uppercase" }}>{n.category}</span>
                          <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{new Date(n.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                        </div>
                        <button onClick={() => deleteNote(n.id)} className="btn btn-danger" style={{ fontSize: "0.68rem", padding: "3px 7px" }}>🗑</button>
                      </div>
                      <p style={{ fontSize: "0.88rem", color: "var(--white)", margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{n.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
