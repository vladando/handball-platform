"use client";
// app/players/[slug]/PlayerProfileClient.tsx
import { useState, useMemo } from "react";
import RevealContactButton from "@/components/RevealContactButton";
import GalleryLightbox from "@/components/GalleryLightbox";

const POS_LABELS: Record<string, string> = {
  GOALKEEPER: "Goalkeeper", LEFT_BACK: "Left Back", RIGHT_BACK: "Right Back",
  LEFT_WING: "Left Wing", RIGHT_WING: "Right Wing", CENTRE_BACK: "Centre Back",
  PIVOT: "Pivot", CENTRE_FORWARD: "Centre Forward",
};

const DEF_LABELS: Record<string, string> = {
  POS_1: "1", POS_2: "2", POS_3: "3", POS_4: "4", POS_5: "5", POS_6: "6", POS_51: "5:1",
};

type Tab = "overview" | "career" | "videos" | "medical" | "photos";

export default function PlayerProfileClient({
  player,
  isClub,
  isVerifiedClub,
  alreadyRevealed,
  initialInteractionId,
  initialContact,
}: {
  player: any;
  isClub: boolean;
  isVerifiedClub: boolean;
  alreadyRevealed: boolean;
  initialInteractionId?: string | null;
  initialContact?: any | null;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const isLocked = isClub && !isVerifiedClub; // unverified club → locked/blurred
  const age = new Date().getFullYear() - new Date(player.dateOfBirth).getFullYear();

  const photoCount = (player.photoUrl ? 1 : 0) + (player.galleryImages?.length ?? 0);

  // Flat list of all photos for lightbox navigation
  const allImages = useMemo(() => {
    const imgs: { url: string; caption?: string | null; label?: string }[] = [];
    if (player.photoUrl) imgs.push({ url: player.photoUrl, label: "Profile Photo" });
    for (const img of player.galleryImages ?? []) {
      imgs.push({ url: img.url, caption: img.caption });
    }
    return imgs;
  }, [player.photoUrl, player.galleryImages]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "career", label: `Career (${player.careerEntries?.length ?? 0})` },
    { id: "videos", label: `Videos (${player.videos?.length ?? 0})` },
    ...(photoCount > 0 ? [{ id: "photos" as Tab, label: `Photos (${photoCount})` }] : []),
    { id: "medical", label: "Medical" },
  ];

  return (
    <div>
      {/* ── Unverified club banner ─────────────────────────────── */}
      {isLocked && (
        <div style={{
          background: "rgba(232,255,71,0.06)", border: "1px solid rgba(232,255,71,0.25)",
          borderRadius: "var(--radius-lg)", padding: "16px 20px", marginBottom: 24,
          display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
        }}>
          <span style={{ fontSize: "1.5rem" }}>🔒</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.9rem", textTransform: "uppercase", color: "var(--accent)", marginBottom: 4 }}>
              Club Verification Required
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
              Your club is pending verification. Full player stats, contact details and medical records are locked until an admin approves your account.
            </div>
          </div>
          <a href="/dashboard/club" className="btn btn-outline" style={{ fontSize: "0.82rem", padding: "8px 16px", flexShrink: 0 }}>
            Go to Dashboard
          </a>
        </div>
      )}

      <div className="tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`tab-btn${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ─────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="profile-layout">
          <div>
            {/* Physical stats */}
            <div className="card" style={{ marginBottom: 24, position: "relative", overflow: "hidden" }}>
              <div className="section-label" style={{ marginBottom: 16 }}>Physical Attributes</div>
              <div className="stats-grid-4" style={{ filter: isLocked ? "blur(6px)" : "none", userSelect: isLocked ? "none" : "auto" }}>
                {[
                  { label: "Age", val: age, unit: "yrs" },
                  { label: "Height", val: player.heightCm, unit: "cm" },
                  { label: "Weight", val: player.weightKg, unit: "kg" },
                  { label: "Hand", val: player.dominantHand === "RIGHT" ? "Right" : "Left", unit: "" },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: "center", padding: "16px 0" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "2rem", color: "var(--accent)", lineHeight: 1 }}>
                      {s.val}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>
                      {s.label}{s.unit ? ` (${s.unit})` : ""}
                    </div>
                  </div>
                ))}
              </div>
              {isLocked && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(9,9,9,0.4)", backdropFilter: "blur(2px)" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "1.5rem", marginBottom: 6 }}>🔒</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Verify your club to unlock</div>
                  </div>
                </div>
              )}
            </div>

            {/* Bio + Achievements */}
            {(player.bio || player.achievements) && (
              <div className="card" style={{ marginBottom: 24 }}>
                <div className="section-label" style={{ marginBottom: 12 }}>About</div>
                {player.bio && <p style={{ color: "rgba(245,243,238,0.8)", lineHeight: 1.8, fontSize: "0.95rem", marginBottom: player.achievements ? 16 : 0 }}>{player.bio}</p>}
                {player.achievements && (
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "var(--accent)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                      &#127942; Trophies &amp; Achievements
                    </div>
                    <p style={{ color: "rgba(245,243,238,0.8)", lineHeight: 1.8, fontSize: "0.9rem" }}>{player.achievements}</p>
                  </div>
                )}
              </div>
            )}

            {/* Career highlights */}
            {player.careerEntries?.length > 0 && (
              <div className="card">
                <div className="section-label" style={{ marginBottom: 16 }}>Career Highlights</div>
                <div className="timeline">
                  {player.careerEntries.slice(0, 3).map((e: any) => (
                    <div key={e.id} className="timeline-item">
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", textTransform: "uppercase" }}>
                        {e.clubName}
                        {e.isCurrentClub && (
                          <span className="badge badge-green" style={{ marginLeft: 8, verticalAlign: "middle" }}>Current</span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: 2 }}>
                        {e.country} · {new Date(e.startDate).getFullYear()} — {e.endDate ? new Date(e.endDate).getFullYear() : "Present"}
                      </div>
                      {(e.goals != null || e.appearances != null) && (
                        <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
                          {e.appearances != null && (
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                              <span style={{ color: "var(--accent)" }}>{e.appearances}</span>
                              <span style={{ color: "var(--muted)" }}> apps</span>
                            </span>
                          )}
                          {e.goals != null && (
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                              <span style={{ color: "var(--accent)" }}>{e.goals}</span>
                              <span style={{ color: "var(--muted)" }}> goals</span>
                            </span>
                          )}
                          {e.assists != null && (
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                              <span style={{ color: "var(--accent)" }}>{e.assists}</span>
                              <span style={{ color: "var(--muted)" }}> assists</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Photos preview in overview */}
            {photoCount > 0 && (
              <div className="card" style={{ marginTop: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div className="section-label" style={{ marginBottom: 0 }}>Photos</div>
                  {photoCount > 4 && (
                    <button
                      onClick={() => setTab("photos")}
                      style={{ background: "none", border: "none", color: "var(--accent)", fontSize: "0.8rem", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.08em" }}
                    >
                      View All ({photoCount}) →
                    </button>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
                  {player.photoUrl && (
                    <div
                      style={{ position: "relative", borderRadius: "var(--radius)", overflow: "hidden", aspectRatio: "1", border: "2px solid var(--accent)", cursor: "zoom-in" }}
                      onClick={() => setLightboxIndex(0)}
                    >
                      <img
                        src={player.photoUrl}
                        alt="Profile"
                        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${player.photoPositionX ?? 50}% ${player.photoPositionY ?? 50}%` }}
                      />
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.6)", padding: "3px 8px", fontSize: "0.62rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Profile
                      </div>
                    </div>
                  )}
                  {player.galleryImages?.slice(0, player.photoUrl ? 3 : 4).map((img: any, i: number) => (
                    <div
                      key={img.id}
                      style={{ borderRadius: "var(--radius)", overflow: "hidden", aspectRatio: "1", border: "1px solid var(--border)", cursor: "zoom-in" }}
                      onClick={() => setLightboxIndex(player.photoUrl ? i + 1 : i)}
                    >
                      <img src={img.url} alt={img.caption ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ))}
                  {photoCount > 4 && (
                    <div
                      onClick={() => setTab("photos")}
                      style={{ borderRadius: "var(--radius)", aspectRatio: "1", border: "1px solid var(--border)", background: "var(--card2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexDirection: "column", gap: 4 }}
                    >
                      <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem", color: "var(--accent)" }}>+{photoCount - 4}</span>
                      <span style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase" }}>more</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: Contact / Reveal */}
          <div style={{ position: "sticky", top: 84, minWidth: 0 }}>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="section-label" style={{ marginBottom: 12 }}>Player Details</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <span style={{ color: "var(--muted)" }}>Attack Position</span>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>{POS_LABELS[player.position]}</span>
                </div>
                {player.defensivePosition && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                    <span style={{ color: "var(--muted)" }}>Defence Position</span>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>
                      {player.defensivePosition.split(",").filter(Boolean).map((v: string) => DEF_LABELS[v] ?? v).join(", ")}
                    </span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <span style={{ color: "var(--muted)" }}>Nationality</span>
                  <span>{player.nationality}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <span style={{ color: "var(--muted)" }}>Current Club</span>
                  <span>{player.currentClub ?? "Free Agent"}</span>
                </div>
                {(player.expectedSalaryMin || player.expectedSalaryMax || player.expectedSalary) && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                    <span style={{ color: "var(--muted)" }}>Expected Salary</span>
                    <span className="badge badge-accent">
                      {player.expectedSalaryMin && player.expectedSalaryMax
                        ? `€${Math.round(player.expectedSalaryMin / 100).toLocaleString()} – €${Math.round(player.expectedSalaryMax / 100).toLocaleString()}/yr`
                        : player.expectedSalaryMin
                        ? `from €${Math.round(player.expectedSalaryMin / 100).toLocaleString()}/yr`
                        : player.expectedSalaryMax
                        ? `up to €${Math.round(player.expectedSalaryMax / 100).toLocaleString()}/yr`
                        : `€${Math.round((player.expectedSalary ?? 0) / 100).toLocaleString()}/yr`}
                    </span>
                  </div>
                )}
                {player.availableFrom && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                    <span style={{ color: "var(--muted)" }}>Available From</span>
                    <span>{new Date(player.availableFrom).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {isClub && isVerifiedClub ? (
              <RevealContactButton
                playerId={player.id}
                playerName={`${player.firstName} ${player.lastName}`}
                initialInteractionId={initialInteractionId}
                initialContact={initialContact}
              />
            ) : isClub && !isVerifiedClub ? (
              <div style={{ background: "rgba(232,255,71,0.05)", border: "1px solid rgba(232,255,71,0.25)", borderRadius: "var(--radius-lg)", padding: "20px" }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.95rem", textTransform: "uppercase", color: "var(--accent)", marginBottom: 10 }}>
                  🔒 Contact Locked
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: 14 }}>
                  Your club must be verified by an admin before you can reveal player contact details.
                </p>
                <a href="/dashboard/club" className="btn btn-outline" style={{ width: "100%", justifyContent: "center", fontSize: "0.85rem" }}>
                  Check Verification Status →
                </a>
              </div>
            ) : (
              <div style={{ background: "rgba(232,255,71,0.05)", border: "1px solid rgba(232,255,71,0.2)", borderRadius: "var(--radius-lg)", padding: "20px" }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.95rem", textTransform: "uppercase", color: "var(--accent)", marginBottom: 10 }}>
                  Contact This Player
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: 14 }}>
                  Register as a verified club to unlock direct contact details.
                </p>
                <a href="/auth/register?role=CLUB" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", fontSize: "0.85rem" }}>
                  Register Club →
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Career ───────────────────────────────────────────────── */}
      {tab === "career" && (
        <div>
          {player.careerEntries?.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
              <div style={{ fontSize: "3rem", marginBottom: 16 }}>📋</div>
              <p>No career history added yet.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="table-wrap"><table className="table">
                <thead>
                  <tr>
                    <th>Club</th>
                    <th>Country</th>
                    <th>Period</th>
                    <th>Apps</th>
                    <th>Goals</th>
                    <th>Assists</th>
                  </tr>
                </thead>
                <tbody>
                  {player.careerEntries?.map((e: any) => (
                    <tr key={e.id}>
                      <td>
                        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase" }}>
                          {e.clubName}
                          {e.isCurrentClub && (
                            <span className="badge badge-green" style={{ marginLeft: 8, verticalAlign: "middle" }}>Current</span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{e.country}</td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
                        {new Date(e.startDate).getFullYear()} – {e.endDate ? new Date(e.endDate).getFullYear() : "Now"}
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>{e.appearances ?? "—"}</td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: e.goals ? "var(--accent)" : "var(--muted)" }}>{e.goals ?? "—"}</td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>{e.assists ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </div>
          )}
        </div>
      )}

      {/* ── Videos ───────────────────────────────────────────────── */}
      {tab === "videos" && (
        <div>
          {player.videos?.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
              <div style={{ fontSize: "3rem", marginBottom: 16 }}>🎬</div>
              <p>No videos uploaded yet.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
              {player.videos?.map((v: any) => {
                const ytId = v.youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1];
                return (
                  <div key={v.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                    {ytId ? (
                      <div style={{ position: "relative", paddingBottom: "56.25%", background: "#000" }}>
                        <iframe
                          src={`https://www.youtube.com/embed/${ytId}`}
                          title={v.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                        />
                      </div>
                    ) : (
                      <div style={{ height: 180, background: "var(--card2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
                        Invalid video URL
                      </div>
                    )}
                    <div style={{ padding: "14px 16px" }}>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem", textTransform: "uppercase", marginBottom: 4 }}>
                        {v.title}
                      </div>
                      {v.description && (
                        <p style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.5 }}>{v.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Photos ───────────────────────────────────────────────── */}
      {tab === "photos" && (
        <div>
          {photoCount === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
              <div style={{ fontSize: "3rem", marginBottom: 16 }}>📷</div>
              <p>No photos uploaded yet.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {player.photoUrl && (
                <div
                  onClick={() => setLightboxIndex(0)}
                  style={{ position: "relative", borderRadius: "var(--radius-lg)", overflow: "hidden", aspectRatio: "1", border: "2px solid var(--accent)", cursor: "zoom-in" }}
                >
                  <img
                    src={player.photoUrl}
                    alt="Profile photo"
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${player.photoPositionX ?? 50}% ${player.photoPositionY ?? 50}%` }}
                  />
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.7))", padding: "12px 14px 10px" }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--accent)", fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Profile Photo
                    </span>
                  </div>
                </div>
              )}
              {player.galleryImages?.map((img: any, i: number) => (
                <div
                  key={img.id}
                  onClick={() => setLightboxIndex(player.photoUrl ? i + 1 : i)}
                  style={{ position: "relative", borderRadius: "var(--radius-lg)", overflow: "hidden", aspectRatio: "1", border: "1px solid var(--border)", cursor: "zoom-in" }}
                >
                  <img src={img.url} alt={img.caption ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  {img.caption && (
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.7))", padding: "20px 14px 10px" }}>
                      <span style={{ fontSize: "0.75rem", color: "rgba(245,243,238,0.9)" }}>{img.caption}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Medical ──────────────────────────────────────────────── */}
      {tab === "medical" && (
        <div>
          {!isClub ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: "3rem", marginBottom: 16 }}>🔒</div>
              <p style={{ color: "var(--muted)", marginBottom: 20 }}>Medical records are only visible to verified clubs.</p>
              <a href="/auth/register?role=CLUB" className="btn btn-primary">Register Club →</a>
            </div>
          ) : player.medicalRecords?.filter((r: any) => r.isVisibleToClubs).length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
              <div style={{ fontSize: "3rem", marginBottom: 16 }}>✓</div>
              <p>No medical records shared by this player.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {player.medicalRecords
                ?.filter((r: any) => r.isVisibleToClubs)
                .map((r: any) => (
                  <div key={r.id} className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <span className={`badge ${r.recordType === "INJURY" ? "badge-red" : "badge-blue"}`}>
                        {r.recordType}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--muted)" }}>
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {r.recordType === "INJURY" && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, fontSize: "0.85rem" }}>
                        {r.injuryType && <div><span style={{ color: "var(--muted)" }}>Injury: </span>{r.injuryType}</div>}
                        {r.bodyPart && <div><span style={{ color: "var(--muted)" }}>Body Part: </span>{r.bodyPart}</div>}
                        {r.injuryDate && <div><span style={{ color: "var(--muted)" }}>Date: </span>{new Date(r.injuryDate).toLocaleDateString()}</div>}
                        {r.returnDate && <div><span style={{ color: "var(--muted)" }}>Return: </span>{new Date(r.returnDate).toLocaleDateString()}</div>}
                      </div>
                    )}
                    {r.recordType === "PHYSICAL_TEST" && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, fontSize: "0.85rem" }}>
                        {r.testName && <div><span style={{ color: "var(--muted)" }}>Test: </span>{r.testName}</div>}
                        {r.testResult && <div><span style={{ color: "var(--muted)" }}>Result: </span>{r.testResult} {r.testUnit}</div>}
                        {r.testDate && <div><span style={{ color: "var(--muted)" }}>Date: </span>{new Date(r.testDate).toLocaleDateString()}</div>}
                      </div>
                    )}
                    {r.notes && (
                      <p style={{ marginTop: 10, fontSize: "0.85rem", color: "rgba(245,243,238,0.7)", lineHeight: 1.6 }}>{r.notes}</p>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ── Gallery Lightbox ─────────────────────────────────────── */}
      {lightboxIndex !== null && allImages.length > 0 && (
        <GalleryLightbox
          images={allImages}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}
