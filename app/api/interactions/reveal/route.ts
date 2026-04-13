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

  return NextResponse.json({
    data: {
      alreadyRevealed,
      interactionId: interaction.id,
      contact: {
        email: player.user.email,
        phone: player.phone,
        agentName: player.agentName,
        agentPhone: player.agentPhone,
        agentEmail: player.agentEmail,
      },
    },
  });
}
