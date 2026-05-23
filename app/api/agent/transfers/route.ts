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
    salaryCents,
    contractStartDate,
    contractEndDate,
    notes,
    // Commission auto-create
    commissionAmountCents,
    commissionDueDate,
    commissionDescription,
    // Contract (add/update)
    contractFileUrl,
  } = await req.json();

  if (!playerId || !toClub?.trim() || !transferDate)
    return NextResponse.json({ error: "playerId, toClub and transferDate are required" }, { status: 400 });

  const player = await prisma.player.findFirst({
    where: { id: playerId, agentId: agent.id },
    select: { id: true, currentClub: true },
  });
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  // Calculate contractMonths from start/end dates
  let contractMonths: number | null = null;
  if (contractStartDate && contractEndDate) {
    const ms = new Date(contractEndDate).getTime() - new Date(contractStartDate).getTime();
    contractMonths = Math.round(ms / (1000 * 60 * 60 * 24 * 30.44));
  }

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

  // Auto-create contract record (linked to this transfer)
  let contractRecord: any = null;
  if (contractStartDate && contractEndDate) {
    contractRecord = await prisma.agentContract.create({
      data: {
        agentId: agent.id,
        playerId,
        clubName: toClub.trim(),
        startDate: new Date(contractStartDate),
        endDate: new Date(contractEndDate),
        salaryCents: salaryCents ? parseInt(salaryCents) : null,
        isActive: true,
      },
      include: { player: { select: { id: true, firstName: true, lastName: true } } },
    }).catch(() => null);
  }

  // Create the transfer record (no contractFileUrl field in schema)
  const transfer = await (prisma as any).transferRecord.create({
    data: {
      agentId: agent.id,
      playerId,
      fromClub: fromClub?.trim() ?? null,
      toClub: toClub.trim(),
      transferDate: new Date(transferDate),
      salaryCents: salaryCents ? parseInt(salaryCents) : null,
      contractMonths,
      contractStartDate: contractStartDate ? new Date(contractStartDate) : null,
      contractEndDate: contractEndDate ? new Date(contractEndDate) : null,
      linkedCommissionId: commission?.id ?? null,
      notes: notes?.trim() ?? null,
    },
    include: { player: { select: { id: true, firstName: true, lastName: true } } },
  });

  // Auto-update player career history
  // Mark old current entries as ended
  await prisma.careerEntry.updateMany({
    where: { playerId, isCurrentClub: true },
    data: {
      isCurrentClub: false,
      endDate: contractStartDate ? new Date(contractStartDate) : new Date(transferDate),
    },
  });

  // Add new career entry
  await prisma.careerEntry.create({
    data: {
      playerId,
      clubName: toClub.trim(),
      country: "",
      startDate: contractStartDate ? new Date(contractStartDate) : new Date(transferDate),
      endDate: contractEndDate ? new Date(contractEndDate) : null,
      isCurrentClub: true,
    },
  });

  // Update player's currentClub field
  await prisma.player.update({
    where: { id: playerId },
    data: { currentClub: toClub.trim() },
  });

  return NextResponse.json({ transfer, commission, contract: contractRecord }, { status: 201 });
}
