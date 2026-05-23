import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import PlayerOnboardingClient from "@/app/onboarding/player/PlayerOnboardingClient";

export default async function AgentPlayerOnboardingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT") redirect("/auth/login");

  const { id: playerId } = await params;

  // Verify this agent owns the player
  const agent = await prisma.agent.findUnique({
    where: { userId: (session.user as any).id },
    select: { id: true },
  });
  if (!agent) redirect("/auth/login");

  const player = await prisma.player.findFirst({
    where: { id: playerId, agentId: agent.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      nationality: true,
      bio: true,
      position: true,
      dominantHand: true,
      heightCm: true,
      weightKg: true,
      phone: true,
      isAvailable: true,
      currentClub: true,
      expectedSalaryMin: true,
      expectedSalaryMax: true,
      agentName: true,
      agentPhone: true,
      agentEmail: true,
      achievements: true,
      defensivePosition: true,
      photoUrl: true,
      onboardingCompleted: true,
      slug: true,
    },
  });

  if (!player) redirect("/dashboard/agent");

  // If already completed onboarding, redirect to dashboard
  if (player.onboardingCompleted) redirect("/dashboard/agent");

  return <PlayerOnboardingClient player={player} agentPlayerId={playerId} />;
}
