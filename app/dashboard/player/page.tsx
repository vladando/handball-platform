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
    include: {
      videos: { orderBy: { sortOrder: "asc" } },
      careerEntries: { orderBy: { startDate: "desc" } },
      medicalRecords: { orderBy: { createdAt: "desc" } },
      galleryImages: { orderBy: { sortOrder: "asc" } },
      user: { select: { email: true } },
    },
  }).catch((err: unknown) => {
    console.error("[dashboard/player] Prisma error:", err);
    return null;
  });

  if (!player) {
    console.warn("[dashboard/player] No player found for userId:", (session.user as any).id);
    redirect("/auth/register?role=PLAYER");
  }

  const revealCount = await prisma.interaction.count({ where: { playerId: player.id } }).catch(() => 0);

  return <PlayerDashboardClient player={player as any} revealCount={revealCount} />;
}
