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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await getAgent(session);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const { id } = await params;
  const body = await req.json();

  const existing = await (prisma as any).agentGeneralNote.findFirst({
    where: { id, agentId: agent.id },
  });
  if (!existing) return NextResponse.json({ error: "Note not found" }, { status: 404 });

  // Verify player belongs to agent if provided
  if (body.playerId) {
    const player = await prisma.player.findFirst({ where: { id: body.playerId, agentId: agent.id }, select: { id: true } });
    if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const note = await (prisma as any).agentGeneralNote.update({
    where: { id },
    data: {
      title: "title" in body ? (body.title?.trim() || null) : existing.title,
      content: body.content?.trim() ?? existing.content,
      color: body.color ?? existing.color,
      pinned: typeof body.pinned === "boolean" ? body.pinned : existing.pinned,
      playerId: "playerId" in body ? (body.playerId || null) : existing.playerId,
    },
    include: { player: { select: { id: true, firstName: true, lastName: true, photoUrl: true } } },
  });
  return NextResponse.json({ note });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await getAgent(session);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const { id } = await params;
  const existing = await (prisma as any).agentGeneralNote.findFirst({
    where: { id, agentId: agent.id },
  });
  if (!existing) return NextResponse.json({ error: "Note not found" }, { status: 404 });

  await (prisma as any).agentGeneralNote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
