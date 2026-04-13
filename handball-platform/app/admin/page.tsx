import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session||(session.user as any).role!=="ADMIN") redirect("/");
  const [clubs, players, interactions] = await Promise.all([
    prisma.club.findMany({ orderBy:{ createdAt:"desc" }, include:{ user:{ select:{ email:true } } } }).catch(() => []),
    prisma.player.findMany({ orderBy:{ createdAt:"desc" }, take:100 }).catch(() => []),
    prisma.interaction.findMany({ orderBy:{ createdAt:"desc" }, take:200, include:{ club:true, player:true } }).catch(() => []),
  ]);
  const stats = { totalClubs:clubs.length, pendingClubs:clubs.filter((c:any)=>c.verificationStatus==="PENDING").length, totalPlayers:players.length, pendingCommission:interactions.filter((i:any)=>i.commissionStatus==="PENDING").length };
  return (
    <main className="page">
      <div className="sidebar-layout">
        <aside className="sidebar">
          <div style={{ padding:"0 24px 20px", borderBottom:"1px solid var(--border)", marginBottom:8 }}>
            <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"1rem", textTransform:"uppercase" }}>Admin Panel</div>
            <div style={{ fontSize:"0.75rem", color:"var(--muted)", marginTop:4 }}>HandballHub Management</div>
          </div>
          <div className="sidebar-section">Management</div>
          <ul className="sidebar-nav">
            {[{ id:"overview",label:"Overview",icon:"⊞" },{ id:"clubs",label:`Clubs (${stats.pendingClubs} pending)`,icon:"🏟" },{ id:"players",label:"Players",icon:"👤" },{ id:"interactions",label:"Commission Log",icon:"📋" }].map(item => (
              <li key={item.id}><a href="#"><span>{item.icon}</span> {item.label}</a></li>
            ))}
          </ul>
        </aside>
        <div className="main-content">
          <AdminClient clubs={clubs as any} players={players as any} interactions={interactions as any} stats={stats} />
        </div>
      </div>
    </main>
  );
}
