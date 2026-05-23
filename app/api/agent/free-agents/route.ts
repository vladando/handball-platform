import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agent = await prisma.agent.findUnique({
    where: { userId: (session.user as any).id },
    select: { id: true },
  });
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  // Get all free agent players (no agentId, onboarding completed)
  const players = await prisma.player.findMany({
    where: {
      agentId: null,
      onboardingCompleted: true,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      position: true,
      nationality: true,
      heightCm: true,
      weightKg: true,
      photoUrl: true,
      slug: true,
      expectedSalaryMin: true,
      expectedSalaryMax: true,
      currentClub: true,
      availableFrom: true,
      isAvailable: true,
      verificationStatus: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Fetch this agent's existing requests so we can mark status
  const existingRequests = await (prisma as any).representationRequest.findMany({
    where: { agentId: agent.id },
    select: { playerId: true, status: true, id: true },
  });
  const requestMap: Record<string, { id: string; status: string }> = {};
  for (const r of existingRequests) {
    requestMap[r.playerId] = { id: r.id, status: r.status };
  }

  const result = players.map((p) => ({
    ...p,
    requestStatus: requestMap[p.id]?.status ?? null,
    requestId: requestMap[p.id]?.id ?? null,
  }));

  return NextResponse.json({ players: result });
}
