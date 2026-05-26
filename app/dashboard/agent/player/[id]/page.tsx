"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

function fmtDate(d: any) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" });
}
function fmtCents(c: number | null | undefined) {
  if (!c) return "—";
  return `€${(c / 100).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function getAge(dob: any) {
  if (!dob) return "—";
  return String(Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)));
}
function daysLeft(d: any) {
  if (!d) return null;
  return Math.round((new Date(d).getTime() - Date.now()) / 86400000);
}
const POSITION_LABELS: Record<string, string> = {
  GOALKEEPER: "Goalkeeper", LEFT_WING: "Left Wing", RIGHT_WING: "Right Wing",
  LEFT_BACK: "Left Back", RIGHT_BACK: "Right Back", CENTER_BACK: "Centre Back",
  PIVOT: "Pivot", DEFENDER: "Defender", UNKNOWN: "Unknown",
};
const NOTE_BG: Record<string, string> = { default: "var(--card)", yellow: "#2a2700", green: "#002a0f", blue: "#001a2a", red: "#2a0000", purple: "#1a0028" };
const NOTE_BORDER: Record<string, string> = { default: "var(--border)", yellow: "#fef08a44", green: "#bbf7d044", blue: "#bae6fd44", red: "#fecaca44", purple: "#e9d5ff44" };

export default function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<string>("profile");

  useEffect(() => {
    fetch(`/api/agent/player-detail/${id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--black)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
      Loading…
    </div>
  );

  if (!data?.player) return (
    <div style={{ minHeight: "100vh", background: "var(--black)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: "var(--muted)" }}>
      <div style={{ fontSize: "3rem" }}>🚫</div>
      <div>Player not found or access denied.</div>
      <button onClick={() => router.back()} className="btn btn-outline" style={{ fontSize: "0.8rem" }}>← Back</button>
    </div>
  );

  const { player, contracts, commissions, transfers, agentNotes, generalNotes } = data;
  const healthColor: Record<string, string> = { HEALTHY: "#00c864", INJURED: "var(--red)", REHAB: "#ff8c00", SUSPENDED: "var(--muted)" };

  const SECTIONS = [
    { id: "profile", label: "Profile" },
    { id: "contracts", label: `Contracts (${contracts.length})` },
    { id: "transfers", label: `Transfers (${transfers.length})` },
    { id: "commissions", label: `Commissions (${commissions.length})` },
    { id: "notes", label: `Notes (${generalNotes.length + agentNotes.length})` },
    { id: "career", label: `Career (${player.careerEntries?.length ?? 0})` },
    { id: "media", label: `Media (${(player.galleryImages?.length ?? 0) + (player.videos?.length ?? 0)})` },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--black)", color: "var(--white)", fontFamily: "var(--font-body)" }}>
      {/* Top nav */}
      <div style={{ borderBottom: "1px solid var(--border)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16, background: "var(--card)", position: "sticky", top: 0, zIndex: 50 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "1.2rem", lineHeight: 1 }}>←</button>
        {player.photoUrl && (
          <img src={player.photoUrl} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)" }} />
        )}
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.1rem", textTransform: "uppercase", letterSpacing: "0.02em" }}>
            {player.firstName} {player.lastName}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
            {POSITION_LABELS[player.position] ?? player.position} · {player.nationality}
            {player.currentClub ? ` · ${player.currentClub}` : ""}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Link href={`/dashboard/agent/player/${id}/edit`} className="btn btn-outline" style={{ fontSize: "0.72rem", padding: "6px 14px" }}>✏️ Edit</Link>
          {player.slug && player.onboardingCompleted && (
            <a href={`/players/${player.slug}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ fontSize: "0.72rem", padding: "6px 14px" }}>↗ Public Profile</a>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
        {/* Health banner */}
        {player.healthStatus !== "HEALTHY" && (
          <div style={{ background: `${healthColor[player.healthStatus] ?? "var(--muted)"}18`, border: `1px solid ${healthColor[player.healthStatus] ?? "var(--muted)"}44`, borderRadius: "var(--radius)", padding: "10px 16px", marginBottom: 20, display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: healthColor[player.healthStatus], flexShrink: 0 }} />
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase", fontSize: "0.82rem" }}>{player.healthStatus}</span>
            {player.rehabNote && <span style={{ color: "var(--muted)", fontSize: "0.78rem" }}>— {player.rehabNote}</span>}
            {player.rehabReturnDate && <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--muted)" }}>Return: {fmtDate(player.rehabReturnDate)}</span>}
          </div>
        )}

        {/* Section tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 24, overflowX: "auto" }}>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)} style={{
              background: "none", border: "none", borderBottom: section === s.id ? "2px solid var(--accent)" : "2px solid transparent",
              color: section === s.id ? "var(--accent)" : "var(--muted)", cursor: "pointer",
              fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase",
              letterSpacing: "0.06em", padding: "10px 16px", whiteSpace: "nowrap", marginBottom: -1,
            }}>{s.label}</button>
          ))}
        </div>

        {/* ── PROFILE ── */}
        {section === "profile" && (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 20 }}>
            {/* Photo + key stats */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ position: "relative", height: 260, background: "var(--card2)" }}>
                {player.photoUrl
                  ? <img src={player.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${player.photoPositionX ?? 50}% ${player.photoPositionY ?? 50}%` }} />
                  : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "6rem", opacity: 0.2 }}>👤</div>
                }
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(9,9,9,0.9) 0%, transparent 60%)" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 20px" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.5rem", textTransform: "uppercase", color: "#fff" }}>{player.firstName}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.5rem", textTransform: "uppercase", color: "var(--accent)" }}>{player.lastName}</div>
                </div>
                <div style={{ position: "absolute", top: 12, right: 12, width: 12, height: 12, borderRadius: "50%", background: healthColor[player.healthStatus] ?? "#00c864", boxShadow: `0 0 8px ${healthColor[player.healthStatus] ?? "#00c864"}` }} />
              </div>
              <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  ["Position", POSITION_LABELS[player.position] ?? player.position],
                  ["Age", `${getAge(player.dateOfBirth)} yrs`],
                  ["Nationality", player.nationality],
                  ["Height", player.heightCm ? `${player.heightCm} cm` : "—"],
                  ["Weight", player.weightKg ? `${player.weightKg} kg` : "—"],
                  ["Dominant Hand", player.dominantHand ?? "—"],
                  ["Current Club", player.currentClub ?? "Free Agent"],
                  ["Available", player.isAvailable ? "Yes" : "No"],
                ].map(([label, val]) => (
                  <div key={label as string}>
                    <div style={{ fontSize: "0.58rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bio + salary + verification */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Salary */}
              <div className="card">
                <div style={{ fontSize: "0.62rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Salary Expectations</div>
                {(player.expectedSalaryMin || player.expectedSalaryMax || player.currentSalary) ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {player.currentSalary && <div style={{ fontSize: "0.85rem" }}>Current: <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{fmtCents(player.currentSalary)}/mo</span></div>}
                    {(player.expectedSalaryMin || player.expectedSalaryMax) && (
                      <div style={{ fontSize: "0.85rem" }}>Expected:&nbsp;
                        <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>
                          {player.expectedSalaryMin && player.expectedSalaryMax
                            ? `€${Math.round(player.expectedSalaryMin/100).toLocaleString()} – €${Math.round(player.expectedSalaryMax/100).toLocaleString()}/yr`
                            : player.expectedSalaryMin ? `from €${Math.round(player.expectedSalaryMin/100).toLocaleString()}/yr`
                            : `up to €${Math.round(player.expectedSalaryMax!/100).toLocaleString()}/yr`}
                        </span>
                      </div>
                    )}
                  </div>
                ) : <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>Not specified</div>}
              </div>

              {/* Verification */}
              <div className="card">
                <div style={{ fontSize: "0.62rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Verification</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase", color: player.verificationStatus === "VERIFIED" ? "#00c864" : player.verificationStatus === "PENDING" ? "var(--accent)" : "var(--muted)" }}>
                    {player.verificationStatus === "VERIFIED" ? "✓ Verified" : player.verificationStatus === "PENDING" ? "⏳ Pending" : "Unverified"}
                  </span>
                  {player.verifiedAt && <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{fmtDate(player.verifiedAt)}</span>}
                </div>
                {player.verificationNote && <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{player.verificationNote}</div>}
              </div>

              {/* Bio */}
              {player.bio && (
                <div className="card" style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.62rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Bio</div>
                  <p style={{ fontSize: "0.82rem", lineHeight: 1.7, color: "rgba(245,243,238,0.8)" }}>{player.bio}</p>
                </div>
              )}

              {/* Achievements */}
              {player.achievements && (
                <div className="card">
                  <div style={{ fontSize: "0.62rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Achievements</div>
                  <p style={{ fontSize: "0.82rem", lineHeight: 1.7, color: "rgba(245,243,238,0.8)" }}>{player.achievements}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CONTRACTS ── */}
        {section === "contracts" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {contracts.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "60px 24px", color: "var(--muted)" }}>No contracts recorded for this player.</div>
            ) : contracts.map((c: any) => {
              const days = daysLeft(c.endDate);
              const expired = days !== null && days < 0;
              return (
                <div key={c.id} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", textTransform: "uppercase" }}>{c.clubName}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 4 }}>{fmtDate(c.startDate)} → {fmtDate(c.endDate)}</div>
                      {c.salaryCents && <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--accent)", marginTop: 4 }}>{fmtCents(c.salaryCents)}/mo</div>}
                      {c.bonusDetails && <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 6 }}>Bonus: {c.bonusDetails}</div>}
                      {c.notes && <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 4 }}>Notes: {c.notes}</div>}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {days !== null && (
                        <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.88rem", color: expired ? "var(--red)" : days < 30 ? "var(--red)" : days < 180 ? "var(--accent)" : "#00c864" }}>
                          {expired ? `Expired ${Math.abs(days)}d ago` : `${days}d left`}
                        </div>
                      )}
                      {c.contractFileUrl && <a href={c.contractFileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ fontSize: "0.68rem", padding: "4px 10px", marginTop: 8, display: "inline-block" }}>📄 View File</a>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── TRANSFERS ── */}
        {section === "transfers" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {transfers.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "60px 24px", color: "var(--muted)" }}>No transfers recorded for this player.</div>
            ) : transfers.map((t: any) => (
              <div key={t.id} className="card">
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(232,255,71,0.08)", border: "1px solid rgba(232,255,71,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>🔄</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.95rem", textTransform: "uppercase" }}>
                      {t.fromClub || "Free Agent"} <span style={{ color: "var(--accent)" }}>→</span> {t.toClub}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 4 }}>
                      {fmtDate(t.transferDate)}
                      {t.contractStartDate && t.contractEndDate && ` · Contract: ${fmtDate(t.contractStartDate)} → ${fmtDate(t.contractEndDate)}`}
                      {t.contractMonths && ` · ${t.contractMonths} months`}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    {t.salaryCents && <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--accent)" }}>{fmtCents(t.salaryCents)}/mo</div>}
                    {t.commissionCents && <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>Commission: {fmtCents(t.commissionCents)}</div>}
                  </div>
                </div>
                {t.notes && <div style={{ marginTop: 10, fontSize: "0.78rem", color: "var(--muted)", paddingTop: 10, borderTop: "1px solid var(--border)" }}>{t.notes}</div>}
                {t.contractFileUrl && <a href={t.contractFileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ fontSize: "0.68rem", padding: "4px 10px", marginTop: 10, display: "inline-block" }}>📄 View Contract</a>}
              </div>
            ))}
          </div>
        )}

        {/* ── COMMISSIONS ── */}
        {section === "commissions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {commissions.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "60px 24px", color: "var(--muted)" }}>No commissions recorded for this player.</div>
            ) : commissions.map((c: any) => {
              const overdue = c.status === "PENDING" && c.dueDate && daysLeft(c.dueDate) !== null && daysLeft(c.dueDate)! < 0;
              return (
                <div key={c.id} className="card" style={{ borderColor: overdue ? "rgba(255,59,59,0.3)" : undefined }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.92rem", textTransform: "uppercase" }}>{c.description || "Commission"}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 4 }}>Due: {fmtDate(c.dueDate)}{c.paidAt ? ` · Paid: ${fmtDate(c.paidAt)}` : ""}</div>
                      {c.notes && <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 4 }}>{c.notes}</div>}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "1rem", color: c.status === "PAID" ? "#00c864" : overdue ? "var(--red)" : "var(--accent)" }}>{fmtCents(c.amountCents)}</div>
                      <div style={{ marginTop: 4 }}>
                        <span style={{ fontSize: "0.6rem", fontFamily: "var(--font-mono)", fontWeight: 700, textTransform: "uppercase", padding: "2px 8px", borderRadius: 3,
                          background: c.status === "PAID" ? "rgba(0,200,100,0.15)" : overdue ? "rgba(255,59,59,0.15)" : "rgba(232,255,71,0.15)",
                          color: c.status === "PAID" ? "#00c864" : overdue ? "var(--red)" : "var(--accent)" }}>
                          {overdue ? "OVERDUE" : c.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── NOTES ── */}
        {section === "notes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* General notes linked to this player */}
            {generalNotes.length > 0 && (
              <div>
                <div style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>General Notes</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                  {generalNotes.map((n: any) => (
                    <div key={n.id} style={{ background: NOTE_BG[n.color] ?? "var(--card)", border: `1px solid ${NOTE_BORDER[n.color] ?? "var(--border)"}`, borderRadius: "var(--radius-lg)", padding: "14px 16px" }}>
                      {n.title && <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.88rem", textTransform: "uppercase", marginBottom: 6 }}>{n.title}</div>}
                      <div style={{ fontSize: "0.82rem", lineHeight: 1.6, whiteSpace: "pre-wrap", color: "rgba(245,243,238,0.85)" }}>{n.content}</div>
                      <div style={{ fontSize: "0.6rem", color: "var(--muted)", marginTop: 10, fontFamily: "var(--font-mono)" }}>{fmtDate(n.updatedAt)}{n.pinned ? " · 📌" : ""}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Player-specific agent notes */}
            {agentNotes.length > 0 && (
              <div>
                <div style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>Scouting Notes</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {agentNotes.map((n: any) => (
                    <div key={n.id} className="card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "var(--accent)", textTransform: "uppercase" }}>{n.category}</span>
                        <span style={{ fontSize: "0.6rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{fmtDate(n.createdAt)}</span>
                      </div>
                      <p style={{ fontSize: "0.85rem", lineHeight: 1.7, color: "rgba(245,243,238,0.85)" }}>{n.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {generalNotes.length === 0 && agentNotes.length === 0 && (
              <div className="card" style={{ textAlign: "center", padding: "60px 24px", color: "var(--muted)" }}>No notes for this player yet.</div>
            )}
          </div>
        )}

        {/* ── CAREER ── */}
        {section === "career" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(!player.careerEntries || player.careerEntries.length === 0) ? (
              <div className="card" style={{ textAlign: "center", padding: "60px 24px", color: "var(--muted)" }}>No career entries recorded.</div>
            ) : player.careerEntries.map((e: any) => (
              <div key={e.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.95rem", textTransform: "uppercase" }}>{e.clubName}</div>
                    {e.leagueName && <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>{e.leagueName}</div>}
                    {e.description && <div style={{ fontSize: "0.78rem", color: "rgba(245,243,238,0.7)", marginTop: 6 }}>{e.description}</div>}
                  </div>
                  <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--muted)" }}>
                    {e.startYear}{e.endYear ? ` — ${e.endYear}` : " — Present"}
                    {e.appearances != null && <div style={{ marginTop: 2 }}>{e.appearances} apps{e.goals != null ? ` · ${e.goals} goals` : ""}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── MEDIA ── */}
        {section === "media" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {(player.galleryImages?.length ?? 0) > 0 && (
              <div>
                <div style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>Gallery</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                  {player.galleryImages.map((img: any) => (
                    <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--border)", aspectRatio: "4/3" }}>
                      <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </a>
                  ))}
                </div>
              </div>
            )}
            {(player.videos?.length ?? 0) > 0 && (
              <div>
                <div style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>Videos</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {player.videos.map((v: any) => (
                    <div key={v.id} className="card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ fontSize: "1.5rem" }}>🎬</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: "0.88rem", fontWeight: 700, textTransform: "uppercase" }}>{v.title || "Video"}</div>
                        {v.description && <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>{v.description}</div>}
                      </div>
                      <a href={v.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ fontSize: "0.68rem", padding: "4px 10px" }}>▶ Watch</a>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(player.galleryImages?.length ?? 0) === 0 && (player.videos?.length ?? 0) === 0 && (
              <div className="card" style={{ textAlign: "center", padding: "60px 24px", color: "var(--muted)" }}>No media uploaded.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
