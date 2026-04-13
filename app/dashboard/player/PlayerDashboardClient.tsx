"use client";
// app/dashboard/player/PlayerDashboardClient.tsx
import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import PhotoLightbox from "@/components/PhotoLightbox";

const POSITIONS = ["GOALKEEPER","LEFT_BACK","RIGHT_BACK","LEFT_WING","RIGHT_WING","CENTRE_BACK","PIVOT","CENTRE_FORWARD"];

const NAV_ITEMS = [
  { id: "overview",      label: "Overview",        icon: "⊞" },
  { id: "profile",       label: "Edit Profile",    icon: "👤" },
  { id: "career",        label: "Career History",  icon: "📅" },
  { id: "videos",        label: "Video Vault",     icon: "▶" },
  { id: "medical",       label: "Medical Records", icon: "⚕" },
  { id: "verification",  label: "Verification",    icon: "🔐" },
  { id: "visibility",    label: "Visibility",      icon: "👁" },
  { id: "messages",      label: "Messages",        icon: "💬" },
];

export default function PlayerDashboardClient({ player, revealCount }: { player: any; revealCount: number }) {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("tab") ?? "overview");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Sync tab with URL param on mount
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t) setTab(t);
  }, [searchParams]);

  // ── Verification ──────────────────────────────────────────────
  const [verificationStatus, setVerificationStatus] = useState(player.verificationStatus ?? "UNVERIFIED");
  const [verificationNote] = useState(player.verificationNote ?? "");
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");
  const passportInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  async function submitVerification() {
    if (!passportFile || !selfieFile) { setVerifyMsg("Both passport and selfie are required."); return; }
    setVerifying(true); setVerifyMsg("");
    const fd = new FormData();
    fd.append("passport", passportFile);
    fd.append("selfie", selfieFile);
    const res = await fetch("/api/player/verification", { method: "POST", body: fd });
    const data = await res.json();
    setVerifying(false);
    if (res.ok) {
      setVerificationStatus("PENDING");
      setVerifyMsg("✓ Documents submitted! An admin will review your account shortly.");
      setPassportFile(null); setSelfieFile(null);
    } else {
      setVerifyMsg("✕ " + (data.error ?? "Upload failed."));
    }
  }

  // ── Profile photo ─────────────────────────────────────────────
  const [photoUrl, setPhotoUrl] = useState<string | null>(player.photoUrl ?? null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ── Photo position (drag-to-reposition) ───────────────────────
  const [photoPos, setPhotoPos] = useState({ x: player.photoPositionX ?? 50, y: player.photoPositionY ?? 50 });
  const [isDragging, setIsDragging] = useState(false);
  const dragData = useRef({ startX: 0, startY: 0, startPosX: 50, startPosY: 50 });

  function startDrag(e: React.MouseEvent) {
    if (!photoUrl) return;
    e.preventDefault();
    setIsDragging(true);
    dragData.current = { startX: e.clientX, startY: e.clientY, startPosX: photoPos.x, startPosY: photoPos.y };

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - dragData.current.startX;
      const dy = ev.clientY - dragData.current.startY;
      setPhotoPos({
        x: Math.max(0, Math.min(100, dragData.current.startPosX + dx * 0.4)),
        y: Math.max(0, Math.min(100, dragData.current.startPosY + dy * 0.4)),
      });
    };
    const onUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // ── Gallery ───────────────────────────────────────────────────
  const [gallery, setGallery] = useState<any[]>(player.galleryImages ?? []);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryError, setGalleryError] = useState("");
  const [galleryCaption, setGalleryCaption] = useState("");
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // ── Profile form ──────────────────────────────────────────────
  const [profile, setProfile] = useState({
    firstName: player.firstName, lastName: player.lastName,
    bio: player.bio ?? "", nationality: player.nationality,
    heightCm: player.heightCm, weightKg: player.weightKg,
    position: player.position, dominantHand: player.dominantHand,
    currentClub: player.currentClub ?? "",
    expectedSalary: player.expectedSalary ? Math.round(player.expectedSalary / 100) : "",
    phone: player.phone ?? "", agentName: player.agentName ?? "",
    agentPhone: player.agentPhone ?? "", agentEmail: player.agentEmail ?? "",
    isAvailable: player.isAvailable,
  });

  // ── Other forms ───────────────────────────────────────────────
  const [videos, setVideos] = useState(player.videos ?? []);
  const [newVideo, setNewVideo] = useState({ title: "", youtubeUrl: "", description: "" });
  const [career, setCareer] = useState(player.careerEntries ?? []);
  const [newCareer, setNewCareer] = useState({ clubName: "", country: "", startDate: "", endDate: "", goals: "", assists: "", isCurrentClub: false });
  const [careerMsg, setCareerMsg] = useState("");
  const [medical, setMedical] = useState(player.medicalRecords ?? []);
  const [newMedical, setNewMedical] = useState({
    recordType: "PHYSICAL_TEST",
    testName: "", testResult: "", testUnit: "",
    injuryType: "", bodyPart: "", injuryDate: "", returnDate: "",
    notes: "", isVisibleToClubs: true,
  });

  function setP(k: string, v: any) { setProfile(p => ({ ...p, [k]: v })); }

  // ── Upload profile photo ──────────────────────────────────────
  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    setPhotoError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/player/upload-photo", { method: "POST", body: fd });
    const data = await res.json();
    setPhotoUploading(false);
    if (res.ok) {
      setPhotoUrl(data.photoUrl);
    } else {
      setPhotoError(data.error ?? "Upload failed.");
    }
    // reset input so same file can be selected again
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  // ── Upload gallery image ──────────────────────────────────────
  async function handleGallerySelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setGalleryUploading(true);
    setGalleryError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("caption", galleryCaption);
    const res = await fetch("/api/player/gallery", { method: "POST", body: fd });
    const data = await res.json();
    setGalleryUploading(false);
    if (res.ok) {
      setGallery((g: any[]) => [...g, data.image]);
      setGalleryCaption("");
    } else {
      setGalleryError(data.error ?? "Upload failed.");
    }
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  }

  async function deleteGalleryImage(id: string) {
    await fetch(`/api/player/gallery/${id}`, { method: "DELETE" });
    setGallery((g: any[]) => g.filter((x: any) => x.id !== id));
  }

  // ── Save profile ──────────────────────────────────────────────
  async function saveProfile() {
    setSaving(true); setMsg("");
    const res = await fetch("/api/player/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...profile,
        expectedSalary: profile.expectedSalary ? +profile.expectedSalary * 100 : null,
        photoPositionX: photoPos.x,
        photoPositionY: photoPos.y,
      }),
    });
    setSaving(false);
    setMsg(res.ok ? "✓ Profile saved successfully." : "✕ Failed to save. Try again.");
  }

  async function addVideo() {
    if (!newVideo.title || !newVideo.youtubeUrl) return;
    const res = await fetch("/api/player/videos", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newVideo),
    });
    if (res.ok) {
      const data = await res.json();
      setVideos((v: any[]) => [...v, data.video]);
      setNewVideo({ title: "", youtubeUrl: "", description: "" });
    }
  }

  async function deleteVideo(id: string) {
    await fetch(`/api/player/videos/${id}`, { method: "DELETE" });
    setVideos((v: any[]) => v.filter((x: any) => x.id !== id));
  }

  async function addCareer() {
    if (!newCareer.clubName || !newCareer.country || !newCareer.startDate) {
      setCareerMsg("✕ Club name, country and start date are required.");
      return;
    }
    setCareerMsg("");
    const res = await fetch("/api/player/career", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newCareer),
    });
    if (res.ok) {
      const data = await res.json();
      setCareer((c: any[]) => [data.entry, ...c]);
      setNewCareer({ clubName: "", country: "", startDate: "", endDate: "", goals: "", assists: "", isCurrentClub: false });
      setCareerMsg("✓ Career entry saved.");
      setTimeout(() => setCareerMsg(""), 3000);
    } else {
      const d = await res.json().catch(() => ({}));
      setCareerMsg("✕ " + (d.error ?? "Failed to save. Try again."));
    }
  }

  async function addMedical() {
    const res = await fetch("/api/player/medical", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newMedical),
    });
    if (res.ok) {
      const data = await res.json();
      setMedical((m: any[]) => [data.record, ...m]);
      setNewMedical({ recordType: "PHYSICAL_TEST", testName: "", testResult: "", testUnit: "", injuryType: "", bodyPart: "", injuryDate: "", returnDate: "", notes: "", isVisibleToClubs: true });
    }
  }

  const verifBadge = verificationStatus === "VERIFIED" ? "✓" : verificationStatus === "PENDING" ? "⏳" : verificationStatus === "REJECTED" ? "✕" : "!";

  return (
    <main className="page">
      <div className="sidebar-layout">
        {/* ── Sidebar ──────────────────────────────────────────── */}
        <aside className="sidebar">
          <div style={{ padding: "0 24px 20px", borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--card2)", border: "2px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", marginBottom: 12, overflow: "hidden" }}>
              {photoUrl ? <img src={photoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : "🏐"}
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", textTransform: "uppercase" }}>{player.firstName} {player.lastName}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: 4 }}>{player.position.replace(/_/g, " ")}</div>
            <div style={{ marginTop: 8 }}>
              {profile.isAvailable ? <span className="badge badge-green">● Available</span> : <span className="badge badge-muted">● Unavailable</span>}
            </div>
          </div>
          <div className="sidebar-section">My Profile</div>
          <ul className="sidebar-nav">
            {NAV_ITEMS.map(item => (
              <li key={item.id}>
                <a
                  href="#"
                  className={tab === item.id ? "active" : ""}
                  onClick={e => { e.preventDefault(); setTab(item.id); }}
                >
                  <span>{item.icon}</span> {item.label}
                  {item.id === "verification" && <span style={{ marginLeft: "auto", fontSize: "0.8rem" }}>{verifBadge}</span>}
                </a>
              </li>
            ))}
          </ul>
          <div style={{ padding: "20px 24px", borderTop: "1px solid var(--border)", marginTop: "auto" }}>
            <Link href={`/players/${player.slug}`} style={{ fontSize: "0.8rem", color: "var(--muted)", textDecoration: "none" }}>
              Preview Public Profile →
            </Link>
          </div>
        </aside>

        {/* ── Main Content ─────────────────────────────────────── */}
        <div className="main-content">
          <div>
            <div style={{ marginBottom: 32 }}>
              <div className="section-label">Player Dashboard</div>
              <h2>{player.firstName} {player.lastName}</h2>
            </div>

            {/* ── Overview ──────────────────────────────────────────── */}
            {tab === "overview" && (
              <div>
                <div className="grid-3" style={{ marginBottom: 32 }}>
                  {[
                    { label: "Clubs Viewed Profile", val: revealCount, accent: true },
                    { label: "Videos", val: videos.length, accent: false },
                    { label: "Career Clubs", val: career.length, accent: false },
                  ].map(s => (
                    <div key={s.label} className="card" style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "3rem", color: s.accent ? "var(--accent)" : "var(--white)", lineHeight: 1 }}>{s.val}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div className="card">
                    <div className="section-label" style={{ marginBottom: 12 }}>Profile Completeness</div>
                    {[
                      { label: "Identity verified", done: verificationStatus === "VERIFIED", warn: verificationStatus === "PENDING" },
                      { label: "Bio", done: !!player.bio },
                      { label: "Profile photo", done: !!photoUrl },
                      { label: "Gallery images", done: gallery.length > 0 },
                      { label: "Career history", done: career.length > 0 },
                      { label: "Videos added", done: videos.length > 0 },
                      { label: "Contact info", done: !!player.phone || !!player.agentEmail },
                      { label: "Salary expectation", done: !!player.expectedSalary },
                    ].map(item => (
                      <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                        <span style={{ fontSize: "0.85rem", color: item.done ? "var(--white)" : "var(--muted)" }}>{item.label}</span>
                        <span style={{ color: item.done ? "#00c864" : (item as any).warn ? "var(--accent)" : "var(--muted)" }}>
                          {item.done ? "✓" : (item as any).warn ? "⏳" : "○"}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="card">
                    <div className="section-label" style={{ marginBottom: 12 }}>Quick Actions</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <button className="btn btn-primary" onClick={() => setTab("profile")} style={{ justifyContent: "center" }}>Edit Profile Info</button>
                      <button className="btn btn-outline" onClick={() => setTab("videos")} style={{ justifyContent: "center" }}>Add Videos</button>
                      <button className="btn btn-outline" onClick={() => setTab("career")} style={{ justifyContent: "center" }}>Add Career Entry</button>
                      <Link href={`/players/${player.slug}`} className="btn btn-ghost" style={{ justifyContent: "center", textAlign: "center" }}>Preview Public Profile →</Link>
                    </div>
                  </div>
                </div>

                {/* ── Photo Gallery preview ─────────────────────── */}
                {(photoUrl || gallery.length > 0) && (
                  <div style={{ marginTop: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <div className="section-label" style={{ marginBottom: 0 }}>Photos</div>
                      <button onClick={() => setTab("profile")} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: "0.8rem", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Manage →
                      </button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                      {photoUrl && (
                        <div style={{ position: "relative", borderRadius: "var(--radius)", overflow: "hidden", aspectRatio: "1", border: "2px solid var(--accent)" }}>
                          <img src={photoUrl} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${photoPos.x}% ${photoPos.y}%` }} />
                          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.6)", padding: "4px 8px", fontSize: "0.65rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Profile</div>
                        </div>
                      )}
                      {gallery.map((img: any) => (
                        <div key={img.id} style={{ borderRadius: "var(--radius)", overflow: "hidden", aspectRatio: "1", border: "1px solid var(--border)" }}>
                          <img src={img.url} alt={img.caption ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Edit Profile ──────────────────────────────────────── */}
            {tab === "profile" && (
              <div style={{ maxWidth: 700 }}>
                {msg && (
                  <div style={{ padding: "12px 16px", borderRadius: "var(--radius)", marginBottom: 20, fontSize: "0.9rem", background: msg.startsWith("✓") ? "rgba(0,200,100,0.1)" : "rgba(255,59,59,0.1)", border: `1px solid ${msg.startsWith("✓") ? "rgba(0,200,100,0.3)" : "rgba(255,59,59,0.3)"}`, color: msg.startsWith("✓") ? "#00c864" : "var(--red)" }}>
                    {msg}
                  </div>
                )}

                {/* ── Profile Photo ─────────────────────────────────── */}
                <div className="card" style={{ marginBottom: 20 }}>
                  <h4 style={{ textTransform: "uppercase", marginBottom: 20, fontSize: "0.9rem" }}>Profile Photo</h4>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 28 }}>

                    {/* Avatar preview — drag to reposition + click to lightbox */}
                    <div style={{ flexShrink: 0, textAlign: "center" }}>
                      <div
                        onMouseDown={startDrag}
                        style={{
                          width: 120, height: 120, borderRadius: "50%",
                          background: "var(--card2)", border: `2px solid ${isDragging ? "var(--accent)" : "var(--border)"}`,
                          overflow: "hidden", position: "relative",
                          cursor: photoUrl ? (isDragging ? "grabbing" : "grab") : "default",
                          userSelect: "none",
                          transition: "border-color 0.2s",
                        }}
                      >
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt="Profile"
                            draggable={false}
                            style={{
                              width: "100%", height: "100%",
                              objectFit: "cover",
                              objectPosition: `${photoPos.x}% ${photoPos.y}%`,
                              pointerEvents: "none",
                              transition: isDragging ? "none" : "object-position 0.2s",
                            }}
                          />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.8rem" }}>🏐</div>
                        )}

                        {/* Drag hint overlay */}
                        {photoUrl && !isDragging && (
                          <div style={{
                            position: "absolute", inset: 0, borderRadius: "50%",
                            background: "rgba(0,0,0,0)", display: "flex",
                            alignItems: "center", justifyContent: "center",
                            opacity: 0, transition: "opacity 0.2s",
                          }}
                          className="photo-drag-hint"
                          />
                        )}
                      </div>

                      {/* Lightbox preview button */}
                      {photoUrl && (
                        <PhotoLightbox src={photoUrl} alt="Profile photo" positionX={photoPos.x} positionY={photoPos.y}>
                          <button
                            style={{
                              marginTop: 8, background: "none", border: "none",
                              color: "var(--muted)", fontSize: "0.72rem", cursor: "pointer",
                              textTransform: "uppercase", letterSpacing: "0.06em",
                            }}
                          >
                            🔍 View full
                          </button>
                        </PhotoLightbox>
                      )}

                      {photoUrl && (
                        <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 4 }}>
                          Drag to reposition
                        </div>
                      )}
                    </div>

                    {/* Controls */}
                    <div style={{ flex: 1 }}>
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        style={{ display: "none" }}
                        onChange={handlePhotoSelect}
                      />
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => photoInputRef.current?.click()}
                          disabled={photoUploading}
                        >
                          {photoUploading
                            ? <><span className="spinner" /> Uploading…</>
                            : photoUrl ? "Change Photo" : "Upload Photo"
                          }
                        </button>
                        {photoUrl && (
                          <button
                            className="btn btn-ghost"
                            style={{ color: "var(--muted)" }}
                            onClick={() => { setPhotoUrl(null); setPhotoPos({ x: 50, y: 50 }); }}
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.6 }}>
                        JPEG, PNG or WebP · max 5 MB<br />
                        {photoUrl && "Drag the photo in the circle to reposition it, then click Save Profile."}
                      </div>
                      {photoError && (
                        <div style={{ fontSize: "0.8rem", color: "var(--red)", marginTop: 8 }}>{photoError}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Gallery ───────────────────────────────────────── */}
                <div className="card" style={{ marginBottom: 20 }}>
                  <h4 style={{ textTransform: "uppercase", marginBottom: 4, fontSize: "0.9rem" }}>Photo Gallery</h4>
                  <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 20 }}>
                    Add up to 12 action photos, training shots or event pictures. Shown on your public profile.
                  </p>

                  {/* Upload control */}
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap" }}>
                    <div className="form-group" style={{ flex: 1, minWidth: 180, margin: 0 }}>
                      <label className="label">Caption (optional)</label>
                      <input
                        className="input"
                        value={galleryCaption}
                        onChange={e => setGalleryCaption(e.target.value)}
                        placeholder="Training session, Jan 2026…"
                      />
                    </div>
                    <div>
                      <input
                        ref={galleryInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        style={{ display: "none" }}
                        onChange={handleGallerySelect}
                      />
                      <button
                        className="btn btn-primary"
                        onClick={() => galleryInputRef.current?.click()}
                        disabled={galleryUploading || gallery.length >= 12}
                      >
                        {galleryUploading
                          ? <><span className="spinner" /> Uploading…</>
                          : gallery.length >= 12 ? "Gallery Full (12/12)" : "＋ Add Photo"
                        }
                      </button>
                    </div>
                  </div>

                  {galleryError && (
                    <div style={{ fontSize: "0.8rem", color: "var(--red)", marginBottom: 12 }}>{galleryError}</div>
                  )}

                  {/* Gallery grid */}
                  {gallery.length === 0 ? (
                    <div style={{
                      border: "2px dashed var(--border)", borderRadius: "var(--radius)",
                      padding: "40px 20px", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem",
                    }}>
                      No gallery photos yet. Add your first action shot above.
                    </div>
                  ) : (
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                      gap: 12,
                    }}>
                      {gallery.map((img: any) => (
                        <div
                          key={img.id}
                          style={{ position: "relative", borderRadius: "var(--radius)", overflow: "hidden", background: "var(--card2)", border: "1px solid var(--border)" }}
                        >
                          <div style={{ paddingBottom: "100%", position: "relative" }}>
                            <img
                              src={img.url}
                              alt={img.caption ?? "Gallery photo"}
                              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          </div>
                          {img.caption && (
                            <div style={{
                              padding: "6px 8px", fontSize: "0.7rem",
                              color: "var(--muted)", whiteSpace: "nowrap",
                              overflow: "hidden", textOverflow: "ellipsis",
                            }}>
                              {img.caption}
                            </div>
                          )}
                          {/* Delete button */}
                          <button
                            onClick={() => deleteGalleryImage(img.id)}
                            style={{
                              position: "absolute", top: 6, right: 6,
                              width: 24, height: 24, borderRadius: "50%",
                              background: "rgba(0,0,0,0.7)", border: "none",
                              color: "#fff", cursor: "pointer",
                              fontSize: "0.75rem", lineHeight: 1,
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                            title="Remove photo"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 12 }}>
                    {gallery.length}/12 photos used · JPEG, PNG or WebP · max 5 MB each
                  </div>
                </div>

                {/* ── Personal Information ───────────────────────────── */}
                <div className="card" style={{ marginBottom: 20 }}>
                  <h4 style={{ textTransform: "uppercase", marginBottom: 20, fontSize: "0.9rem" }}>Personal Information</h4>
                  <div className="grid-2">
                    <div className="form-group"><label className="label">First Name</label><input className="input" value={profile.firstName} onChange={e => setP("firstName", e.target.value)} /></div>
                    <div className="form-group"><label className="label">Last Name</label><input className="input" value={profile.lastName} onChange={e => setP("lastName", e.target.value)} /></div>
                    <div className="form-group"><label className="label">Nationality</label><input className="input" value={profile.nationality} onChange={e => setP("nationality", e.target.value)} /></div>
                    <div className="form-group">
                      <label className="label">Position</label>
                      <select className="input" value={profile.position} onChange={e => setP("position", e.target.value)}>
                        {POSITIONS.map(p => <option key={p} value={p}>{p.replace(/_/g, " ")}</option>)}
                      </select>
                    </div>
                    <div className="form-group"><label className="label">Height (cm)</label><input className="input" type="number" value={profile.heightCm} onChange={e => setP("heightCm", +e.target.value)} /></div>
                    <div className="form-group"><label className="label">Weight (kg)</label><input className="input" type="number" value={profile.weightKg} onChange={e => setP("weightKg", +e.target.value)} /></div>
                    <div className="form-group">
                      <label className="label">Dominant Hand</label>
                      <select className="input" value={profile.dominantHand} onChange={e => setP("dominantHand", e.target.value)}>
                        <option value="RIGHT">Right</option><option value="LEFT">Left</option>
                      </select>
                    </div>
                    <div className="form-group"><label className="label">Current Club</label><input className="input" value={profile.currentClub} onChange={e => setP("currentClub", e.target.value)} placeholder="FC Barcelona or Free Agent" /></div>
                  </div>
                  <div className="form-group">
                    <label className="label">Bio</label>
                    <textarea className="input" rows={4} value={profile.bio} onChange={e => setP("bio", e.target.value)} placeholder="Tell clubs about yourself, your playing style, achievements…" style={{ resize: "vertical", lineHeight: 1.6 }} />
                  </div>
                  <div className="form-group">
                    <label className="label">Expected Annual Salary (€)</label>
                    <input className="input" type="number" value={profile.expectedSalary} onChange={e => setP("expectedSalary", e.target.value)} placeholder="80000" />
                  </div>
                </div>

                <div className="card" style={{ marginBottom: 20 }}>
                  <h4 style={{ textTransform: "uppercase", marginBottom: 4, fontSize: "0.9rem" }}>Contact Details</h4>
                  <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 20 }}>Revealed to clubs only after they accept Terms of Service.</p>
                  <div className="grid-2">
                    <div className="form-group"><label className="label">Your Email</label><input className="input" type="email" value={player.user?.email ?? ""} disabled style={{ opacity: 0.6 }} /></div>
                    <div className="form-group"><label className="label">Direct Phone</label><input className="input" value={profile.phone} onChange={e => setP("phone", e.target.value)} placeholder="+385 91 234 5678" /></div>
                  </div>
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 4 }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 14 }}>
                      Agent contact <span style={{ fontStyle: "italic" }}>(optional — fill only if you have an agent)</span>
                    </div>
                    <div className="grid-2">
                      <div className="form-group"><label className="label">Agent Name</label><input className="input" value={profile.agentName} onChange={e => setP("agentName", e.target.value)} placeholder="John Smith" /></div>
                      <div className="form-group"><label className="label">Agent Phone</label><input className="input" value={profile.agentPhone} onChange={e => setP("agentPhone", e.target.value)} placeholder="+44 7700 900000" /></div>
                      <div className="form-group"><label className="label">Agent Email</label><input className="input" type="email" value={profile.agentEmail} onChange={e => setP("agentEmail", e.target.value)} placeholder="agent@sports.com" /></div>
                    </div>
                  </div>
                </div>

                <button className="btn btn-primary" onClick={saveProfile} disabled={saving} style={{ minWidth: 160, justifyContent: "center" }}>
                  {saving ? <><span className="spinner" /> Saving…</> : "Save Profile"}
                </button>
              </div>
            )}

            {/* ── Career ────────────────────────────────────────────── */}
            {tab === "career" && (
              <div>
                <div className="card" style={{ marginBottom: 24 }}>
                  <h4 style={{ textTransform: "uppercase", marginBottom: 16, fontSize: "0.9rem" }}>Add Career Entry</h4>
                  {careerMsg && (
                    <div style={{ padding: "10px 14px", borderRadius: 6, marginBottom: 16, fontSize: "0.85rem",
                      background: careerMsg.startsWith("✓") ? "rgba(0,200,100,0.1)" : "rgba(255,59,59,0.1)",
                      border: `1px solid ${careerMsg.startsWith("✓") ? "rgba(0,200,100,0.3)" : "rgba(255,59,59,0.3)"}`,
                      color: careerMsg.startsWith("✓") ? "#00c864" : "var(--red)" }}>
                      {careerMsg}
                    </div>
                  )}
                  <div className="grid-2">
                    <div className="form-group"><label className="label">Club Name *</label><input className="input" value={newCareer.clubName} onChange={e => setNewCareer(c => ({ ...c, clubName: e.target.value }))} placeholder="RK Zagreb" /></div>
                    <div className="form-group"><label className="label">Country *</label><input className="input" value={newCareer.country} onChange={e => setNewCareer(c => ({ ...c, country: e.target.value }))} placeholder="Croatia" /></div>
                    <div className="form-group"><label className="label">Start Date *</label><input className="input" type="date" value={newCareer.startDate} onChange={e => setNewCareer(c => ({ ...c, startDate: e.target.value }))} /></div>
                    <div className="form-group"><label className="label">End Date <span style={{ fontWeight: 400, color: "var(--muted)" }}>(blank if current)</span></label><input className="input" type="date" value={newCareer.endDate} onChange={e => setNewCareer(c => ({ ...c, endDate: e.target.value }))} /></div>
                    <div className="form-group"><label className="label">Goals</label><input className="input" type="number" min="0" value={newCareer.goals} onChange={e => setNewCareer(c => ({ ...c, goals: e.target.value }))} /></div>
                    <div className="form-group"><label className="label">Assists</label><input className="input" type="number" min="0" value={newCareer.assists} onChange={e => setNewCareer(c => ({ ...c, assists: e.target.value }))} /></div>
                    <div className="form-group" style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 24 }}>
                      <input type="checkbox" id="isCurrent" checked={newCareer.isCurrentClub} onChange={e => setNewCareer(c => ({ ...c, isCurrentClub: e.target.checked }))} style={{ accentColor: "var(--accent)", width: 16, height: 16 }} />
                      <label htmlFor="isCurrent" className="label" style={{ margin: 0 }}>Current Club</label>
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={addCareer} style={{ minWidth: 140, justifyContent: "center" }}>Save Entry</button>
                </div>

                {career.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>No career entries yet.</div>
                ) : (
                  <div className="timeline">
                    {career.map((entry: any) => (
                      <div key={entry.id} className={`timeline-item${entry.isCurrentClub ? " current" : ""}`}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                          <div>
                            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", textTransform: "uppercase" }}>
                              {entry.clubName}
                              {entry.isCurrentClub && <span className="badge badge-green" style={{ marginLeft: 8 }}>Current</span>}
                            </div>
                            <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{entry.country} · {new Date(entry.startDate).getFullYear()} — {entry.endDate ? new Date(entry.endDate).getFullYear() : "Present"}</div>
                            {(entry.appearances || entry.goals) && (
                              <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                                {entry.appearances != null && <span style={{ fontSize: "0.8rem" }}><strong style={{ color: "var(--accent)" }}>{entry.appearances}</strong> <span style={{ color: "var(--muted)" }}>apps</span></span>}
                                {entry.goals != null && <span style={{ fontSize: "0.8rem" }}><strong style={{ color: "var(--accent)" }}>{entry.goals}</strong> <span style={{ color: "var(--muted)" }}>goals</span></span>}
                                {entry.assists != null && <span style={{ fontSize: "0.8rem" }}><strong style={{ color: "var(--accent)" }}>{entry.assists}</strong> <span style={{ color: "var(--muted)" }}>assists</span></span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Videos ────────────────────────────────────────────── */}
            {tab === "videos" && (
              <div>
                <div className="card" style={{ marginBottom: 24 }}>
                  <h4 style={{ textTransform: "uppercase", marginBottom: 16, fontSize: "0.9rem" }}>Add YouTube Video</h4>
                  <div className="form-group"><label className="label">Video Title</label><input className="input" value={newVideo.title} onChange={e => setNewVideo(v => ({ ...v, title: e.target.value }))} placeholder="Highlights vs THW Kiel 2024" /></div>
                  <div className="form-group"><label className="label">YouTube URL</label><input className="input" value={newVideo.youtubeUrl} onChange={e => setNewVideo(v => ({ ...v, youtubeUrl: e.target.value }))} placeholder="https://youtube.com/watch?v=..." /></div>
                  <div className="form-group"><label className="label">Description (optional)</label><input className="input" value={newVideo.description} onChange={e => setNewVideo(v => ({ ...v, description: e.target.value }))} placeholder="EHF Champions League Quarter Final…" /></div>
                  <button className="btn btn-primary" onClick={addVideo}>Add Video</button>
                </div>

                {videos.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>No videos yet.</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 20 }}>
                    {videos.map((v: any) => {
                      const ytId = v.youtubeUrl?.match(/(?:youtu\.be\/|v=)([^&?]+)/)?.[1];
                      return (
                        <div key={v.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                          {ytId && (
                            <div style={{ position: "relative", paddingBottom: "56.25%" }}>
                              <iframe src={`https://www.youtube.com/embed/${ytId}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }} allowFullScreen title={v.title} />
                            </div>
                          )}
                          <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase", fontSize: "0.9rem" }}>{v.title}</div>
                              {v.description && <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>{v.description}</div>}
                            </div>
                            <button onClick={() => deleteVideo(v.id)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "1rem", padding: "4px 8px" }}>✕</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Medical ───────────────────────────────────────────── */}
            {tab === "medical" && (
              <div>
                <div className="card" style={{ marginBottom: 24 }}>
                  <h4 style={{ textTransform: "uppercase", marginBottom: 16, fontSize: "0.9rem" }}>Add Medical Record</h4>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="label">Record Type</label>
                      <select className="input" value={newMedical.recordType} onChange={e => setNewMedical(m => ({ ...m, recordType: e.target.value }))}>
                        <option value="PHYSICAL_TEST">Physical Test</option>
                        <option value="INJURY">Injury</option>
                        <option value="CLEARANCE">Medical Clearance</option>
                      </select>
                    </div>
                    {newMedical.recordType === "PHYSICAL_TEST" ? (
                      <>
                        <div className="form-group"><label className="label">Test Name</label><input className="input" value={newMedical.testName} onChange={e => setNewMedical(m => ({ ...m, testName: e.target.value }))} placeholder="Yo-Yo Test Level 2" /></div>
                        <div className="form-group"><label className="label">Result</label><input className="input" value={newMedical.testResult} onChange={e => setNewMedical(m => ({ ...m, testResult: e.target.value }))} placeholder="18.5" /></div>
                        <div className="form-group"><label className="label">Unit</label><input className="input" value={newMedical.testUnit} onChange={e => setNewMedical(m => ({ ...m, testUnit: e.target.value }))} placeholder="ml/kg/min" /></div>
                      </>
                    ) : newMedical.recordType === "INJURY" ? (
                      <>
                        <div className="form-group"><label className="label">Injury Type</label><input className="input" value={newMedical.injuryType} onChange={e => setNewMedical(m => ({ ...m, injuryType: e.target.value }))} placeholder="ACL tear, muscle strain…" /></div>
                        <div className="form-group"><label className="label">Body Part</label><input className="input" value={newMedical.bodyPart} onChange={e => setNewMedical(m => ({ ...m, bodyPart: e.target.value }))} placeholder="Right knee, left shoulder…" /></div>
                        <div className="form-group"><label className="label">Injury Date</label><input className="input" type="date" value={newMedical.injuryDate} onChange={e => setNewMedical(m => ({ ...m, injuryDate: e.target.value }))} /></div>
                        <div className="form-group"><label className="label">Return to Play Date <span style={{ fontWeight: 400, color: "var(--muted)" }}>(if recovered)</span></label><input className="input" type="date" value={newMedical.returnDate} onChange={e => setNewMedical(m => ({ ...m, returnDate: e.target.value }))} /></div>
                      </>
                    ) : (
                      // CLEARANCE
                      <div className="form-group"><label className="label">Clearance Type</label><input className="input" value={newMedical.testName} onChange={e => setNewMedical(m => ({ ...m, testName: e.target.value }))} placeholder="Full medical clearance, return to sport…" /></div>
                    )}
                  </div>
                  <div className="form-group"><label className="label">Notes</label><textarea className="input" rows={3} value={newMedical.notes} onChange={e => setNewMedical(m => ({ ...m, notes: e.target.value }))} placeholder="Additional details…" style={{ resize: "vertical" }} /></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <input type="checkbox" id="visibleToClubs" checked={newMedical.isVisibleToClubs} onChange={e => setNewMedical(m => ({ ...m, isVisibleToClubs: e.target.checked }))} style={{ accentColor: "var(--accent)", width: 16, height: 16 }} />
                    <label htmlFor="visibleToClubs" className="label" style={{ margin: 0 }}>Visible to clubs</label>
                  </div>
                  <button className="btn btn-primary" onClick={addMedical}>Add Record</button>
                </div>

                {medical.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>No medical records yet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {medical.map((r: any) => (
                      <div key={r.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div>
                          <div style={{ marginBottom: 6 }}>
                            <span className={`badge ${r.recordType === "INJURY" ? "badge-red" : r.recordType === "PHYSICAL_TEST" ? "badge-blue" : "badge-green"}`} style={{ marginRight: 8 }}>
                              {r.recordType.replace("_", " ")}
                            </span>
                            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", textTransform: "uppercase" }}>
                              {r.testName ?? r.injuryType ?? "Record"}
                            </span>
                          </div>
                          {r.testResult && <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.4rem", color: "var(--accent)" }}>{r.testResult} <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{r.testUnit}</span></div>}
                          {r.bodyPart && <div style={{ fontSize: "0.82rem", color: "rgba(245,243,238,0.8)", marginTop: 4 }}>Body part: <strong>{r.bodyPart}</strong></div>}
                          {(r.injuryDate || r.returnDate) && (
                            <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
                              {r.injuryDate && <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Injured: {new Date(r.injuryDate).toLocaleDateString()}</span>}
                              {r.returnDate && <span style={{ fontSize: "0.78rem", color: "#00c864" }}>Returned: {new Date(r.returnDate).toLocaleDateString()}</span>}
                            </div>
                          )}
                          {r.notes && <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: 6 }}>{r.notes}</div>}
                        </div>
                        <div>
                          {r.isVisibleToClubs
                            ? <span className="badge badge-green">Visible</span>
                            : <span className="badge badge-muted">Private</span>
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Verification ──────────────────────────────────────── */}
            {tab === "verification" && (
              <div style={{ maxWidth: 600 }}>

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
                        {verificationStatus === "VERIFIED" ? "Account Verified"  :
                         verificationStatus === "PENDING"  ? "Under Review"      :
                         verificationStatus === "REJECTED" ? "Verification Rejected" :
                         "Not Verified"}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: 4 }}>
                        {verificationStatus === "VERIFIED"  && "Your profile is public and visible to clubs."}
                        {verificationStatus === "PENDING"   && "We received your documents. An admin will verify your account within 24–48 hours."}
                        {verificationStatus === "REJECTED"  && "Your verification was rejected. Please resubmit correct documents."}
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

                {/* Why verify? */}
                {verificationStatus !== "VERIFIED" && (
                  <div className="card" style={{ marginBottom: 20 }}>
                    <div className="section-label" style={{ marginBottom: 12 }}>Why verify?</div>
                    {[
                      "Your profile becomes visible in club searches",
                      "Clubs can find and contact you",
                      "Builds trust with professional clubs",
                      "One-time process — takes under 2 minutes",
                    ].map(t => (
                      <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", fontSize: "0.85rem", color: "rgba(245,243,238,0.8)" }}>
                        <span style={{ color: "#00c864", fontSize: "0.9rem" }}>✓</span> {t}
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload form — show if not verified */}
                {verificationStatus !== "VERIFIED" && (
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

                    {/* Passport upload */}
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

                    {/* Selfie upload */}
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

                    {/* Preview thumbnails */}
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

                    <button className="btn btn-primary" onClick={submitVerification} disabled={verifying || !passportFile || !selfieFile} style={{ minWidth: 180, justifyContent: "center" }}>
                      {verifying ? <><span className="spinner" /> Uploading…</> : "Submit for Verification"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Visibility ────────────────────────────────────────── */}
            {tab === "visibility" && (
              <div style={{ maxWidth: 500 }}>
                <div className="card">
                  <h4 style={{ textTransform: "uppercase", marginBottom: 20 }}>Availability Status</h4>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid var(--border)" }}>
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>Available for Transfer</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Clubs can find and contact you</div>
                    </div>
                    <div
                      onClick={async () => {
                        const next = !profile.isAvailable;
                        setP("isAvailable", next);
                        await fetch("/api/player/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...profile, isAvailable: next }) });
                      }}
                      style={{
                        width: 48, height: 26, borderRadius: 13, cursor: "pointer",
                        background: profile.isAvailable ? "var(--accent)" : "var(--border)",
                        position: "relative", transition: "background 0.2s",
                      }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: "50%", background: profile.isAvailable ? "var(--black)" : "var(--muted)",
                        position: "absolute", top: 3, left: profile.isAvailable ? 25 : 3, transition: "left 0.2s",
                      }} />
                    </div>
                  </div>
                  <div style={{ paddingTop: 20, fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.7 }}>
                    Your public profile is always visible at{" "}
                    <Link href={`/players/${player.slug}`} style={{ color: "var(--accent)" }}>
                      /players/{player.slug}
                    </Link>
                    . Contact details are only shown to clubs after they accept our Terms of Service.
                  </div>
                </div>
              </div>
            )}

            {/* ── Messages ──────────────────────────────────────────── */}
            {tab === "messages" && (
              <div style={{ maxWidth: 600 }}>
                <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
                  <div style={{ fontSize: "3rem", marginBottom: 16 }}>💬</div>
                  <h4 style={{ textTransform: "uppercase", marginBottom: 12, fontSize: "0.9rem" }}>Messages</h4>
                  <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 24 }}>
                    View and reply to messages from clubs in your inbox.
                  </p>
                  <Link href="/messages" className="btn btn-primary" style={{ justifyContent: "center" }}>
                    Go to Messages Inbox →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
