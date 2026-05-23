import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getAgent(session: any) {
  return prisma.agent.findUnique({
    where: { userId: (session.user as any).id },
    select: { id: true },
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ playerId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await getAgent(session);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const { playerId } = await params;
  const player = await prisma.player.findFirst({ where: { id: playerId, agentId: agent.id }, select: { id: true } });
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const { healthStatus, rehabNote, rehabReturnDate } = await req.json();

  const validStatuses = ["HEALTHY", "INJURED", "REHAB", "SUSPENDED"];
  if (healthStatus && !validStatuses.includes(healthStatus))
    return NextResponse.json({ error: "Invalid health status" }, { status: 400 });

  const updated = await prisma.player.update({
    where: { id: playerId },
    data: {
      healthStatus: healthStatus ?? "HEALTHY",
      rehabNote: rehabNote?.trim() ?? null,
      rehabReturnDate: rehabReturnDate ? new Date(rehabReturnDate) : null,
    },
    select: { id: true, healthStatus: true, rehabNote: true, rehabReturnDate: true },
  });

  return NextResponse.json({ player: updated });
}
