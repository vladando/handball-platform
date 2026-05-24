// POST — agent reveals a player's contact details; creates AgentContactReveal record
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await prisma.agent.findUnique({
    where: { userId: (session.user as any).id },
    select: { id: true, onboardingCompleted: true },
  });
  if (!agent || !agent.onboardingCompleted)
    return NextResponse.json({ error: "Agent profile not complete" }, { status: 403 });

  const { playerId } = await req.json();
  if (!playerId)
    return NextResponse.json({ error: "Missing playerId" }, { status: 400 });

  // Fetch player contact info
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      phone: true,
      agentName: true,
      agentPhone: true,
      agentEmail: true,
      agentId: true,
      user: { select: { email: true } },
    },
  });
  if (!player)
    return NextResponse.json({ error: "Player not found" }, { status: 404 });

  // Upsert reveal record (idempotent)
  let alreadyRevealed = false;
  const existing = await (prisma as any).agentContactReveal.findUnique({
    where: { agentId_playerId: { agentId: agent.id, playerId } },
  });
  if (existing) {
    alreadyRevealed = true;
  } else {
    await (prisma as any).agentContactReveal.create({
      data: { agentId: agent.id, playerId },
    });
  }

  // Resolve contact: if player has a platform agent, use agent record
  let agentName = player.agentName ?? null;
  let agentPhone = player.agentPhone ?? null;
  let agentEmail: string | null = player.agentEmail ?? null;
  if (player.agentId && player.agentId !== agent.id) {
    const agentRec = await prisma.agent.findUnique({
      where: { id: player.agentId },
      select: { firstName: true, lastName: true, phone: true, user: { select: { email: true } } },
    }).catch(() => null);
    if (agentRec) {
      agentName = `${agentRec.firstName} ${agentRec.lastName}`;
      agentPhone = agentRec.phone ?? null;
      agentEmail = agentRec.user?.email ?? null;
    }
  }

  // If player has a platform agent, use agent's contact as primary
  const hasAgent = !!(player.agentId && player.agentId !== agent.id && agentName);
  const contactEmail = hasAgent ? (agentEmail ?? player.user.email) : player.user.email;
  const contactPhone = hasAgent ? (agentPhone ?? player.phone) : player.phone;

  return NextResponse.json({
    data: {
      alreadyRevealed,
      contact: {
        email: contactEmail,
        phone: contactPhone,
        agentName,
        agentPhone,
        agentEmail,
      },
    },
  });
}
