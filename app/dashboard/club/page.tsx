import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ClubDashboardClient from "./ClubDashboardClient";

export default async function ClubDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "CLUB") redirect("/auth/login");

  const club = await prisma.club.findUnique({
    where: { userId: (session.user as any).id },
    include: {
      watchlist: { include: { player: true }, orderBy: { addedAt: "desc" } },
      interactions: { include: { player: true }, orderBy: { createdAt: "desc" }, take: 50 },
    },
  }).catch((err) => { console.error("[ClubDashboard] Prisma error:", err?.message ?? err); return null; });

  if (!club) redirect("/auth/register?role=CLUB");

  const stats = {
    watchlist: club.watchlist.length,
    reveals: club.interactions.length,
    pending: club.interactions.filter((i: any) => i.commissionStatus === "PENDING").length,
  };

  return <ClubDashboardClient club={club as any} stats={stats} />;
}
