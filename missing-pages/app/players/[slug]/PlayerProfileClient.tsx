"use client";
import { useState } from "react";

export default function PlayerProfileClient({ player }: { player: any }) {
  const [tab, setTab] = useState("bio");
  const tabs = [
    { id:"bio", label:"Bio" },
    { id:"career", label:"Career" },
    { id:"videos", label:`Videos (${player.videos?.length ?? 0})` },
    { id:"medical", label:"Medical" },
  ];

  return (
    <div>
      <div className="tabs">
        {tabs.map(t => (
          <button key={t.id} className={`tab-btn${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "bio" && (
        <div>
          {player.bio
            ? <div style={{ fontSize:"1rem", lineHeight:1.8, color:"rgba(245,243,238,0.85)", maxWidth:640 }}>{player.bio}</div>
            : <div style={{ color:"var(--muted)", fontStyle:"italic" }}>No bio provided yet.</div>
          }
        </div>
      )}

      {tab === "career" && (
        <div>
          {!player.careerEntries?.length
            ? <div style={{ color:"var(--muted)" }}>No career history added yet.</div>
            : <div className="timeline">
                {player.careerEntries.map((e: any) => (
                  <div key={e.id} className={`timeline-item${e.isCurrentClub ? " current" : ""}`}>
                    <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
                      <div>
                        <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"1.15rem", textTransform:"uppercase" }}>
                          {e.clubName}
                          {e.isCurrentClub && <span className="badge badge-green" style={{ marginLeft:8 }}>Current</span>}
                        </div>
                        <div style={{ fontSize:"0.85rem", color:"var(--muted)" }}>{e.country}</div>
                      </div>
                      <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.8rem", color:"var(--muted)" }}>
                        {new Date(e.startDate).getFullYear()} — {e.endDate ? new Date(e.endDate).getFullYear() : "Present"}
                      </div>
                    </div>
                    {(e.appearances || e.goals || e.assists) && (
                      <div style={{ display:"flex", gap:20, marginTop:10 }}>
                        {e.appearances != null && <div><span style={{ fontFamily:"var(--font-display)", fontWeight:700, color:"var(--accent)", fontSize:"1.2rem" }}>{e.appearances}</span><span style={{ fontSize:"0.75rem", color:"var(--muted)", marginLeft:4 }}>Apps</span></div>}
                        {e.goals != null && <div><span style={{ fontFamily:"var(--font-display)", fontWeight:700, color:"var(--accent)", fontSize:"1.2rem" }}>{e.goals}</span><span style={{ fontSize:"0.75rem", color:"var(--muted)", marginLeft:4 }}>Goals</span></div>}
                        {e.assists != null && <div><span style={{ fontFamily:"var(--font-display)", fontWeight:700, color:"var(--accent)", fontSize:"1.2rem" }}>{e.assists}</span><span style={{ fontSize:"0.75rem", color:"var(--muted)", marginLeft:4 }}>Assists</span></div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {tab === "videos" && (
        <div>
          {!player.videos?.length
            ? <div style={{ color:"var(--muted)" }}>No videos uploaded yet.</div>
            : <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:20 }}>
                {player.videos.map((v: any) => {
                  const ytId = v.youtubeUrl?.match(/(?:youtu\.be\/|v=)([^&?]+)/)?.[1];
                  return (
                    <div key={v.id} className="card" style={{ padding:0, overflow:"hidden" }}>
                      {ytId && (
                        <div style={{ position:"relative", paddingBottom:"56.25%" }}>
                          <iframe src={`https://www.youtube.com/embed/${ytId}`} style={{ position:"absolute", inset:0, width:"100%", height:"100%", border:"none" }} allowFullScreen title={v.title} />
                        </div>
                      )}
                      <div style={{ padding:"14px 16px" }}>
                        <div style={{ fontFamily:"var(--font-display)", fontWeight:700, textTransform:"uppercase", fontSize:"0.9rem" }}>{v.title}</div>
                        {v.description && <div style={{ fontSize:"0.8rem", color:"var(--muted)", marginTop:4 }}>{v.description}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </div>
      )}

      {tab === "medical" && (
        <div>
          {!player.medicalRecords?.length
            ? <div style={{ color:"var(--muted)" }}>No public medical records.</div>
            : <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                {player.medicalRecords.map((r: any) => (
                  <div key={r.id} className="card" style={{ padding:"20px 24px" }}>
                    <div style={{ marginBottom:8 }}>
                      <span className={`badge ${r.recordType === "INJURY" ? "badge-red" : r.recordType === "PHYSICAL_TEST" ? "badge-blue" : "badge-green"}`} style={{ marginRight:8 }}>
                        {r.recordType.replace("_"," ")}
                      </span>
                      <span style={{ fontFamily:"var(--font-display)", fontWeight:700, textTransform:"uppercase", fontSize:"1rem" }}>
                        {r.testName ?? r.injuryType ?? "Record"}
                      </span>
                    </div>
                    {r.testResult && (
                      <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"1.6rem", color:"var(--accent)" }}>
                        {r.testResult} {r.testUnit && <span style={{ fontSize:"0.8rem", color:"var(--muted)" }}>{r.testUnit}</span>}
                      </div>
                    )}
                    {r.notes && <div style={{ fontSize:"0.85rem", color:"var(--muted)", marginTop:8 }}>{r.notes}</div>}
                  </div>
                ))}
              </div>
          }
        </div>
      )}
    </div>
  );
}
