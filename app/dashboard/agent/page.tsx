import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AgentDashboardClient from "./AgentDashboardClient";

export default async function AgentDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT") redirect("/auth/login");

  const agent = await prisma.agent.findUnique({
    where: { userId: (session.user as any).id },
    include: {
      players: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true, firstName: true, lastName: true, photoUrl: true,
          position: true, nationality: true, currentClub: true,
          verificationStatus: true, isAvailable: true, slug: true,
          dateOfBirth: true, heightCm: true, weightKg: true,
          dominantHand: true, bio: true, phone: true,
          expectedSalaryMin: true, expectedSalaryMax: true,
          achievements: true, defensivePosition: true, createdAt: true,
          onboardingCompleted: true,
        },
      },
    },
  });

  if (!agent) redirect("/auth/login");
  if (!agent.onboardingCompleted) redirect("/onboarding/agent");

  return <AgentDashboardClient agent={agent as any} />;
}
