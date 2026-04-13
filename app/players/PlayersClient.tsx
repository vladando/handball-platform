"use client";
import { useState, useMemo } from "react";
import Link from "next/link";

const POS_SHORT: Record<string,string> = {
  GOALKEEPER:"GK", LEFT_BACK:"LB", RIGHT_BACK:"RB", LEFT_WING:"LW",
  RIGHT_WING:"RW", CENTRE_BACK:"CB", PIVOT:"PV", CENTRE_FORWARD:"CF",
};

export default function PlayersClient({ players, positions, posLabels, nationalities, isVerified }: any) {
  const [q, setQ] = useState("");
  const [pos, setPos] = useState("");
  const [nat, setNat] = useState("");
  const [minH, setMinH] = useState(160);
  const [maxH, setMaxH] = useState(220);
  const [view, setView] = useState<"grid"|"list">("grid");

  const filtered = useMemo(() => players.filter((p: any) => {
    if (pos && p.position !== pos) return false;
    if (nat && !p.nationality.toLowerCase().includes(nat.toLowerCase())) return false;
    if (p.heightCm < minH || p.heightCm > maxH) return false;
    if (q) {
      const s = `${p.firstName} ${p.lastName} ${p.currentClub ?? ""}`.toLowerCase();
      if (!s.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [players, q, pos, nat, minH, maxH]);

  return (
    <>
      {/* Sidebar — fully locked for unverified clubs */}
      {isVerified ? (
        <div className="filter-sidebar">
          <div className="filter-title">
            Filters
            <button onClick={() => { setQ(""); setPos(""); setNat(""); setMinH(160); setMaxH(220); }}
              style={{ fontSize:"0.75rem", fontFamily:"var(--font-mono)", color:"var(--muted)", background:"none", border:"none", cursor:"pointer" }}>
              Reset
            </button>
          </div>
          <div className="form-group">
            <label className="label">Search</label>
            <input className="input" placeholder="Name or club…" value={q} onChange={e => setQ(e.target.value)} style={{ fontSize:"0.85rem" }} />
          </div>
          <div className="form-group">
            <label className="label">Position</label>
            <select className="input" value={pos} onChange={e => setPos(e.target.value)} style={{ fontSize:"0.85rem" }}>
              <option value="">All Positions</option>
              {positions.map((p: string) => <option key={p} value={p}>{posLabels[p]}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Nationality</label>
            <select className="input" value={nat} onChange={e => setNat(e.target.value)} style={{ fontSize:"0.85rem" }}>
              <option value="">All Nations</option>
              {nationalities.map((n: string) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Height: {minH}cm — {maxH}cm</label>
            <input type="range" min={160} max={220} value={minH} onChange={e => setMinH(+e.target.value)} style={{ width:"100%", accentColor:"var(--accent)" }} />
            <input type="range" min={160} max={220} value={maxH} onChange={e => setMaxH(+e.target.value)} style={{ width:"100%", accentColor:"var(--accent)", marginTop:4 }} />
          </div>
          <hr className="divider" style={{ margin:"16px 0" }} />
          <div style={{ fontSize:"0.8rem", color:"var(--muted)", textAlign:"center" }}>
            {filtered.length} player{filtered.length !== 1 ? "s" : ""} found
          </div>
        </div>
      ) : (
        <div className="filter-sidebar" style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, minHeight:320, textAlign:"center" }}>
          <div style={{ fontSize:"2.5rem" }}>🔒</div>
          <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"0.9rem", textTransform:"uppercase", color:"var(--accent)" }}>
            Search Locked
          </div>
          <div style={{ fontSize:"0.8rem", color:"var(--muted)", lineHeight:1.6 }}>
            Filters and search are available only to verified clubs. Contact an admin to verify your club.
          </div>
          <a href="/dashboard/club" className="btn btn-outline" style={{ fontSize:"0.8rem", padding:"8px 16px", marginTop:8 }}>
            View Status →
          </a>
        </div>
      )}

      <div>
        {isVerified ? (
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
            <span style={{ fontSize:"0.85rem", color:"var(--muted)" }}>{filtered.length} results</span>
            <div style={{ display:"flex", gap:4 }}>
              {(["grid","list"] as const).map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  background: view === v ? "var(--accent)" : "transparent",
                  color: view === v ? "var(--black)" : "var(--muted)",
                  border:"1px solid var(--border)", borderRadius:"var(--radius)",
                  padding:"6px 12px", cursor:"pointer", fontSize:"0.8rem",
                }}>
                  {v === "grid" ? "⊞" : "☰"}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
            <span style={{ fontSize:"0.85rem", color:"var(--muted)" }}>
              {players.length} players available — <span style={{ color:"var(--accent)" }}>verify your club to access</span>
            </span>
          </div>
        )}

        {/* Locked showcase for unverified clubs */}
        {!isVerified ? (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:20 }}>
            {players.slice(0, 6).map((p: any) => (
              <div key={p.id} style={{ position:"relative" }}>
                <div style={{ filter:"blur(7px)", pointerEvents:"none", userSelect:"none" }}>
                  <div className="player-card">
                    <div className="player-card-photo">
                      {p.photoUrl
                        ? <img src={p.photoUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                        : <span style={{ fontSize:"3rem", zIndex:1 }}>🏐</span>
                      }
                      <div style={{ position:"absolute", top:10, left:10, zIndex:2 }}>
                        <span className="pos-pill">{POS_SHORT[p.position]}</span>
                      </div>
                    </div>
                    <div className="player-card-body">
                      <div className="player-card-name">{p.firstName} {p.lastName}</div>
                      <div style={{ fontSize:"0.8rem", color:"var(--muted)" }}>{p.nationality} · {p.currentClub ?? "Free Agent"}</div>
                    </div>
                    <div className="player-card-stats">
                      <div className="player-card-stat"><div className="val">{p.heightCm}</div><div className="key">cm</div></div>
                      <div className="player-card-stat"><div className="val">{p.weightKg}</div><div className="key">kg</div></div>
                      <div className="player-card-stat"><div className="val">{new Date().getFullYear()-new Date(p.dateOfBirth).getFullYear()}</div><div className="key">age</div></div>
                    </div>
                  </div>
                </div>
                <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6, borderRadius:"var(--radius-lg)" }}>
                  <span style={{ fontSize:"1.6rem" }}>🔒</span>
                  <span style={{ fontSize:"0.68rem", color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.08em", textAlign:"center" }}>Verify club<br/>to unlock</span>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px 0", color:"var(--muted)" }}>
            <div style={{ fontSize:"3rem", marginBottom:16 }}>🔍</div>
            <p>No players match your filters.</p>
          </div>
        ) : view === "grid" ? (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:20 }}>
            {filtered.map((p: any) => (
              <Link key={p.id} href={`/players/${p.slug}`} className="player-card">
                <div className="player-card-photo">
                  {p.photoUrl
                    ? <img src={p.photoUrl} alt={p.firstName} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    : <span style={{ fontSize:"3rem", zIndex:1 }}>🏐</span>
                  }
                  <div style={{ position:"absolute", top:10, left:10, zIndex:2 }}>
                    <span className="pos-pill">{POS_SHORT[p.position]}</span>
                  </div>
                  {p.isAvailable && (
                    <div style={{ position:"absolute", top:10, right:10, zIndex:2 }}>
                      <span className="badge badge-green">● Available</span>
                    </div>
                  )}
                </div>
                <div className="player-card-body">
                  <div className="player-card-name">{p.firstName} {p.lastName}</div>
                  <div style={{ fontSize:"0.8rem", color:"var(--muted)", marginBottom:6 }}>{p.nationality} · {p.currentClub ?? "Free Agent"}</div>
                  {p.expectedSalary && <span className="badge badge-accent">€{Math.round(p.expectedSalary/100).toLocaleString()}/yr</span>}
                </div>
                <div className="player-card-stats">
                  <div className="player-card-stat"><div className="val">{p.heightCm}</div><div className="key">cm</div></div>
                  <div className="player-card-stat"><div className="val">{p.weightKg}</div><div className="key">kg</div></div>
                  <div className="player-card-stat"><div className="val">{new Date().getFullYear()-new Date(p.dateOfBirth).getFullYear()}</div><div className="key">age</div></div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card" style={{ padding:0, overflow:"hidden" }}>
            <table className="table">
              <thead>
                <tr><th>Player</th><th>Pos</th><th>Nation</th><th>Height</th><th>Age</th><th>Salary</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map((p: any) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"1rem", textTransform:"uppercase" }}>{p.firstName} {p.lastName}</div>
                      <div style={{ fontSize:"0.75rem", color:"var(--muted)" }}>{p.currentClub ?? "Free Agent"}</div>
                    </td>
                    <td><span className="pos-pill">{POS_SHORT[p.position]}</span></td>
                    <td style={{ fontSize:"0.85rem" }}>{p.nationality}</td>
                    <td style={{ fontFamily:"var(--font-mono)", fontSize:"0.85rem" }}>{p.heightCm}cm</td>
                    <td style={{ fontFamily:"var(--font-mono)", fontSize:"0.85rem" }}>{new Date().getFullYear()-new Date(p.dateOfBirth).getFullYear()}</td>
                    <td>{p.expectedSalary ? <span className="badge badge-accent">€{Math.round(p.expectedSalary/100).toLocaleString()}</span> : <span style={{ color:"var(--muted)" }}>—</span>}</td>
                    <td><Link href={`/players/${p.slug}`} className="btn btn-outline" style={{ fontSize:"0.75rem", padding:"6px 12px" }}>View →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
