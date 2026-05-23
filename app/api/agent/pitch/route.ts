import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 12; i++) token += chars[Math.floor(Math.random() * chars.length)];
  return token;
}

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

  const pitchDecks = await prisma.pitchDeck.findMany({
    where: { agentId: agent.id },
    orderBy: { createdAt: "desc" },
  });

  // Enrich with player names
  const enriched = await Promise.all(
    pitchDecks.map(async (deck) => {
      const playerIds: string[] = JSON.parse(deck.playerIds);
      const players = await prisma.player.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, firstName: true, lastName: true },
      });
      return { ...deck, players };
    })
  );

  return NextResponse.json({ pitchDecks: enriched });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await getAgent(session);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const { title, playerIds, message, expiresAt } = await req.json();

  if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0)
    return NextResponse.json({ error: "At least one player is required" }, { status: 400 });

  // Verify all players belong to agent
  const players = await prisma.player.findMany({
    where: { id: { in: playerIds }, agentId: agent.id },
    select: { id: true },
  });
  if (players.length !== playerIds.length)
    return NextResponse.json({ error: "One or more players not found" }, { status: 400 });

  let token = generateToken();
  // Ensure uniqueness
  let existing = await prisma.pitchDeck.findUnique({ where: { token } });
  while (existing) {
    token = generateToken();
    existing = await prisma.pitchDeck.findUnique({ where: { token } });
  }

  const pitchDeck = await prisma.pitchDeck.create({
    data: {
      agentId: agent.id,
      token,
      title: title?.trim() || "Player Pitch",
      playerIds: JSON.stringify(playerIds),
      message: message?.trim() ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  return NextResponse.json({ pitchDeck }, { status: 201 });
}
