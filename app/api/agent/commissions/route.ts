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

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await getAgent(session);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const playerId = req.nextUrl.searchParams.get("playerId");
  const where: any = { agentId: agent.id };
  if (playerId) where.playerId = playerId;

  const commissions = await prisma.agentCommission.findMany({
    where,
    include: { player: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { dueDate: "asc" },
  });
  return NextResponse.json({ commissions });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await getAgent(session);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const { playerId, description, amountCents, dueDate, notes } = await req.json();

  if (!playerId || !description?.trim() || !amountCents || !dueDate)
    return NextResponse.json({ error: "playerId, description, amountCents and dueDate are required" }, { status: 400 });

  const player = await prisma.player.findFirst({ where: { id: playerId, agentId: agent.id }, select: { id: true } });
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const commission = await prisma.agentCommission.create({
    data: {
      agentId: agent.id,
      playerId,
      description: description.trim(),
      amountCents: parseInt(amountCents),
      dueDate: new Date(dueDate),
      notes: notes?.trim() ?? null,
    },
    include: { player: { select: { id: true, firstName: true, lastName: true } } },
  });
  return NextResponse.json({ commission }, { status: 201 });
}
