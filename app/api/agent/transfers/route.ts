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

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await getAgent(session);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const transfers = await prisma.transferRecord.findMany({
    where: { agentId: agent.id },
    include: { player: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { transferDate: "desc" },
  });
  return NextResponse.json({ transfers });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await getAgent(session);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const {
    playerId,
    fromClub,
    toClub,
    transferDate,
    transferFeeCents,
    salaryCents,
    contractMonths,
    notes,
    contractFileUrl,
    // Commission auto-create fields
    commissionAmountCents,
    commissionDueDate,
    commissionDescription,
  } = await req.json();

  if (!playerId || !toClub?.trim() || !transferDate)
    return NextResponse.json({ error: "playerId, toClub and transferDate are required" }, { status: 400 });

  const player = await prisma.player.findFirst({
    where: { id: playerId, agentId: agent.id },
    select: { id: true, currentClub: true },
  });
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  // Auto-create commission if amount provided
  let commission: any = null;
  if (commissionAmountCents && commissionAmountCents > 0 && commissionDueDate) {
    commission = await (prisma as any).agentCommission.create({
      data: {
        agentId: agent.id,
        playerId,
        description: commissionDescription?.trim() || `Transfer to ${toClub.trim()}`,
        amountCents: parseInt(commissionAmountCents),
        dueDate: new Date(commissionDueDate),
        status: "PENDING",
      },
      include: { player: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  // Create the transfer record, linking the commission if created
  const transfer = await (prisma as any).transferRecord.create({
    data: {
      agentId: agent.id,
      playerId,
      fromClub: fromClub?.trim() ?? null,
      toClub: toClub.trim(),
      transferDate: new Date(transferDate),
      transferFeeCents: transferFeeCents ? parseInt(transferFeeCents) : null,
      salaryCents: salaryCents ? parseInt(salaryCents) : null,
      contractMonths: contractMonths ? parseInt(contractMonths) : null,
      linkedCommissionId: commission?.id ?? null,
      notes: notes?.trim() ?? null,
      contractFileUrl: contractFileUrl ?? null,
    },
    include: { player: { select: { id: true, firstName: true, lastName: true } } },
  });

  // Auto-create / update player career history
  // Mark all existing career entries for this player as not current
  await prisma.careerEntry.updateMany({
    where: { playerId, isCurrentClub: true },
    data: { isCurrentClub: false, endDate: new Date(transferDate) },
  });

  // Calculate end date from contractMonths if provided
  const startDate = new Date(transferDate);
  const endDate = contractMonths
    ? new Date(new Date(transferDate).setMonth(new Date(transferDate).getMonth() + parseInt(contractMonths)))
    : null;

  await prisma.careerEntry.create({
    data: {
      playerId,
      clubName: toClub.trim(),
      country: "", // country not collected in transfer form; agent can edit later
      startDate,
      endDate,
      isCurrentClub: true,
    },
  });

  // Also update player's currentClub field
  await prisma.player.update({
    where: { id: playerId },
    data: { currentClub: toClub.trim() },
  });

  return NextResponse.json({ transfer, commission }, { status: 201 });
}
