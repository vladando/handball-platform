// DELETE — player terminates representation with their current agent
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "PLAYER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const player = await prisma.player.findUnique({
    where: { userId: (session.user as any).id },
    select: { id: true, agentId: true },
  });
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });
  if (!player.agentId) return NextResponse.json({ error: "No active representation" }, { status: 400 });

  const agentId = player.agentId;

  // Clear representation fields
  await prisma.player.update({
    where: { id: player.id },
    data: { agentId: null, agentName: null, agentPhone: null, agentEmail: null },
  });

  // Mark the accepted request as terminated
  await (prisma as any).representationRequest.updateMany({
    where: { playerId: player.id, agentId, status: "ACCEPTED" },
    data: { status: "REJECTED", respondedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
