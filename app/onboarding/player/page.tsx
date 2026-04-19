import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import PlayerOnboardingClient from "./PlayerOnboardingClient";

export default async function PlayerOnboardingPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "PLAYER") redirect("/auth/login");

  const userId = (session.user as any).id;
  const player = await prisma.player.findUnique({
    where: { userId },
    select: {
      firstName: true, lastName: true,
      dateOfBirth: true, nationality: true, bio: true,
      position: true, dominantHand: true,
      heightCm: true, weightKg: true,
      phone: true, isAvailable: true,
      currentClub: true,
      expectedSalaryMin: true, expectedSalaryMax: true,
      agentName: true, agentPhone: true, agentEmail: true,
      achievements: true, defensivePosition: true,
      photoUrl: true,
      onboardingCompleted: true,
      slug: true,
    },
  });

  if (!player) redirect("/auth/login");
  // If already completed, send to dashboard
  if (player.onboardingCompleted) redirect("/dashboard/player");

  return <PlayerOnboardingClient player={player} />;
}
