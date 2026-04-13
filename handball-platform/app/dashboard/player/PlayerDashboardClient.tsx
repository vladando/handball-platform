"use client";
import { useState } from "react";
import Link from "next/link";

const POSITIONS = ["GOALKEEPER","LEFT_BACK","RIGHT_BACK","LEFT_WING","RIGHT_WING","CENTRE_BACK","PIVOT","CENTRE_FORWARD"];

export default function PlayerDashboardClient({ player, revealCount }: { player: any; revealCount: number }) {
  const [tab, setTab] = useState("overview");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [profile, setProfile] = useState({
    firstName:player.firstName, lastName:player.lastName, bio:player.bio??"", nationality:player.nationality,
    heightCm:player.heightCm, weightKg:player.weightKg, position:player.position, dominantHand:player.dominantHand,
    currentClub:player.currentClub??"", expectedSalary:player.expectedSalary?Math.round(player.expectedSalary/100):"",
    phone:player.phone??"", agentName:player.agentName??"", agentPhone:player.agentPhone??"", agentEmail:player.agentEmail??"", isAvailable:player.isAvailable,
  });
  const [videos, setVideos] = useState(player.videos??[]);
  const [newVideo, setNewVideo] = useState({ title:"", youtubeUrl:"", description:"" });
  const [career, setCareer] = useState(player.careerEntries??[]);
  const [newCareer, setNewCareer] = useState({ clubName:"", country:"", startDate:"", endDate:"", appearances:"", goals:"", assists:"", isCurrentClub:false });
  const [medical, setMedical] = useState(player.medicalRecords??[]);
  const [newMedical, setNewMedical] = useState({ recordType:"PHYSICAL_TEST", testName:"", testResult:"", testUnit:"", injuryType:"", bodyPart:"", notes:"", isVisibleToClubs:true });

  function setP(k: string, v: any) { setProfile(p => ({ ...p, [k]:v })); }

  async function saveProfile() {
    setSaving(true); setMsg("");
    const res = await fetch("/api/player/profile", { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ ...profile, expectedSalary:profile.expectedSalary?+profile.expectedSalary*100:null }) });
    setSaving(false);
    setMsg(res.ok ? "✓ Profile saved successfully." : "✕ Failed to save.");
  }

  async function addVideo() {
    if (!newVideo.title||!newVideo.youtubeUrl) return;
    const res = await fetch("/api/player/videos", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(newVideo) });
    if (res.ok) { const d = await res.json(); setVideos((v: any[]) => [...v, d.video]); setNewVideo({ title:"", youtubeUrl:"", description:"" }); }
  }

  async function deleteVideo(id: string) {
    await fetch(`/api/player/videos/${id}`, { method:"DELETE" });
    setVideos((v: any[]) => v.filter((x: any) => x.id !== id));
  }

  async function addCareer() {
    if (!newCareer.clubName||!newCareer.country||!newCareer.startDate) return;
    const res = await fetch("/api/player/career", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(newCareer) });
    if (res.ok) { const d = await res.json(); setCareer((c: any[]) => [d.entry,...c]); setNewCareer({ clubName:"", country:"", startDate:"", endDate:"", appearances:"", goals:"", assists:"", isCurrentClub:false }); }
  }

  async function addMedical() {
    const res = await fetch("/api/player/medical", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(newMedical) });
    if (res.ok) { const d = await res.json(); setMedical((m: any[]) => [d.record,...m]); setNewMedical({ recordType:"PHYSICAL_TEST", testName:"", testResult:"", testUnit:"", injuryType:"", bodyPart:"", notes:"", isVisibleToClubs:true }); }
  }

  const tabs = [{ id:"overview",label:"Overview" },{ id:"profile",label:"Edit Profile" },{ id:"career",label:"Career" },{ id:"videos",label:`Videos (${videos.length})` },{ id:"medical",label:"Medical" },{ id:"visibility",label:"Visibility" }];

  return (
    <div>
      <div style={{ marginBottom:32 }}><div className="section-label">Player Dashboard</div><h2>{player.firstName} {player.lastName}</h2></div>
      <div className="tabs">{tabs.map(t => <button key={t.id} className={`tab-btn${tab===t.id?" active":""}`} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>

      {tab === "overview" && (
        <div>
          <div className="grid-3" style={{ marginBottom:32 }}>
            {[{ label:"Clubs Viewed Profile",val:revealCount,accent:true },{ label:"Videos",val:videos.length,accent:false },{ label:"Career Clubs",val:career.length,accent:false }].map(s => (
              <div key={s.label} className="card" style={{ textAlign:"center" }}>
                <div style={{ fontFamily:"var(--font-display)", fontWeight:900, fontSize:"3rem", color:s.accent?"var(--accent)":"var(--white)", lineHeight:1 }}>{s.val}</div>
                <div style={{ fontSize:"0.8rem", color:"var(--muted)", marginTop:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
            <div className="card">
              <div className="section-label" style={{ marginBottom:12 }}>Profile Completeness</div>
              {[{ label:"Bio",done:!!player.bio },{ label:"Photo",done:!!player.photoUrl },{ label:"Career history",done:career.length>0 },{ label:"Videos added",done:videos.length>0 },{ label:"Contact info",done:!!player.phone||!!player.agentEmail },{ label:"Salary expectation",done:!!player.expectedSalary }].map(item => (
                <div key={item.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
                  <span style={{ fontSize:"0.85rem", color:item.done?"var(--white)":"var(--muted)" }}>{item.label}</span>
                  <span style={{ color:item.done?"#00c864":"var(--muted)" }}>{item.done?"✓":"○"}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="section-label" style={{ marginBottom:12 }}>Quick Actions</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <button className="btn btn-primary" onClick={() => setTab("profile")} style={{ justifyContent:"center" }}>Edit Profile Info</button>
                <button className="btn btn-outline" onClick={() => setTab("videos")} style={{ justifyContent:"center" }}>Add Videos</button>
                <button className="btn btn-outline" onClick={() => setTab("career")} style={{ justifyContent:"center" }}>Add Career Entry</button>
                <Link href={`/players/${player.slug}`} className="btn btn-ghost" style={{ justifyContent:"center", textAlign:"center" }}>Preview Public Profile →</Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "profile" && (
        <div style={{ maxWidth:700 }}>
          {msg && <div style={{ padding:"12px 16px", borderRadius:"var(--radius)", marginBottom:20, fontSize:"0.9rem", background:msg.startsWith("✓")?"rgba(0,200,100,0.1)":"rgba(255,59,59,0.1)", border:`1px solid ${msg.startsWith("✓")?"rgba(0,200,100,0.3)":"rgba(255,59,59,0.3)"}`, color:msg.startsWith("✓")?"#00c864":"var(--red)" }}>{msg}</div>}
          <div className="card" style={{ marginBottom:20 }}>
            <h4 style={{ textTransform:"uppercase", marginBottom:20, fontSize:"0.9rem" }}>Personal Information</h4>
            <div className="grid-2">
              <div className="form-group"><label className="label">First Name</label><input className="input" value={profile.firstName} onChange={e => setP("firstName",e.target.value)} /></div>
              <div className="form-group"><label className="label">Last Name</label><input className="input" value={profile.lastName} onChange={e => setP("lastName",e.target.value)} /></div>
              <div className="form-group"><label className="label">Nationality</label><input className="input" value={profile.nationality} onChange={e => setP("nationality",e.target.value)} /></div>
              <div className="form-group"><label className="label">Position</label><select className="input" value={profile.position} onChange={e => setP("position",e.target.value)}>{POSITIONS.map(p => <option key={p} value={p}>{p.replace(/_/g," ")}</option>)}</select></div>
              <div className="form-group"><label className="label">Height (cm)</label><input className="input" type="number" value={profile.heightCm} onChange={e => setP("heightCm",+e.target.value)} /></div>
              <div className="form-group"><label className="label">Weight (kg)</label><input className="input" type="number" value={profile.weightKg} onChange={e => setP("weightKg",+e.target.value)} /></div>
              <div className="form-group"><label className="label">Dominant Hand</label><select className="input" value={profile.dominantHand} onChange={e => setP("dominantHand",e.target.value)}><option value="RIGHT">Right</option><option value="LEFT">Left</option></select></div>
              <div className="form-group"><label className="label">Current Club</label><input className="input" value={profile.currentClub} onChange={e => setP("currentClub",e.target.value)} placeholder="FC Barcelona or Free Agent" /></div>
            </div>
            <div className="form-group"><label className="label">Bio</label><textarea className="input" rows={4} value={profile.bio} onChange={e => setP("bio",e.target.value)} placeholder="Tell clubs about yourself…" style={{ resize:"vertical", lineHeight:1.6 }} /></div>
            <div className="form-group"><label className="label">Expected Annual Salary (€)</label><input className="input" type="number" value={profile.expectedSalary} onChange={e => setP("expectedSalary",e.target.value)} placeholder="80000" /></div>
          </div>
          <div className="card" style={{ marginBottom:20 }}>
            <h4 style={{ textTransform:"uppercase", marginBottom:20, fontSize:"0.9rem" }}>Contact Details <span style={{ fontSize:"0.7rem", color:"var(--muted)", fontWeight:400, textTransform:"none" }}>(revealed after club accepts ToS)</span></h4>
            <div className="grid-2">
              <div className="form-group"><label className="label">Direct Phone</label><input className="input" value={profile.phone} onChange={e => setP("phone",e.target.value)} placeholder="+385 91 234 5678" /></div>
              <div className="form-group"><label className="label">Agent Name</label><input className="input" value={profile.agentName} onChange={e => setP("agentName",e.target.value)} /></div>
              <div className="form-group"><label className="label">Agent Phone</label><input className="input" value={profile.agentPhone} onChange={e => setP("agentPhone",e.target.value)} /></div>
              <div className="form-group"><label className="label">Agent Email</label><input className="input" type="email" value={profile.agentEmail} onChange={e => setP("agentEmail",e.target.value)} /></div>
            </div>
          </div>
          <button className="btn btn-primary" onClick={saveProfile} disabled={saving} style={{ minWidth:160, justifyContent:"center" }}>
            {saving ? <><span className="spinner" /> Saving…</> : "Save Profile"}
          </button>
        </div>
      )}

      {tab === "career" && (
        <div>
          <div className="card" style={{ marginBottom:24 }}>
            <h4 style={{ textTransform:"uppercase", marginBottom:16, fontSize:"0.9rem" }}>Add Career Entry</h4>
            <div className="grid-2">
              <div className="form-group"><label className="label">Club Name</label><input className="input" value={newCareer.clubName} onChange={e => setNewCareer(c => ({ ...c, clubName:e.target.value }))} placeholder="RK Zagreb" /></div>
              <div className="form-group"><label className="label">Country</label><input className="input" value={newCareer.country} onChange={e => setNewCareer(c => ({ ...c, country:e.target.value }))} placeholder="Croatia" /></div>
              <div className="form-group"><label className="label">Start Date</label><input className="input" type="date" value={newCareer.startDate} onChange={e => setNewCareer(c => ({ ...c, startDate:e.target.value }))} /></div>
              <div className="form-group"><label className="label">End Date</label><input className="input" type="date" value={newCareer.endDate} onChange={e => setNewCareer(c => ({ ...c, endDate:e.target.value }))} /></div>
              <div className="form-group"><label className="label">Appearances</label><input className="input" type="number" value={newCareer.appearances} onChange={e => setNewCareer(c => ({ ...c, appearances:e.target.value }))} /></div>
              <div className="form-group"><label className="label">Goals</label><input className="input" type="number" value={newCareer.goals} onChange={e => setNewCareer(c => ({ ...c, goals:e.target.value }))} /></div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <input type="checkbox" id="isCurrent" checked={newCareer.isCurrentClub} onChange={e => setNewCareer(c => ({ ...c, isCurrentClub:e.target.checked }))} style={{ accentColor:"var(--accent)", width:16, height:16 }} />
              <label htmlFor="isCurrent" className="label" style={{ margin:0 }}>Current Club</label>
            </div>
            <button className="btn btn-primary" onClick={addCareer}>Add Entry</button>
          </div>
          {career.length === 0 ? <div style={{ color:"var(--muted)" }}>No career entries yet.</div> : (
            <div className="timeline">
              {career.map((e: any) => (
                <div key={e.id} className={`timeline-item${e.isCurrentClub?" current":""}`}>
                  <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"1.1rem", textTransform:"uppercase" }}>{e.clubName}{e.isCurrentClub && <span className="badge badge-green" style={{ marginLeft:8 }}>Current</span>}</div>
                  <div style={{ fontSize:"0.85rem", color:"var(--muted)" }}>{e.country} · {new Date(e.startDate).getFullYear()} — {e.endDate?new Date(e.endDate).getFullYear():"Present"}</div>
                  {(e.appearances||e.goals) && <div style={{ display:"flex", gap:16, marginTop:8 }}>{e.appearances!=null&&<span style={{ fontSize:"0.8rem" }}><strong style={{ color:"var(--accent)" }}>{e.appearances}</strong> <span style={{ color:"var(--muted)" }}>apps</span></span>}{e.goals!=null&&<span style={{ fontSize:"0.8rem" }}><strong style={{ color:"var(--accent)" }}>{e.goals}</strong> <span style={{ color:"var(--muted)" }}>goals</span></span>}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "videos" && (
        <div>
          <div className="card" style={{ marginBottom:24 }}>
            <h4 style={{ textTransform:"uppercase", marginBottom:16, fontSize:"0.9rem" }}>Add YouTube Video</h4>
            <div className="form-group"><label className="label">Title</label><input className="input" value={newVideo.title} onChange={e => setNewVideo(v => ({ ...v, title:e.target.value }))} placeholder="Highlights vs THW Kiel 2024" /></div>
            <div className="form-group"><label className="label">YouTube URL</label><input className="input" value={newVideo.youtubeUrl} onChange={e => setNewVideo(v => ({ ...v, youtubeUrl:e.target.value }))} placeholder="https://youtube.com/watch?v=..." /></div>
            <div className="form-group"><label className="label">Description</label><input className="input" value={newVideo.description} onChange={e => setNewVideo(v => ({ ...v, description:e.target.value }))} /></div>
            <button className="btn btn-primary" onClick={addVideo}>Add Video</button>
          </div>
          {videos.length === 0 ? <div style={{ color:"var(--muted)" }}>No videos yet.</div> : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:20 }}>
              {videos.map((v: any) => {
                const ytId = v.youtubeUrl?.match(/(?:youtu\.be\/|v=)([^&?]+)/)?.[1];
                return (
                  <div key={v.id} className="card" style={{ padding:0, overflow:"hidden" }}>
                    {ytId && <div style={{ position:"relative", paddingBottom:"56.25%" }}><iframe src={`https://www.youtube.com/embed/${ytId}`} style={{ position:"absolute", inset:0, width:"100%", height:"100%", border:"none" }} allowFullScreen title={v.title} /></div>}
                    <div style={{ padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div><div style={{ fontFamily:"var(--font-display)", fontWeight:700, textTransform:"uppercase", fontSize:"0.9rem" }}>{v.title}</div></div>
                      <button onClick={() => deleteVideo(v.id)} style={{ background:"none", border:"none", color:"var(--muted)", cursor:"pointer" }}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "medical" && (
        <div>
          <div className="card" style={{ marginBottom:24 }}>
            <h4 style={{ textTransform:"uppercase", marginBottom:16, fontSize:"0.9rem" }}>Add Medical Record</h4>
            <div className="grid-2">
              <div className="form-group"><label className="label">Record Type</label><select className="input" value={newMedical.recordType} onChange={e => setNewMedical(m => ({ ...m, recordType:e.target.value }))}><option value="PHYSICAL_TEST">Physical Test</option><option value="INJURY">Injury</option><option value="CLEARANCE">Clearance</option></select></div>
              {newMedical.recordType === "PHYSICAL_TEST" ? <>
                <div className="form-group"><label className="label">Test Name</label><input className="input" value={newMedical.testName} onChange={e => setNewMedical(m => ({ ...m, testName:e.target.value }))} placeholder="Yo-Yo Test" /></div>
                <div className="form-group"><label className="label">Result</label><input className="input" value={newMedical.testResult} onChange={e => setNewMedical(m => ({ ...m, testResult:e.target.value }))} /></div>
                <div className="form-group"><label className="label">Unit</label><input className="input" value={newMedical.testUnit} onChange={e => setNewMedical(m => ({ ...m, testUnit:e.target.value }))} placeholder="ml/kg/min" /></div>
              </> : <>
                <div className="form-group"><label className="label">Injury Type</label><input className="input" value={newMedical.injuryType} onChange={e => setNewMedical(m => ({ ...m, injuryType:e.target.value }))} /></div>
                <div className="form-group"><label className="label">Body Part</label><input className="input" value={newMedical.bodyPart} onChange={e => setNewMedical(m => ({ ...m, bodyPart:e.target.value }))} /></div>
              </>}
            </div>
            <div className="form-group"><label className="label">Notes</label><textarea className="input" rows={3} value={newMedical.notes} onChange={e => setNewMedical(m => ({ ...m, notes:e.target.value }))} style={{ resize:"vertical" }} /></div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <input type="checkbox" id="visible" checked={newMedical.isVisibleToClubs} onChange={e => setNewMedical(m => ({ ...m, isVisibleToClubs:e.target.checked }))} style={{ accentColor:"var(--accent)", width:16, height:16 }} />
              <label htmlFor="visible" className="label" style={{ margin:0 }}>Visible to clubs</label>
            </div>
            <button className="btn btn-primary" onClick={addMedical}>Add Record</button>
          </div>
          {medical.length === 0 ? <div style={{ color:"var(--muted)" }}>No medical records yet.</div> : (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {medical.map((r: any) => (
                <div key={r.id} className="card" style={{ display:"flex", justifyContent:"space-between" }}>
                  <div>
                    <span className={`badge ${r.recordType==="INJURY"?"badge-red":r.recordType==="PHYSICAL_TEST"?"badge-blue":"badge-green"}`} style={{ marginRight:8 }}>{r.recordType.replace("_"," ")}</span>
                    <span style={{ fontFamily:"var(--font-display)", fontWeight:700, textTransform:"uppercase" }}>{r.testName??r.injuryType??"Record"}</span>
                    {r.testResult && <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"1.4rem", color:"var(--accent)", marginTop:4 }}>{r.testResult} <span style={{ fontSize:"0.8rem", color:"var(--muted)" }}>{r.testUnit}</span></div>}
                  </div>
                  {r.isVisibleToClubs ? <span className="badge badge-green">Visible</span> : <span className="badge badge-muted">Private</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "visibility" && (
        <div style={{ maxWidth:500 }}>
          <div className="card">
            <h4 style={{ textTransform:"uppercase", marginBottom:20 }}>Availability Status</h4>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 0", borderBottom:"1px solid var(--border)" }}>
              <div>
                <div style={{ fontWeight:500, marginBottom:4 }}>Available for Transfer</div>
                <div style={{ fontSize:"0.8rem", color:"var(--muted)" }}>Clubs can find and contact you</div>
              </div>
              <div onClick={async () => { const next=!profile.isAvailable; setP("isAvailable",next); await fetch("/api/player/profile",{ method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ ...profile, isAvailable:next }) }); }} style={{ width:48, height:26, borderRadius:13, cursor:"pointer", background:profile.isAvailable?"var(--accent)":"var(--border)", position:"relative", transition:"background 0.2s" }}>
                <div style={{ width:20, height:20, borderRadius:"50%", background:profile.isAvailable?"var(--black)":"var(--muted)", position:"absolute", top:3, left:profile.isAvailable?25:3, transition:"left 0.2s" }} />
              </div>
            </div>
            <div style={{ paddingTop:20, fontSize:"0.85rem", color:"var(--muted)", lineHeight:1.7 }}>
              Public profile: <Link href={`/players/${player.slug}`} style={{ color:"var(--accent)" }}>/players/{player.slug}</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
