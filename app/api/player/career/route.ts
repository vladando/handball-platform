// app/api/player/career/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "PLAYER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clubName, country, city, startDate, endDate, appearances, goals, assists, isCurrentClub } = await req.json();
  if (!clubName || !country || !startDate)
    return NextResponse.json({ error: "Club name, country and start date are required." }, { status: 400 });

  const player = await prisma.player.findUnique({ where: { userId: (session.user as any).id }, select: { id: true } });
  if (!player) return NextResponse.json({ error: "Player not found." }, { status: 404 });

  const entry = await prisma.careerEntry.create({
    data: {
      playerId: player.id,
      clubName,
      country,
      city: city?.trim() || null,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      appearances: appearances ? +appearances : null,
      goals: goals ? +goals : null,
      assists: assists ? +assists : null,
      isCurrentClub: !!isCurrentClub,
    },
  });

  return NextResponse.json({ entry });
}
