import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getAgent(session: any) {
  return prisma.agent.findUnique({
    where: { userId: (session.user as any).id },
    select: { id: true },
  });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await getAgent(session);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const playerId = req.nextUrl.searchParams.get("playerId");
  const where: any = { agentId: agent.id };
  if (playerId) where.playerId = playerId;

  const contracts = await prisma.agentContract.findMany({
    where,
    include: { player: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { endDate: "asc" },
  });
  return NextResponse.json({ contracts });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await getAgent(session);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const { playerId, clubName, startDate, endDate, salaryCents, bonusDetails, notes, contractFileUrl } = await req.json();

  if (!playerId || !clubName?.trim() || !startDate || !endDate)
    return NextResponse.json({ error: "playerId, clubName, startDate and endDate are required" }, { status: 400 });

  const player = await prisma.player.findFirst({ where: { id: playerId, agentId: agent.id }, select: { id: true } });
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const contract = await prisma.agentContract.create({
    data: {
      agentId: agent.id,
      playerId,
      clubName: clubName.trim(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      salaryCents: salaryCents ? parseInt(salaryCents) : null,
      bonusDetails: bonusDetails?.trim() ?? null,
      notes: notes?.trim() ?? null,
      contractFileUrl: contractFileUrl ?? null,
    },
    include: { player: { select: { id: true, firstName: true, lastName: true } } },
  });
  return NextResponse.json({ contract }, { status: 201 });
}
