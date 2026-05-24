// app/api/interactions/reveal/route.ts
// POST — club reveals a player's contact details; creates Interaction record
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "CLUB")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const { playerId, tosAccepted, tosVersion } = await req.json();

  if (!playerId || !tosAccepted)
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  // Fetch club
  const club = await prisma.club.findUnique({
    where: { userId },
    select: { id: true, verificationStatus: true },
  });
  if (!club || club.verificationStatus !== "VERIFIED")
    return NextResponse.json({ error: "Your club must be verified to reveal contacts" }, { status: 403 });

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

  // Upsert interaction (idempotent — same club can't pay twice)
  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  let alreadyRevealed = false;
  let interaction = await prisma.interaction.findUnique({
    where: { clubId_playerId: { clubId: club.id, playerId } },
  });

  if (interaction) {
    alreadyRevealed = true;
  } else {
    interaction = await prisma.interaction.create({
      data: {
        clubId: club.id,
        playerId,
        ipAddress,
        userAgent: req.headers.get("user-agent") ?? "",
        acceptedTosAt: new Date(),
        acceptedTosVersion: tosVersion ?? "v1.0",
        commissionStatus: "PENDING",
      },
    });
  }

  // If player is managed by a platform agent, use the agent's contact info
  let contactEmail: string | null = (player as any).user?.email ?? null;
  let contactPhone: string | null = player.phone ?? null;
  let agentName: string | null = player.agentName ?? null;
  let agentPhone: string | null = player.agentPhone ?? null;
  let agentEmail: string | null = player.agentEmail ?? null;

  if ((player as any).agentId) {
    const agentRec = await prisma.agent.findUnique({
      where: { id: (player as any).agentId },
      select: { firstName: true, lastName: true, phone: true, user: { select: { email: true } } },
    }).catch(() => null);
    if (agentRec) {
      // Agent is the contact — use agent's email and phone as primary
      contactEmail = agentRec.user?.email ?? contactEmail;
      contactPhone = agentRec.phone ?? null;
      agentName = `${agentRec.firstName} ${agentRec.lastName}`;
      agentPhone = agentRec.phone ?? null;
      agentEmail = agentRec.user?.email ?? null;
    }
  }

  return NextResponse.json({
    data: {
      alreadyRevealed,
      interactionId: interaction.id,
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
