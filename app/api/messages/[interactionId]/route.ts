import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

async function getParticipant(userId: string, role: string, interactionId: string) {
  const interaction = await prisma.interaction.findUnique({
    where: { id: interactionId },
    include: {
      club: { select: { userId: true } },
      player: { select: { userId: true } },
    },
  });
  if (!interaction) return null;
  const isClub = interaction.club.userId === userId;
  const isPlayer = interaction.player.userId === userId;
  if (!isClub && !isPlayer) return null;
  return interaction;
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ interactionId: string }> }) {
  const { interactionId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  const interaction = await getParticipant(userId, role, interactionId);
  if (!interaction) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Mark messages as read
  await prisma.message.updateMany({ where: { interactionId, receiverId: userId, isRead: false }, data: { isRead: true } });

  const messages = await prisma.message.findMany({
    where: { interactionId },
    include: { sender: { select: { id: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ messages, interaction });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ interactionId: string }> }) {
  const { interactionId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  const interaction = await getParticipant(userId, role, interactionId);
  if (!interaction) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  // Determine receiver
  const receiverId = interaction.club.userId === userId ? interaction.player.userId : interaction.club.userId;

  const message = await prisma.message.create({
    data: { senderId: userId, receiverId, interactionId, content: content.trim() },
    include: { sender: { select: { id: true, role: true } } },
  });

  return NextResponse.json({ message });
}
