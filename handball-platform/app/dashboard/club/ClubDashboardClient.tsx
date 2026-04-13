"use client";
import { useState } from "react";
import Link from "next/link";

const POS_SHORT: Record<string,string> = { GOALKEEPER:"GK",LEFT_BACK:"LB",RIGHT_BACK:"RB",LEFT_WING:"LW",RIGHT_WING:"RW",CENTRE_BACK:"CB",PIVOT:"PV",CENTRE_FORWARD:"CF" };
const STATUS_COLORS: Record<string,string> = { PENDING:"badge-accent",INVOICED:"badge-blue",PAID:"badge-green",DISPUTED:"badge-red",WAIVED:"badge-muted" };

export default function ClubDashboardClient({ club, stats }: { club: any; stats: any }) {
  const [tab, setTab] = useState("overview");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [filters, setFilters] = useState({ q:"", position:"", nationality:"", minH:"", maxH:"", minSalary:"" });
  const [noteInputs, setNoteInputs] = useState<Record<string,string>>({});

  function setF(k: string, v: string) { setFilters(f => ({ ...f, [k]:v })); }

  async function doSearch() {
    setSearchLoading(true);
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k,v]) => v && p.set(k,v));
    const res = await fetch(`/api/players/search?${p}`);
    const data = await res.json();
    setSearchResults(data.players??[]);
    setSearchLoading(false);
  }

  async function addToWatchlist(playerId: string) {
    await fetch("/api/watchlist",{ method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ playerId }) });
  }

  async function saveNote(playerId: string) {
    const content = noteInputs[playerId];
    if (!content?.trim()) return;
    await fetch("/api/scouting-notes",{ method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ playerId, content }) });
    setNoteInputs(n => ({ ...n, [playerId]:"" }));
  }

  const tabs = [{ id:"overview",label:"Overview" },{ id:"search",label:"Search Players" },{ id:"watchlist",label:`Watchlist (${stats.watchlist})` },{ id:"interactions",label:`Interactions (${stats.reveals})` },{ id:"settings",label:"Settings" }];

  return (
    <div>
      <div style={{ marginBottom:32 }}><div className="section-label">Club Dashboard</div><h2>{club.name}</h2></div>
      <div className="tabs">{tabs.map(t => <button key={t.id} className={`tab-btn${tab===t.id?" active":""}`} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>

      {tab === "overview" && (
        <div>
          <div className="grid-3" style={{ marginBottom:40 }}>
            {[{ label:"Players on Watchlist",val:stats.watchlist,accent:true },{ label:"Contacts Revealed",val:stats.reveals,accent:false },{ label:"Pending Commission",val:stats.pending,accent:false }].map(s => (
              <div key={s.label} className="card" style={{ textAlign:"center" }}>
                <div style={{ fontFamily:"var(--font-display)", fontWeight:900, fontSize:"3rem", color:s.accent?"var(--accent)":"var(--white)", lineHeight:1 }}>{s.val}</div>
                <div style={{ fontSize:"0.8rem", color:"var(--muted)", marginTop:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div className="card" style={{ marginBottom:24 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
              <div><div className="section-label" style={{ marginBottom:4 }}>Subscription</div><div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"1.1rem", textTransform:"uppercase" }}>{club.subscriptionStatus}</div></div>
              <span className={`badge ${club.subscriptionStatus==="ACTIVE"?"badge-green":club.subscriptionStatus==="TRIAL"?"badge-accent":"badge-red"}`} style={{ fontSize:"0.85rem", padding:"6px 12px" }}>{club.subscriptionStatus}</span>
            </div>
          </div>
          {club.interactions?.length > 0 && (
            <div>
              <h4 style={{ textTransform:"uppercase", marginBottom:16 }}>Recent Reveals</h4>
              <div className="card" style={{ padding:0, overflow:"hidden" }}>
                <table className="table">
                  <thead><tr><th>Player</th><th>Revealed</th><th>Commission</th></tr></thead>
                  <tbody>
                    {club.interactions.slice(0,5).map((i: any) => (
                      <tr key={i.id}>
                        <td><Link href={`/players/${i.player.slug}`} style={{ fontFamily:"var(--font-display)", fontWeight:700, textTransform:"uppercase" }}>{i.player.firstName} {i.player.lastName}</Link></td>
                        <td style={{ fontFamily:"var(--font-mono)", fontSize:"0.8rem", color:"var(--muted)" }}>{new Date(i.createdAt).toLocaleDateString()}</td>
                        <td><span className={`badge ${STATUS_COLORS[i.commissionStatus]}`}>{i.commissionStatus}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "search" && (
        <div>
          <div className="card" style={{ marginBottom:24 }}>
            <div className="grid-3" style={{ marginBottom:16 }}>
              <div className="form-group" style={{ marginBottom:0 }}><label className="label">Search</label><input className="input" value={filters.q} onChange={e => setF("q",e.target.value)} placeholder="Name or club…" /></div>
              <div className="form-group" style={{ marginBottom:0 }}><label className="label">Position</label><select className="input" value={filters.position} onChange={e => setF("position",e.target.value)}><option value="">All</option>{["GOALKEEPER","LEFT_BACK","RIGHT_BACK","LEFT_WING","RIGHT_WING","CENTRE_BACK","PIVOT","CENTRE_FORWARD"].map(p => <option key={p} value={p}>{p.replace(/_/g," ")}</option>)}</select></div>
              <div className="form-group" style={{ marginBottom:0 }}><label className="label">Nationality</label><input className="input" value={filters.nationality} onChange={e => setF("nationality",e.target.value)} placeholder="Germany…" /></div>
            </div>
            <div className="grid-3" style={{ marginBottom:16 }}>
              <div className="form-group" style={{ marginBottom:0 }}><label className="label">Min Height (cm)</label><input className="input" type="number" value={filters.minH} onChange={e => setF("minH",e.target.value)} placeholder="180" /></div>
              <div className="form-group" style={{ marginBottom:0 }}><label className="label">Max Height (cm)</label><input className="input" type="number" value={filters.maxH} onChange={e => setF("maxH",e.target.value)} placeholder="210" /></div>
              <div className="form-group" style={{ marginBottom:0 }}><label className="label">Max Salary (€/yr)</label><input className="input" type="number" value={filters.minSalary} onChange={e => setF("minSalary",e.target.value)} placeholder="100000" /></div>
            </div>
            <button className="btn btn-primary" onClick={doSearch} disabled={searchLoading}>{searchLoading?<><span className="spinner" /> Searching…</>:"Search Players"}</button>
          </div>
          {searchResults.length > 0 && (
            <div className="card" style={{ padding:0, overflow:"hidden" }}>
              <table className="table">
                <thead><tr><th>Player</th><th>Pos</th><th>Nation</th><th>Height</th><th>Age</th><th>Salary</th><th>Actions</th></tr></thead>
                <tbody>
                  {searchResults.map((p: any) => (
                    <tr key={p.id}>
                      <td><Link href={`/players/${p.slug}`} style={{ fontFamily:"var(--font-display)", fontWeight:700, textTransform:"uppercase" }}>{p.firstName} {p.lastName}</Link><div style={{ fontSize:"0.75rem", color:"var(--muted)" }}>{p.currentClub??"Free Agent"}</div></td>
                      <td><span className="pos-pill">{POS_SHORT[p.position]}</span></td>
                      <td style={{ fontSize:"0.85rem" }}>{p.nationality}</td>
                      <td style={{ fontFamily:"var(--font-mono)", fontSize:"0.85rem" }}>{p.heightCm}cm</td>
                      <td style={{ fontFamily:"var(--font-mono)", fontSize:"0.85rem" }}>{new Date().getFullYear()-new Date(p.dateOfBirth).getFullYear()}</td>
                      <td>{p.expectedSalary?<span className="badge badge-accent">€{Math.round(p.expectedSalary/100).toLocaleString()}</span>:"—"}</td>
                      <td style={{ display:"flex", gap:6 }}>
                        <Link href={`/players/${p.slug}`} className="btn btn-outline" style={{ fontSize:"0.75rem", padding:"5px 10px" }}>View</Link>
                        <button className="btn btn-ghost" style={{ fontSize:"0.75rem", padding:"5px 10px" }} onClick={() => addToWatchlist(p.id)}>★ Watch</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "watchlist" && (
        <div>
          {club.watchlist?.length === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 0", color:"var(--muted)" }}>
              <div style={{ fontSize:"3rem", marginBottom:16 }}>★</div>
              <p>No players on your watchlist yet.</p>
              <button className="btn btn-primary" style={{ marginTop:20 }} onClick={() => setTab("search")}>Search Players</button>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              {club.watchlist?.map((item: any) => (
                <div key={item.id} className="card" style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:16, alignItems:"start" }}>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                      <Link href={`/players/${item.player.slug}`} style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"1.15rem", textTransform:"uppercase" }}>{item.player.firstName} {item.player.lastName}</Link>
                      <span className="pos-pill">{POS_SHORT[item.player.position]}</span>
                    </div>
                    <div style={{ fontSize:"0.85rem", color:"var(--muted)", marginBottom:12 }}>{item.player.nationality} · {item.player.currentClub??"Free Agent"} · {item.player.heightCm}cm</div>
                    <div style={{ display:"flex", gap:8 }}>
                      <input className="input" placeholder="Add scouting note…" value={noteInputs[item.player.id]??""} onChange={e => setNoteInputs(n => ({ ...n, [item.player.id]:e.target.value }))} style={{ fontSize:"0.85rem" }} />
                      <button className="btn btn-outline" style={{ fontSize:"0.8rem", padding:"8px 14px", flexShrink:0 }} onClick={() => saveNote(item.player.id)}>Save</button>
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.75rem", color:"var(--muted)", marginBottom:8 }}>Added {new Date(item.addedAt).toLocaleDateString()}</div>
                    <Link href={`/players/${item.player.slug}`} className="btn btn-primary" style={{ fontSize:"0.8rem", padding:"8px 16px" }}>View Profile →</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "interactions" && (
        <div>
          <div style={{ marginBottom:16, padding:"14px 20px", background:"rgba(232,255,71,0.05)", border:"1px solid rgba(232,255,71,0.15)", borderRadius:"var(--radius)", fontSize:"0.85rem", color:"rgba(245,243,238,0.7)" }}>
            ℹ Each row is a legally logged contact reveal. A 5% commission on any signed transfer is due.
          </div>
          <div className="card" style={{ padding:0, overflow:"hidden" }}>
            <table className="table">
              <thead><tr><th>Player</th><th>Revealed At</th><th>ToS Version</th><th>Rate</th><th>Status</th></tr></thead>
              <tbody>
                {club.interactions?.map((i: any) => (
                  <tr key={i.id}>
                    <td><Link href={`/players/${i.player.slug}`} style={{ fontFamily:"var(--font-display)", fontWeight:700, textTransform:"uppercase" }}>{i.player.firstName} {i.player.lastName}</Link></td>
                    <td style={{ fontFamily:"var(--font-mono)", fontSize:"0.8rem", color:"var(--muted)" }}>{new Date(i.createdAt).toLocaleString()}</td>
                    <td><span className="badge badge-muted">{i.acceptedTosVersion}</span></td>
                    <td style={{ fontFamily:"var(--font-mono)", color:"var(--accent)" }}>{(parseFloat(i.commissionRate)*100).toFixed(1)}%</td>
                    <td><span className={`badge ${STATUS_COLORS[i.commissionStatus]}`}>{i.commissionStatus}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "settings" && (
        <div style={{ maxWidth:560 }}>
          <div className="card">
            <h4 style={{ textTransform:"uppercase", marginBottom:20 }}>Club Information</h4>
            <div className="form-group"><label className="label">Club Name</label><input className="input" defaultValue={club.name} /></div>
            <div className="form-group"><label className="label">Country</label><input className="input" defaultValue={club.country} /></div>
            <div className="form-group"><label className="label">City</label><input className="input" defaultValue={club.city} /></div>
            <div className="form-group"><label className="label">League</label><input className="input" defaultValue={club.leagueName??""} /></div>
            <button className="btn btn-primary">Save Changes</button>
          </div>
        </div>
      )}
    </div>
  );
}
