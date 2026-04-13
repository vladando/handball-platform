import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getClub(userId: string) {
  return prisma.club.findUnique({ where: { userId }, select: { id: true } });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "CLUB") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { playerId } = await req.json();
  const club = await getClub((session.user as any).id);
  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });
  await prisma.watchlistItem.upsert({
    where: { clubId_playerId: { clubId: club.id, playerId } },
    create: { clubId: club.id, playerId },
    update: {},
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "CLUB") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { playerId } = await req.json();
  const club = await getClub((session.user as any).id);
  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });
  await prisma.watchlistItem.deleteMany({ where: { clubId: club.id, playerId } });
  return NextResponse.json({ success: true });
}
