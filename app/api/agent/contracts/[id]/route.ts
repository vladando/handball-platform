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
  const existing = await prisma.agentContract.findFirst({ where: { id, agentId: agent.id } });
  if (!existing) return NextResponse.json({ error: "Contract not found" }, { status: 404 });

  const body = await req.json();
  const contract = await prisma.agentContract.update({
    where: { id },
    data: {
      clubName: body.clubName?.trim() ?? existing.clubName,
      startDate: body.startDate ? new Date(body.startDate) : existing.startDate,
      endDate: body.endDate ? new Date(body.endDate) : existing.endDate,
      salaryCents: body.salaryCents !== undefined ? (body.salaryCents ? parseInt(body.salaryCents) : null) : existing.salaryCents,
      bonusDetails: body.bonusDetails?.trim() ?? existing.bonusDetails,
      notes: body.notes?.trim() ?? existing.notes,
      contractFileUrl: body.contractFileUrl !== undefined ? body.contractFileUrl : existing.contractFileUrl,
      isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
    },
    include: { player: { select: { id: true, firstName: true, lastName: true } } },
  });
  return NextResponse.json({ contract });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await getAgent(session);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const { id } = await params;
  const existing = await prisma.agentContract.findFirst({ where: { id, agentId: agent.id } });
  if (!existing) return NextResponse.json({ error: "Contract not found" }, { status: 404 });

  await prisma.agentContract.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
