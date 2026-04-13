import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getPlayer(userId: string) {
  return prisma.player.findUnique({ where:{ userId }, select:{ id:true } });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session||(session.user as any).role!=="PLAYER") return NextResponse.json({ error:"Unauthorized" },{ status:401 });
  const { title, youtubeUrl, description } = await req.json();
  if (!title||!youtubeUrl) return NextResponse.json({ error:"Title and URL required." },{ status:400 });
  const player = await getPlayer((session.user as any).id);
  if (!player) return NextResponse.json({ error:"Player not found." },{ status:404 });
  const video = await prisma.videoVault.create({ data:{ playerId:player.id, title, youtubeUrl, description:description||null } });
  return NextResponse.json({ video });
}
