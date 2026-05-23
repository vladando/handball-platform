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
  if (!playerId) return NextResponse.json({ error: "playerId required" }, { status: 400 });

  // Verify player belongs to agent
  const player = await prisma.player.findFirst({ where: { id: playerId, agentId: agent.id }, select: { id: true } });
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const notes = await prisma.agentNote.findMany({
    where: { agentId: agent.id, playerId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ notes });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await getAgent(session);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const { playerId, content, category } = await req.json();
  if (!playerId || !content?.trim())
    return NextResponse.json({ error: "playerId and content are required" }, { status: 400 });

  const player = await prisma.player.findFirst({ where: { id: playerId, agentId: agent.id }, select: { id: true } });
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const note = await prisma.agentNote.create({
    data: { agentId: agent.id, playerId, content: content.trim(), category: category ?? "general" },
  });
  return NextResponse.json({ note }, { status: 201 });
}
