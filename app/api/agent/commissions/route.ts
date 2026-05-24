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

  const body = await req.json();
  const { playerId, installments, description, amountCents, dueDate, notes } = body;

  if (!playerId) return NextResponse.json({ error: "playerId is required" }, { status: 400 });

  const player = await prisma.player.findFirst({ where: { id: playerId, agentId: agent.id }, select: { id: true } });
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  // Multi-installment creation
  if (Array.isArray(installments) && installments.length > 0) {
    for (const i of installments) {
      if (!i.description?.trim() || !i.amountCents || !i.dueDate)
        return NextResponse.json({ error: "Each installment requires description, amountCents, and dueDate" }, { status: 400 });
    }
    const commissions = await Promise.all(
      installments.map((i: any) =>
        prisma.agentCommission.create({
          data: {
            agentId: agent.id,
            playerId,
            description: i.description.trim(),
            amountCents: parseInt(i.amountCents),
            dueDate: new Date(i.dueDate),
            notes: i.notes?.trim() ?? null,
          },
          include: { player: { select: { id: true, firstName: true, lastName: true } } },
        })
      )
    );
    return NextResponse.json({ commissions }, { status: 201 });
  }

  // Single commission creation (fallback)
  if (!description?.trim() || !amountCents || !dueDate)
    return NextResponse.json({ error: "description, amountCents and dueDate are required" }, { status: 400 });

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
