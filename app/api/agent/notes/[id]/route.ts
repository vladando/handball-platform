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
  const { content, category } = await req.json();

  const existing = await prisma.agentNote.findFirst({ where: { id, agentId: agent.id } });
  if (!existing) return NextResponse.json({ error: "Note not found" }, { status: 404 });

  const note = await prisma.agentNote.update({
    where: { id },
    data: { content: content?.trim() ?? existing.content, category: category ?? existing.category },
  });
  return NextResponse.json({ note });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await getAgent(session);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const { id } = await params;
  const existing = await prisma.agentNote.findFirst({ where: { id, agentId: agent.id } });
  if (!existing) return NextResponse.json({ error: "Note not found" }, { status: 404 });

  await prisma.agentNote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
