import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") redirect("/");

  const [users, clubs, players, interactions] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, email: true, role: true,
        registrationIp: true, createdAt: true,
        player: { select: { firstName: true, lastName: true } },
        club:   { select: { name: true } },
      },
    }).catch(() => []),
    prisma.club.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true, registrationIp: true } } },
    }).catch(() => []),
    prisma.player.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true, registrationIp: true } } },
    }).catch((err: unknown) => { console.error(err); return []; }),
    prisma.interaction.findMany({
      orderBy: { createdAt: "desc" }, take: 200,
      include: { club: true, player: true },
    }).catch(() => []),
  ]);

  const stats = {
    totalUsers:          users.length,
    totalClubs:          clubs.length,
    totalPlayers:        players.length,
    pendingVerification: players.filter((p: any) => p.verificationStatus === "PENDING").length,
    pendingClubs:        clubs.filter((c: any) => c.verificationStatus === "PENDING").length,
  };

  return (
    <main className="page">
      <div className="sidebar-layout">
        <aside className="sidebar">
          <div style={{ padding: "0 24px 20px", borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", textTransform: "uppercase" }}>Admin Panel</div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 4 }}>HandballHub Management</div>
          </div>
          <div className="sidebar-section">Management</div>
          <ul className="sidebar-nav">
            {[
              { label: "Overview",   icon: "⊞" },
              { label: `Users (${users.length})`,   icon: "👥" },
              { label: `Players (${players.length})`, icon: "👤" },
              { label: `Verify Players${stats.pendingVerification > 0 ? ` ⚠${stats.pendingVerification}` : ""}`, icon: "✅" },
              { label: `Clubs (${stats.pendingClubs} pending)`, icon: "🏟" },
              { label: "Commission Log", icon: "📋" },
            ].map(item => (
              <li key={item.label}><a href="#"><span>{item.icon}</span> {item.label}</a></li>
            ))}
          </ul>
        </aside>
        <div className="main-content">
          <AdminClient
            users={users as any}
            clubs={clubs as any}
            players={players as any}
            interactions={interactions as any}
            stats={stats}
          />
        </div>
      </div>
    </main>
  );
}
