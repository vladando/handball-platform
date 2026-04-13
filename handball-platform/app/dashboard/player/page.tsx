import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PlayerDashboardClient from "./PlayerDashboardClient";

export default async function PlayerDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "PLAYER") redirect("/auth/login");
  const player = await prisma.player.findUnique({
    where: { userId: (session.user as any).id },
    include: { videos:{ orderBy:{ sortOrder:"asc" } }, careerEntries:{ orderBy:{ startDate:"desc" } }, medicalRecords:{ orderBy:{ createdAt:"desc" } } },
  }).catch(() => null);
  if (!player) redirect("/auth/register?role=PLAYER");
  const revealCount = await prisma.interaction.count({ where:{ playerId:player.id } }).catch(() => 0);

  return (
    <main className="page">
      <div className="sidebar-layout">
        <aside className="sidebar">
          <div style={{ padding:"0 24px 20px", borderBottom:"1px solid var(--border)", marginBottom:8 }}>
            <div style={{ width:56, height:56, borderRadius:"50%", background:"var(--card2)", border:"2px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.8rem", marginBottom:12, overflow:"hidden" }}>
              {player.photoUrl ? <img src={player.photoUrl} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="" /> : "🏐"}
            </div>
            <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"1rem", textTransform:"uppercase" }}>{player.firstName} {player.lastName}</div>
            <div style={{ fontSize:"0.8rem", color:"var(--muted)", marginTop:4 }}>{player.position.replace(/_/g," ")}</div>
            <div style={{ marginTop:8 }}>{player.isAvailable ? <span className="badge badge-green">● Available</span> : <span className="badge badge-muted">● Unavailable</span>}</div>
          </div>
          <div className="sidebar-section">My Profile</div>
          <ul className="sidebar-nav">
            {[{ id:"overview",label:"Overview",icon:"⊞" },{ id:"profile",label:"Edit Profile",icon:"👤" },{ id:"career",label:"Career History",icon:"📅" },{ id:"videos",label:"Video Vault",icon:"▶" },{ id:"medical",label:"Medical Records",icon:"⚕" },{ id:"visibility",label:"Visibility",icon:"👁" }].map(item => (
              <li key={item.id}><a href="#"><span>{item.icon}</span> {item.label}</a></li>
            ))}
          </ul>
        </aside>
        <div className="main-content"><PlayerDashboardClient player={player as any} revealCount={revealCount} /></div>
      </div>
    </main>
  );
}
