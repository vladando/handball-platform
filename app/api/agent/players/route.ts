// app/api/agent/players/route.ts — list + create players
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function makeSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Math.random().toString(36).slice(2, 7);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const agent = await prisma.agent.findUnique({
    where: { userId: (session.user as any).id },
    select: { id: true },
  });
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const players = await prisma.player.findMany({
    where: { agentId: agent.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, firstName: true, lastName: true, photoUrl: true,
      position: true, nationality: true, currentClub: true,
      verificationStatus: true, isAvailable: true, slug: true,
      dateOfBirth: true, heightCm: true, weightKg: true, createdAt: true,
    },
  });
  return NextResponse.json({ players });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const agent = await prisma.agent.findUnique({
    where: { userId: (session.user as any).id },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const { firstName, lastName, dateOfBirth, nationality, position, heightCm, weightKg,
          dominantHand, currentClub, bio, phone, isAvailable, expectedSalaryMin, expectedSalaryMax } = await req.json();

  if (!firstName || !lastName || !dateOfBirth || !nationality || !position || !heightCm || !weightKg) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const fullName = `${firstName} ${lastName}`;
  const slug = makeSlug(fullName);

  // Create a placeholder user account for this player (no real login)
  const placeholderEmail = `agent-player-${slug}@nologin.handballhub.internal`;
  const placeholderHash = await bcrypt.hash(Math.random().toString(36) + Date.now(), 10);

  const player = await prisma.$transaction(async (tx: any) => {
    const user = await tx.user.create({
      data: { email: placeholderEmail, passwordHash: placeholderHash, role: "PLAYER" },
    });
    return tx.player.create({
      data: {
        userId: user.id,
        agentId: agent.id,
        firstName, lastName,
        dateOfBirth: new Date(dateOfBirth),
        nationality,
        position,
        heightCm: Number(heightCm),
        weightKg: Number(weightKg),
        dominantHand: dominantHand ?? "RIGHT",
        currentClub: currentClub ?? null,
        bio: bio ?? null,
        phone: phone ?? null,
        isAvailable: isAvailable ?? true,
        expectedSalaryMin: expectedSalaryMin ? Number(expectedSalaryMin) : null,
        expectedSalaryMax: expectedSalaryMax ? Number(expectedSalaryMax) : null,
        slug,
        verificationStatus: "UNVERIFIED",
        // Pre-fill agent info
        agentName: `${agent.firstName} ${agent.lastName}`,
      },
    });
  });

  return NextResponse.json({ player }, { status: 201 });
}
