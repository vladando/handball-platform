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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await getAgent(session);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const { id } = await params;
  const existing = await prisma.agentCommission.findFirst({ where: { id, agentId: agent.id } });
  if (!existing) return NextResponse.json({ error: "Commission not found" }, { status: 404 });

  const body = await req.json();
  const commission = await prisma.agentCommission.update({
    where: { id },
    data: {
      status: body.status ?? existing.status,
      paidAt: body.paidAt !== undefined ? (body.paidAt ? new Date(body.paidAt) : null) : existing.paidAt,
      notes: body.notes?.trim() ?? existing.notes,
      description: body.description?.trim() ?? existing.description,
      amountCents: body.amountCents !== undefined ? parseInt(body.amountCents) : existing.amountCents,
      dueDate: body.dueDate ? new Date(body.dueDate) : existing.dueDate,
    },
    include: { player: { select: { id: true, firstName: true, lastName: true } } },
  });
  return NextResponse.json({ commission });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await getAgent(session);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const { id } = await params;
  const existing = await prisma.agentCommission.findFirst({ where: { id, agentId: agent.id } });
  if (!existing) return NextResponse.json({ error: "Commission not found" }, { status: 404 });

  await prisma.agentCommission.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
