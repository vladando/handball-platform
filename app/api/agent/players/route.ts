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
      onboardingCompleted: true,
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

  const { firstName, lastName } = await req.json();

  if (!firstName?.trim() || !lastName?.trim()) {
    return NextResponse.json({ error: "First name and last name are required." }, { status: 400 });
  }

  const fullName = `${firstName.trim()} ${lastName.trim()}`;
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
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        slug,
        verificationStatus: "UNVERIFIED",
        onboardingCompleted: false,
        // Placeholder required fields — filled in during onboarding
        dateOfBirth: new Date("2000-01-01"),
        nationality: "Unknown",
        position: "CENTRE_BACK",
        heightCm: 185,
        weightKg: 85,
        // Pre-fill agent info
        agentName: `${agent.firstName} ${agent.lastName}`,
      },
    });
  });

  return NextResponse.json({ player }, { status: 201 });
}
