import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
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

  // Verify player belongs to this agent
  const player = await prisma.player.findFirst({
    where: { id: playerId, agentId: agent.id },
    include: {
      careerEntries: { orderBy: { startDate: "desc" } },
      medicalRecords: { orderBy: { createdAt: "desc" }, take: 10 },
      galleryImages: { orderBy: { createdAt: "desc" } },
      videos: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const [contracts, commissions, transfers, agentNotes, generalNotes] = await Promise.all([
    prisma.agentContract.findMany({
      where: { agentId: agent.id, playerId },
      orderBy: { endDate: "asc" },
    }),
    prisma.agentCommission.findMany({
      where: { agentId: agent.id, playerId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.transferRecord.findMany({
      where: { agentId: agent.id, playerId },
      orderBy: { transferDate: "desc" },
    }),
    prisma.agentNote.findMany({
      where: { agentId: agent.id, playerId },
      orderBy: { createdAt: "desc" },
    }),
    (prisma as any).agentGeneralNote.findMany({
      where: { agentId: agent.id, playerId },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    }),
  ]);

  return NextResponse.json({ player, contracts, commissions, transfers, agentNotes, generalNotes });
}
