import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "PLAYER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const body = await req.json();

  const {
    firstName, lastName, dateOfBirth, nationality, bio,
    position, dominantHand, heightCm, weightKg,
    phone, isAvailable, currentClub,
    expectedSalaryMin, expectedSalaryMax,
    agentName, agentPhone, agentEmail,
    achievements, defensivePosition,
  } = body;

  await prisma.player.update({
    where: { userId },
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
