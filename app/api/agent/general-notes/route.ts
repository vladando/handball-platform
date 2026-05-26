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

  const notes = await (prisma as any).agentGeneralNote.findMany({
    where: { agentId: agent.id, ...(playerId ? { playerId } : {}) },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    include: { player: { select: { id: true, firstName: true, lastName: true, photoUrl: true } } },
  });
  return NextResponse.json({ notes });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await getAgent(session);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const { title, content, color, playerId } = await req.json();
  if (!content?.trim())
    return NextResponse.json({ error: "Content is required" }, { status: 400 });

  // Verify player belongs to agent if provided
  if (playerId) {
    const player = await prisma.player.findFirst({ where: { id: playerId, agentId: agent.id }, select: { id: true } });
    if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const note = await (prisma as any).agentGeneralNote.create({
    data: {
      agentId: agent.id,
      playerId: playerId || null,
      title: title?.trim() || null,
      content: content.trim(),
      color: color ?? "default",
    },
    include: { player: { select: { id: true, firstName: true, lastName: true, photoUrl: true } } },
  });
  return NextResponse.json({ note }, { status: 201 });
}
