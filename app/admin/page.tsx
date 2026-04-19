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
      include: {
        user: { select: { email: true, registrationIp: true } },
        searchLogs: { orderBy: { searchedAt: "asc" }, take: 100 },
        watchlist: { include: { player: { select: { firstName: true, lastName: true, slug: true } } } },
      },
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
      <AdminClient
        users={users as any}
        clubs={clubs as any}
        players={players as any}
        interactions={interactions as any}
        stats={stats}
      />
    </main>
  );
}
