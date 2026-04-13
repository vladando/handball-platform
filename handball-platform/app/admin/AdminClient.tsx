"use client";
import { useState } from "react";
import Link from "next/link";

const STATUS_COLORS: Record<string,string> = { PENDING:"badge-accent",VERIFIED:"badge-green",REJECTED:"badge-red" };
const COMM_COLORS: Record<string,string> = { PENDING:"badge-accent",INVOICED:"badge-blue",PAID:"badge-green",DISPUTED:"badge-red",WAIVED:"badge-muted" };

export default function AdminClient({ clubs, players, interactions, stats }: any) {
  const [tab, setTab] = useState("overview");

  async function verifyClub(clubId: string, status: string) {
    await fetch("/api/admin/clubs/verify",{ method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ clubId, status }) });
    window.location.reload();
  }

  async function updateCommission(interactionId: string, status: string) {
    await fetch("/api/admin/interactions/status",{ method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ interactionId, status }) });
    window.location.reload();
  }

  const tabs = [{ id:"overview",label:"Overview" },{ id:"clubs",label:`Clubs (${clubs.length})` },{ id:"players",label:`Players (${players.length})` },{ id:"interactions",label:`Commission Log (${interactions.length})` }];

  return (
    <div>
      <div style={{ marginBottom:32 }}><div className="section-label">Administration</div><h2>Platform Overview</h2></div>
      <div className="tabs">{tabs.map(t => <button key={t.id} className={`tab-btn${tab===t.id?" active":""}`} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>

      {tab === "overview" && (
        <div>
          <div className="grid-4" style={{ marginBottom:40 }}>
            {[{ label:"Total Clubs",val:stats.totalClubs },{ label:"Pending Verification",val:stats.pendingClubs,alert:stats.pendingClubs>0 },{ label:"Total Players",val:stats.totalPlayers },{ label:"Pending Commission",val:stats.pendingCommission }].map(s => (
              <div key={s.label} className="card" style={{ textAlign:"center", borderColor:(s as any).alert?"rgba(232,255,71,0.4)":undefined }}>
                <div style={{ fontFamily:"var(--font-display)", fontWeight:900, fontSize:"2.5rem", color:(s as any).alert?"var(--accent)":"var(--white)", lineHeight:1 }}>{s.val}</div>
                <div style={{ fontSize:"0.75rem", color:"var(--muted)", marginTop:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>{s.label}</div>
              </div>
            ))}
          </div>
          {clubs.filter((c:any)=>c.verificationStatus==="PENDING").length > 0 && (
            <div>
              <h4 style={{ textTransform:"uppercase", marginBottom:16, color:"var(--accent)" }}>⚠ Clubs Awaiting Verification</h4>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {clubs.filter((c:any)=>c.verificationStatus==="PENDING").map((club:any) => (
                  <div key={club.id} className="card" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:16, flexWrap:"wrap" }}>
                    <div>
                      <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"1.1rem", textTransform:"uppercase" }}>{club.name}</div>
                      <div style={{ fontSize:"0.8rem", color:"var(--muted)" }}>{club.city}, {club.country} · {club.user?.email}</div>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button className="btn btn-primary" style={{ fontSize:"0.8rem", padding:"8px 16px" }} onClick={() => verifyClub(club.id,"VERIFIED")}>✓ Verify</button>
                      <button className="btn btn-danger" style={{ fontSize:"0.8rem", padding:"8px 16px" }} onClick={() => verifyClub(club.id,"REJECTED")}>✕ Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "clubs" && (
        <div className="card" style={{ padding:0, overflow:"hidden" }}>
          <table className="table">
            <thead><tr><th>Club</th><th>Location</th><th>Email</th><th>Subscription</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {clubs.map((club:any) => (
                <tr key={club.id}>
                  <td><div style={{ fontFamily:"var(--font-display)", fontWeight:700, textTransform:"uppercase" }}>{club.name}</div>{club.leagueName&&<div style={{ fontSize:"0.75rem", color:"var(--muted)" }}>{club.leagueName}</div>}</td>
                  <td style={{ fontSize:"0.85rem" }}>{club.city}, {club.country}</td>
                  <td style={{ fontFamily:"var(--font-mono)", fontSize:"0.75rem", color:"var(--muted)" }}>{club.user?.email}</td>
                  <td><span className={`badge ${club.subscriptionStatus==="ACTIVE"?"badge-green":"badge-muted"}`}>{club.subscriptionStatus}</span></td>
                  <td><span className={`badge ${STATUS_COLORS[club.verificationStatus]}`}>{club.verificationStatus}</span></td>
                  <td style={{ display:"flex", gap:4 }}>
                    {club.verificationStatus==="PENDING"&&<>
                      <button className="btn btn-primary" style={{ fontSize:"0.7rem", padding:"4px 8px" }} onClick={() => verifyClub(club.id,"VERIFIED")}>Verify</button>
                      <button className="btn btn-danger" style={{ fontSize:"0.7rem", padding:"4px 8px" }} onClick={() => verifyClub(club.id,"REJECTED")}>Reject</button>
                    </>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "players" && (
        <div className="card" style={{ padding:0, overflow:"hidden" }}>
          <table className="table">
            <thead><tr><th>Player</th><th>Position</th><th>Nation</th><th>Available</th><th>Created</th></tr></thead>
            <tbody>
              {players.map((p:any) => (
                <tr key={p.id}>
                  <td><Link href={`/players/${p.slug}`} style={{ fontFamily:"var(--font-display)", fontWeight:700, textTransform:"uppercase" }}>{p.firstName} {p.lastName}</Link><div style={{ fontSize:"0.75rem", color:"var(--muted)" }}>{p.currentClub??"Free Agent"}</div></td>
                  <td><span className="pos-pill" style={{ fontSize:"0.7rem" }}>{p.position.replace(/_/g," ")}</span></td>
                  <td style={{ fontSize:"0.85rem" }}>{p.nationality}</td>
                  <td><span className={`badge ${p.isAvailable?"badge-green":"badge-muted"}`}>{p.isAvailable?"Yes":"No"}</span></td>
                  <td style={{ fontFamily:"var(--font-mono)", fontSize:"0.75rem", color:"var(--muted)" }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "interactions" && (
        <div>
          <div style={{ marginBottom:16, padding:"14px 20px", background:"rgba(232,255,71,0.05)", border:"1px solid rgba(232,255,71,0.15)", borderRadius:"var(--radius)", fontSize:"0.85rem", color:"rgba(245,243,238,0.7)" }}>
            ℹ Immutable digital footprint log. Each entry is a legally binding record used to enforce the 5% commission.
          </div>
          <div className="card" style={{ padding:0, overflow:"hidden" }}>
            <table className="table">
              <thead><tr><th>Club</th><th>Player</th><th>Revealed At</th><th>Rate</th><th>Status</th><th>Update</th></tr></thead>
              <tbody>
                {interactions.map((i:any) => (
                  <tr key={i.id}>
                    <td style={{ fontFamily:"var(--font-display)", fontWeight:700, textTransform:"uppercase", fontSize:"0.9rem" }}>{i.club?.name}</td>
                    <td><Link href={`/players/${i.player?.slug}`} style={{ fontFamily:"var(--font-display)", fontWeight:600, textTransform:"uppercase", fontSize:"0.9rem" }}>{i.player?.firstName} {i.player?.lastName}</Link></td>
                    <td style={{ fontFamily:"var(--font-mono)", fontSize:"0.75rem", color:"var(--muted)" }}>{new Date(i.createdAt).toLocaleString()}</td>
                    <td style={{ fontFamily:"var(--font-mono)", color:"var(--accent)" }}>{(parseFloat(i.commissionRate)*100).toFixed(1)}%</td>
                    <td><span className={`badge ${COMM_COLORS[i.commissionStatus]??"badge-muted"}`}>{i.commissionStatus}</span></td>
                    <td>
                      <select className="input" defaultValue={i.commissionStatus} style={{ fontSize:"0.75rem", padding:"4px 8px" }} onChange={e => updateCommission(i.id,e.target.value)}>
                        {["PENDING","INVOICED","PAID","DISPUTED","WAIVED"].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
