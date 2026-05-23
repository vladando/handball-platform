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

// PATCH: increment view count (public, no auth required)
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    await prisma.pitchDeck.update({
      where: { token },
      data: { views: { increment: 1 } },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

// PUT: edit pitch deck players (agent only)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await getAgent(session);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const { token } = await params;
  const existing = await prisma.pitchDeck.findFirst({ where: { token, agentId: agent.id } });
  if (!existing) return NextResponse.json({ error: "Pitch deck not found" }, { status: 404 });

  const { playerIds, title, message, expiresAt } = await req.json();
  if (playerIds && (!Array.isArray(playerIds) || playerIds.length === 0))
    return NextResponse.json({ error: "At least one player required" }, { status: 400 });

  const pitchDeck = await prisma.pitchDeck.update({
    where: { token },
    data: {
      ...(playerIds ? { playerIds: JSON.stringify(playerIds) } : {}),
      ...(title !== undefined ? { title: title?.trim() || "Player Pitch" } : {}),
      ...(message !== undefined ? { message: message?.trim() ?? null } : {}),
      ...(expiresAt !== undefined ? { expiresAt: expiresAt ? new Date(expiresAt) : null } : {}),
    },
  });
  return NextResponse.json({ pitchDeck });
}

// DELETE: remove pitch deck (agent only)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await getAgent(session);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const { token } = await params;
  const existing = await prisma.pitchDeck.findFirst({ where: { token, agentId: agent.id } });
  if (!existing) return NextResponse.json({ error: "Pitch deck not found" }, { status: 404 });

  await prisma.pitchDeck.delete({ where: { token } });
  return NextResponse.json({ ok: true });
}
