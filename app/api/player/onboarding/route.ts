import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolvePlayerForSession } from "@/lib/playerAuth";

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || (role !== "PLAYER" && role !== "AGENT"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { agentPlayerId, ...rest } = body;

  const player = await resolvePlayerForSession(session, agentPlayerId);
  if (!player) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const {
    firstName, lastName, dateOfBirth, nationality, bio,
    position, dominantHand, heightCm, weightKg,
    phone, isAvailable, currentClub,
    expectedSalaryMin, expectedSalaryMax,
    agentName, agentPhone, agentEmail,
    achievements, defensivePosition,
  } = rest;

  await prisma.player.update({
    where: { id: player.id },
    data: {
      firstName:    firstName?.trim() || undefined,
      lastName:     lastName?.trim()  || undefined,
      dateOfBirth:  dateOfBirth ? new Date(dateOfBirth) : undefined,
      nationality:  nationality?.trim() || undefined,
      bio:          bio?.trim() || null,
      position:     position || undefined,
      dominantHand: dominantHand || undefined,
      heightCm:     heightCm ? parseInt(String(heightCm)) : undefined,
      weightKg:     weightKg ? parseInt(String(weightKg)) : undefined,
      phone:        phone?.trim() || null,
      isAvailable:  typeof isAvailable === "boolean" ? isAvailable : true,
      currentClub:  currentClub?.trim() || null,
      expectedSalaryMin: expectedSalaryMin ? Math.round(parseFloat(String(expectedSalaryMin)) * 100) : null,
      expectedSalaryMax: expectedSalaryMax ? Math.round(parseFloat(String(expectedSalaryMax)) * 100) : null,
      agentName:    agentName?.trim() || null,
      agentPhone:   agentPhone?.trim() || null,
      agentEmail:   agentEmail?.trim() || null,
      achievements: achievements?.trim() || null,
      defensivePosition: defensivePosition || null,
      onboardingCompleted: true,
    },
  });

  return NextResponse.json({ ok: true });
}
