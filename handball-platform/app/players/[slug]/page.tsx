import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import RevealContactButton from "@/components/RevealContactButton";
import PlayerProfileClient from "./PlayerProfileClient";

const POS_LABELS: Record<string,string> = {
  GOALKEEPER:"Goalkeeper",LEFT_BACK:"Left Back",RIGHT_BACK:"Right Back",
  LEFT_WING:"Left Wing",RIGHT_WING:"Right Wing",CENTRE_BACK:"Centre Back",
  PIVOT:"Pivot",CENTRE_FORWARD:"Centre Forward",
};

export default async function PlayerProfilePage({ params }: { params: any }) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  const player = await prisma.player.findUnique({
    where: { slug },
    include: {
      videos: { orderBy:{ sortOrder:"asc" } },
      careerEntries: { orderBy:{ startDate:"desc" } },
      medicalRecords: { where:{ isVisibleToClubs:true }, orderBy:{ createdAt:"desc" } },
    },
  }).catch(() => null);
  if (!player) notFound();

  const isClub = (session?.user as any)?.role === "CLUB";
  const age = new Date().getFullYear() - new Date(player.dateOfBirth).getFullYear();

  return (
    <main className="page">
      <div style={{ background:"var(--card)", borderBottom:"1px solid var(--border)", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 70% 50%, rgba(232,255,71,0.04) 0%, transparent 60%)" }} />
        <div className="container" style={{ paddingTop:48, paddingBottom:48, position:"relative", zIndex:1 }}>
          <div style={{ display:"grid", gridTemplateColumns:"auto 1fr auto", gap:32, alignItems:"center" }}>
            <div style={{ width:120, height:120, borderRadius:"50%", background:"var(--card2)", border:"3px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"3rem", overflow:"hidden", flexShrink:0 }}>
              {player.photoUrl ? <img src={player.photoUrl} alt={player.firstName} style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : "🏐"}
            </div>
            <div>
              <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8, flexWrap:"wrap" }}>
                <span className="pos-pill" style={{ fontSize:"0.75rem", padding:"4px 10px" }}>{POS_LABELS[player.position]}</span>
                {player.isAvailable && <span className="badge badge-green">● Available</span>}
              </div>
              <h1 style={{ fontSize:"clamp(2rem,5vw,3.5rem)", lineHeight:1, marginBottom:8 }}>{player.firstName}<br />{player.lastName}</h1>
              <div style={{ display:"flex", gap:16, flexWrap:"wrap", fontSize:"0.9rem", color:"var(--muted)" }}>
                <span>🌍 {player.nationality}</span>
                <span>🏟 {player.currentClub ?? "Free Agent"}</span>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,80px)", gap:1, background:"var(--border)", borderRadius:"var(--radius)", overflow:"hidden" }}>
              {[{ val:player.heightCm, key:"Height cm" },{ val:player.weightKg, key:"Weight kg" },{ val:age, key:"Age" }].map(s => (
                <div key={s.key} style={{ background:"var(--card2)", padding:"16px 10px", textAlign:"center" }}>
                  <div style={{ fontFamily:"var(--font-display)", fontWeight:900, fontSize:"1.8rem", color:"var(--accent)", lineHeight:1 }}>{s.val}</div>
                  <div style={{ fontSize:"0.65rem", color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.08em", marginTop:4 }}>{s.key}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop:40, paddingBottom:80 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:32, alignItems:"start" }}>
          <PlayerProfileClient player={player as any} />
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
            {isClub && (
              <div className="card">
                <h4 style={{ textTransform:"uppercase", marginBottom:16, fontSize:"0.9rem" }}>Contact Player</h4>
                <RevealContactButton playerId={player.id} playerName={`${player.firstName} ${player.lastName}`} />
              </div>
            )}
            {!session && (
              <div className="card" style={{ textAlign:"center" }}>
                <div style={{ fontSize:"2rem", marginBottom:12 }}>🔒</div>
                <p style={{ fontSize:"0.85rem", color:"var(--muted)", marginBottom:16 }}>Register your club to unlock contact details</p>
                <Link href="/auth/register?role=CLUB" className="btn btn-primary" style={{ width:"100%", justifyContent:"center", display:"flex" }}>Register Club</Link>
              </div>
            )}
            {player.expectedSalary && (
              <div className="card">
                <div className="section-label" style={{ marginBottom:8 }}>Salary Expectation</div>
                <div style={{ fontFamily:"var(--font-display)", fontWeight:900, fontSize:"2rem", color:"var(--accent)" }}>€{Math.round(player.expectedSalary/100).toLocaleString()}</div>
                <div style={{ fontSize:"0.8rem", color:"var(--muted)" }}>per year</div>
              </div>
            )}
            <div className="card">
              <div className="section-label" style={{ marginBottom:16 }}>Physical Profile</div>
              {[{ k:"Height", v:`${player.heightCm} cm` },{ k:"Weight", v:`${player.weightKg} kg` },{ k:"Dominant Hand", v:player.dominantHand },{ k:"Date of Birth", v:new Date(player.dateOfBirth).toLocaleDateString() }].map(row => (
                <div key={row.k} style={{ display:"flex", justifyContent:"space-between", fontSize:"0.85rem", paddingBottom:10, borderBottom:"1px solid var(--border)", marginBottom:10 }}>
                  <span style={{ color:"var(--muted)" }}>{row.k}</span>
                  <span style={{ fontFamily:"var(--font-mono)", fontWeight:500 }}>{row.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
