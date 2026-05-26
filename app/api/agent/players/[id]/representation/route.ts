// DELETE — agent terminates representation with a specific player
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await prisma.agent.findUnique({
    where: { userId: (session.user as any).id },
    select: { id: true },
  });
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const { id: playerId } = await params;

  // Verify the player belongs to this agent
  const player = await prisma.player.findFirst({
    where: { id: playerId, agentId: agent.id },
    select: { id: true, userId: true },
  });
  if (!player) return NextResponse.json({ error: "Player not in your roster" }, { status: 404 });

  // Clear representation fields on player
  await prisma.player.update({
    where: { id: playerId },
    data: { agentId: null, agentName: null, agentPhone: null, agentEmail: null },
  });

  // Mark the accepted representation request as terminated
  await (prisma as any).representationRequest.updateMany({
    where: { playerId, agentId: agent.id, status: "ACCEPTED" },
    data: { status: "REJECTED", respondedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
