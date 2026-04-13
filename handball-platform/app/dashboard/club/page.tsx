import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ClubDashboardClient from "./ClubDashboardClient";

export default async function ClubDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "CLUB") redirect("/auth/login");
  const club = await prisma.club.findUnique({
    where: { userId:(session.user as any).id },
    include: {
      watchlist: { include:{ player:true }, orderBy:{ addedAt:"desc" } },
      interactions: { include:{ player:true }, orderBy:{ createdAt:"desc" }, take:50 },
    },
  }).catch(() => null);
  if (!club) redirect("/auth/register?role=CLUB");
  const stats = { watchlist:club.watchlist.length, reveals:club.interactions.length, pending:club.interactions.filter((i:any) => i.commissionStatus==="PENDING").length };

  return (
    <main className="page">
      <div className="sidebar-layout">
        <aside className="sidebar">
          <div style={{ padding:"0 24px 20px", borderBottom:"1px solid var(--border)", marginBottom:8 }}>
            <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"1rem", textTransform:"uppercase" }}>{club.name}</div>
            <div style={{ fontSize:"0.8rem", color:"var(--muted)", marginTop:4 }}>{club.city}, {club.country}</div>
            <div style={{ marginTop:8 }}>{club.verificationStatus==="VERIFIED"?<span className="badge badge-green">✓ Verified</span>:<span className="badge badge-red">Pending Verification</span>}</div>
          </div>
          <div className="sidebar-section">Navigation</div>
          <ul className="sidebar-nav">
            {[{ id:"overview",label:"Overview",icon:"⊞" },{ id:"search",label:"Player Search",icon:"🔍" },{ id:"watchlist",label:`Watchlist (${stats.watchlist})`,icon:"★" },{ id:"interactions",label:"Interactions",icon:"📋" },{ id:"settings",label:"Settings",icon:"⚙" }].map(item => (
              <li key={item.id}><a href="#"><span>{item.icon}</span> {item.label}</a></li>
            ))}
          </ul>
        </aside>
        <div className="main-content"><ClubDashboardClient club={club as any} stats={stats} /></div>
      </div>
    </main>
  );
}
