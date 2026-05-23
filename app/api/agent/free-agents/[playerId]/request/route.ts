import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agent = await prisma.agent.findUnique({
    where: { userId: (session.user as any).id },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const { playerId } = await params;

  // Verify the player exists, has no agent and completed onboarding
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, agentId: true, onboardingCompleted: true, firstName: true, lastName: true },
  });
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });
  if (!player.onboardingCompleted) return NextResponse.json({ error: "Player has not completed onboarding" }, { status: 400 });
  if (player.agentId) return NextResponse.json({ error: "Player already has an agent" }, { status: 409 });

  const { message } = await req.json().catch(() => ({}));

  // Upsert: if request already exists and was rejected, allow re-sending
  const existing = await (prisma as any).representationRequest.findUnique({
    where: { agentId_playerId: { agentId: agent.id, playerId } },
  });

  if (existing) {
    if (existing.status === "PENDING") {
      return NextResponse.json({ error: "Request already pending" }, { status: 409 });
    }
    if (existing.status === "ACCEPTED") {
      return NextResponse.json({ error: "Request already accepted" }, { status: 409 });
    }
    // If REJECTED, allow re-sending
    const updated = await (prisma as any).representationRequest.update({
      where: { id: existing.id },
      data: { status: "PENDING", message: message?.trim() ?? null, respondedAt: null, createdAt: new Date() },
    });
    return NextResponse.json({ request: updated });
  }

  const request = await (prisma as any).representationRequest.create({
    data: {
      agentId: agent.id,
      playerId,
      message: message?.trim() ?? null,
      status: "PENDING",
    },
  });

  return NextResponse.json({ request }, { status: 201 });
}
