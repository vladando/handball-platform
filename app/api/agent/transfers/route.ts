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

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await getAgent(session);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const transfers = await prisma.transferRecord.findMany({
    where: { agentId: agent.id },
    include: { player: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { transferDate: "desc" },
  });
  return NextResponse.json({ transfers });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await getAgent(session);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const { playerId, fromClub, toClub, transferDate, transferFeeCents, salaryCents, contractYears, notes } = await req.json();

  if (!playerId || !toClub?.trim() || !transferDate)
    return NextResponse.json({ error: "playerId, toClub and transferDate are required" }, { status: 400 });

  const player = await prisma.player.findFirst({ where: { id: playerId, agentId: agent.id }, select: { id: true } });
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const transfer = await prisma.transferRecord.create({
    data: {
      agentId: agent.id,
      playerId,
      fromClub: fromClub?.trim() ?? null,
      toClub: toClub.trim(),
      transferDate: new Date(transferDate),
      transferFeeCents: transferFeeCents ? parseInt(transferFeeCents) : null,
      salaryCents: salaryCents ? parseInt(salaryCents) : null,
      contractYears: contractYears ? parseInt(contractYears) : null,
      notes: notes?.trim() ?? null,
    },
    include: { player: { select: { id: true, firstName: true, lastName: true } } },
  });
  return NextResponse.json({ transfer }, { status: 201 });
}
