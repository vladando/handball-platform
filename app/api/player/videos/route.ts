// app/api/player/videos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolvePlayerForSession } from "@/lib/playerAuth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || (role !== "PLAYER" && role !== "AGENT"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agentPlayerId = req.nextUrl.searchParams.get("agentPlayerId");
  const player = await resolvePlayerForSession(session, agentPlayerId);
  if (!player) return NextResponse.json({ error: "Player not found." }, { status: 404 });

  const videos = await prisma.videoVault.findMany({
    where: { playerId: player.id },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ videos });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || (role !== "PLAYER" && role !== "AGENT"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { agentPlayerId, title, youtubeUrl, description } = body;

  if (!title || !youtubeUrl) return NextResponse.json({ error: "Title and URL required." }, { status: 400 });

  const player = await resolvePlayerForSession(session, agentPlayerId);
  if (!player) return NextResponse.json({ error: "Player not found." }, { status: 404 });

  const video = await prisma.videoVault.create({
    data: { playerId: player.id, title, youtubeUrl, description: description || null },
  });

  return NextResponse.json({ video });
}
