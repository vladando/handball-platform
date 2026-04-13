import Link from "next/link";
import { prisma } from "@/lib/prisma";

const POS_SHORT: Record<string, string> = {
  GOALKEEPER:"GK",LEFT_BACK:"LB",RIGHT_BACK:"RB",LEFT_WING:"LW",
  RIGHT_WING:"RW",CENTRE_BACK:"CB",PIVOT:"PV",CENTRE_FORWARD:"CF",
};

async function getData() {
  try {
    const [players, clubs, interactions] = await Promise.all([
      prisma.player.findMany({ where:{ isAvailable:true }, take:6, orderBy:{ createdAt:"desc" } }),
      prisma.club.count({ where:{ verificationStatus:"VERIFIED" } }),
      prisma.interaction.count(),
    ]);
    const playerCount = await prisma.player.count({ where:{ isAvailable:true } });
    return { players, stats:{ players: playerCount, clubs, interactions } };
  } catch { return { players:[], stats:{ players:0, clubs:0, interactions:0 } }; }
}

export default async function HomePage() {
  const { players, stats } = await getData();

  return (
    <main className="page">
      {/* Hero */}
      <section style={{ position:"relative", overflow:"hidden", padding:"100px 0 80px", borderBottom:"1px solid var(--border)" }}>
        <div className="container" style={{ position:"relative", zIndex:1 }}>
          <div className="section-label">Professional Handball Transfers</div>
          <h1 style={{ maxWidth:700, marginBottom:24 }}>Find Your<br /><span style={{ color:"var(--accent)" }}>Next Move</span></h1>
          <p style={{ fontSize:"1.15rem", color:"var(--muted)", maxWidth:520, marginBottom:40, lineHeight:1.7 }}>
            The marketplace where elite handball players meet top clubs. Verified profiles, direct contact, full transparency.
          </p>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            <Link href="/players" className="btn btn-primary" style={{ fontSize:"1rem", padding:"14px 32px" }}>Browse Players</Link>
            <Link href="/auth/register?role=CLUB" className="btn btn-outline">Register Your Club</Link>
          </div>
          <div style={{ display:"flex", gap:48, marginTop:64, flexWrap:"wrap" }}>
            {[{ num:stats.players, label:"Available Players" },{ num:stats.clubs, label:"Verified Clubs" },{ num:stats.interactions, label:"Connections Made" }].map(s => (
              <div key={s.label} style={{ textAlign:"left" }}>
                <div style={{ fontFamily:"var(--font-display)", fontWeight:900, fontSize:"3.5rem", color:"var(--accent)", lineHeight:1 }}>{s.num}</div>
                <div style={{ fontSize:"0.8rem", color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.1em", marginTop:4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="hero-number">7</div>
        <div style={{ position:"absolute", top:0, left:0, right:0, bottom:0, background:"radial-gradient(ellipse at 30% 50%, rgba(232,255,71,0.04) 0%, transparent 60%)", pointerEvents:"none" }} />
      </section>

      {/* Featured Players */}
      <section style={{ padding:"80px 0" }}>
        <div className="container">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:40 }}>
            <div>
              <div className="section-label">Marketplace</div>
              <h2>Featured Players</h2>
            </div>
            <Link href="/players" className="btn btn-outline" style={{ fontSize:"0.85rem" }}>View All →</Link>
          </div>
          {players.length === 0 ? (
            <div style={{ textAlign:"center", padding:"80px 0", color:"var(--muted)" }}>
              <div style={{ fontSize:"3rem", marginBottom:16 }}>🏐</div>
              <p>No players listed yet.</p>
              <Link href="/auth/register?role=PLAYER" className="btn btn-primary" style={{ marginTop:24 }}>Create Player Profile</Link>
            </div>
          ) : (
            <div className="grid-3">
              {players.map((p: any) => (
                <Link key={p.id} href={`/players/${p.slug}`} className="player-card">
                  <div className="player-card-photo">
                    {p.photoUrl ? <img src={p.photoUrl} alt={p.firstName} style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : <span style={{ fontSize:"3.5rem", zIndex:1 }}>🏐</span>}
                    <div style={{ position:"absolute", top:12, left:12, zIndex:2 }}><span className="pos-pill">{POS_SHORT[p.position]}</span></div>
                    <div style={{ position:"absolute", top:12, right:12, zIndex:2 }}><span className="badge badge-green">● Available</span></div>
                  </div>
                  <div className="player-card-body">
                    <div className="player-card-name">{p.firstName} {p.lastName}</div>
                    <div style={{ fontSize:"0.85rem", color:"var(--muted)" }}>{p.nationality} · {p.currentClub ?? "Free Agent"}</div>
                    {p.expectedSalary && <div style={{ marginTop:8 }}><span className="badge badge-accent">€{Math.round(p.expectedSalary/100).toLocaleString()}/yr</span></div>}
                  </div>
                  <div className="player-card-stats">
                    <div className="player-card-stat"><div className="val">{p.heightCm}</div><div className="key">cm</div></div>
                    <div className="player-card-stat"><div className="val">{p.weightKg}</div><div className="key">kg</div></div>
                    <div className="player-card-stat"><div className="val">{new Date().getFullYear()-new Date(p.dateOfBirth).getFullYear()}</div><div className="key">age</div></div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding:"80px 0", borderTop:"1px solid var(--border)", background:"var(--card)" }}>
        <div className="container">
          <div style={{ textAlign:"center", marginBottom:60 }}>
            <div className="section-label" style={{ justifyContent:"center" }}>Platform</div>
            <h2>How It Works</h2>
          </div>
          <div className="grid-3">
            {[
              { icon:"👤", num:"01", title:"Create Profile", desc:"Players build their profile free — bio, stats, video vault, career history, medical records." },
              { icon:"🔍", num:"02", title:"Clubs Search", desc:"Verified clubs use advanced filters — position, height, salary, nationality — to find the perfect match." },
              { icon:"⚡", num:"03", title:"Reveal & Connect", desc:"Clubs unlock contact details in one click. A 5% commission on signed transfers keeps the platform running." },
            ].map(step => (
              <div key={step.num} className="card" style={{ position:"relative", overflow:"hidden" }}>
                <div style={{ fontSize:"0.7rem", fontFamily:"var(--font-mono)", color:"var(--accent)", letterSpacing:"0.1em", marginBottom:16 }}>{step.num}</div>
                <div style={{ fontSize:"2.5rem", marginBottom:16 }}>{step.icon}</div>
                <h4 style={{ textTransform:"uppercase", marginBottom:10 }}>{step.title}</h4>
                <p style={{ color:"var(--muted)", fontSize:"0.9rem", lineHeight:1.7 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:"100px 0", textAlign:"center" }}>
        <div className="container">
          <div className="section-label" style={{ justifyContent:"center" }}>Join Today — Free</div>
          <h2 style={{ marginBottom:20 }}>Ready to Find<br /><span style={{ color:"var(--accent)" }}>Your Club?</span></h2>
          <p style={{ color:"var(--muted)", marginBottom:40, maxWidth:400, margin:"0 auto 40px" }}>Players join for free. Clubs get a 14-day trial.</p>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
            <Link href="/auth/register?role=PLAYER" className="btn btn-primary" style={{ fontSize:"1rem", padding:"14px 32px" }}>I'm a Player</Link>
            <Link href="/auth/register?role=CLUB" className="btn btn-outline" style={{ fontSize:"1rem", padding:"14px 32px" }}>I Represent a Club</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop:"1px solid var(--border)", padding:"32px 0" }}>
        <div className="container" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16 }}>
          <div style={{ fontFamily:"var(--font-display)", fontWeight:900, fontSize:"1.2rem", textTransform:"uppercase" }}>Handball<span style={{ color:"var(--accent)" }}>Hub</span></div>
          <div style={{ fontSize:"0.8rem", color:"var(--muted)" }}>© {new Date().getFullYear()} HandballHub · 5% commission on completed transfers</div>
          <div style={{ display:"flex", gap:24 }}>
            {["Terms","Privacy","Contact"].map(l => <Link key={l} href="#" style={{ fontSize:"0.8rem", color:"var(--muted)" }}>{l}</Link>)}
          </div>
        </div>
      </footer>
    </main>
  );
}
