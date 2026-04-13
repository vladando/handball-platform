// app/api/scouting-notes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "CLUB")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { playerId, content, rating } = await req.json();
  if (!playerId || !content)
    return NextResponse.json({ error: "Player ID and content required." }, { status: 400 });

  const club = await prisma.club.findUnique({ where: { userId: (session.user as any).id }, select: { id: true } });
  if (!club) return NextResponse.json({ error: "Club not found." }, { status: 404 });

  const note = await prisma.scoutingNote.create({
    data: { clubId: club.id, playerId, content, rating: rating ?? null },
  });

  return NextResponse.json({ note });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "CLUB")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const playerId = searchParams.get("playerId");

  const club = await prisma.club.findUnique({ where: { userId: (session.user as any).id }, select: { id: true } });
  if (!club) return NextResponse.json({ error: "Club not found." }, { status: 404 });

  const notes = await prisma.scoutingNote.findMany({
    where: { clubId: club.id, ...(playerId ? { playerId } : {}) },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ notes });
}
