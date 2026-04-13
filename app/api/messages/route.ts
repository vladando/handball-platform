import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  // Find all interactions where this user is a participant
  let interactions: any[] = [];
  if (role === "CLUB") {
    const club = await prisma.club.findUnique({ where: { userId }, select: { id: true } });
    if (!club) return NextResponse.json({ conversations: [] });
    interactions = await prisma.interaction.findMany({
      where: { clubId: club.id },
      include: {
        player: { select: { id: true, firstName: true, lastName: true, photoUrl: true, position: true, slug: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });
  } else if (role === "PLAYER") {
    const player = await prisma.player.findUnique({ where: { userId }, select: { id: true } });
    if (!player) return NextResponse.json({ conversations: [] });
    interactions = await prisma.interaction.findMany({
      where: { playerId: player.id },
      include: {
        club: { select: { id: true, name: true, logoUrl: true, country: true, slug: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // Count unread per conversation
  const conversations = await Promise.all(interactions.map(async (i: any) => {
    const unread = await prisma.message.count({ where: { interactionId: i.id, receiverId: userId, isRead: false } });
    return { ...i, unreadCount: unread };
  }));

  return NextResponse.json({ conversations });
}
