// app/api/player/career/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolvePlayerForSession } from "@/lib/playerAuth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || (role !== "PLAYER" && role !== "AGENT"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { agentPlayerId, clubName, country, city, startDate, endDate, appearances, goals, assists, isCurrentClub } = body;

  if (!clubName || !country || !startDate)
    return NextResponse.json({ error: "Club name, country and start date are required." }, { status: 400 });

  const player = await resolvePlayerForSession(session, agentPlayerId);
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
