// app/api/agent/players/[id]/route.ts — get, update, delete single player
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getAgentPlayer(session: any, playerId: string) {
  const agent = await prisma.agent.findUnique({
    where: { userId: (session.user as any).id },
    select: { id: true },
  });
  if (!agent) return null;
  const player = await prisma.player.findFirst({
    where: { id: playerId, agentId: agent.id },
  });
  return player;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const player = await getAgentPlayer(session, id);
  if (!player) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ player });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await getAgentPlayer(session, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = await req.json();
  const allowed = [
    "firstName", "lastName", "dateOfBirth", "nationality", "position",
    "heightCm", "weightKg", "dominantHand", "currentClub", "bio", "phone",
    "isAvailable", "expectedSalaryMin", "expectedSalaryMax",
    "achievements", "defensivePosition",
  ];
  const update: any = {};
  for (const key of allowed) {
    if (key in data) {
      if (key === "dateOfBirth") update[key] = new Date(data[key]);
      else if (["heightCm", "weightKg", "expectedSalaryMin", "expectedSalaryMax"].includes(key)) {
        update[key] = data[key] !== null && data[key] !== "" ? Number(data[key]) : null;
      }
      else update[key] = data[key];
    }
  }

  const player = await prisma.player.update({
    where: { id },
    data: update,
  });
  return NextResponse.json({ player });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await getAgentPlayer(session, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete the placeholder user (cascades to player)
  await prisma.user.delete({ where: { id: existing.userId } });
  return NextResponse.json({ ok: true });
}
