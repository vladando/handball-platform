// app/api/player/medical/route.ts
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
  const { agentPlayerId, recordType, testName, testResult, testUnit, injuryType, bodyPart, notes, isVisibleToClubs } = body;

  const player = await resolvePlayerForSession(session, agentPlayerId);
  if (!player) return NextResponse.json({ error: "Player not found." }, { status: 404 });

  const record = await prisma.medicalRecord.create({
    data: {
      playerId: player.id,
      recordType: recordType ?? "PHYSICAL_TEST",
      testName: testName || null,
      testResult: testResult || null,
      testUnit: testUnit || null,
      testDate: testName ? new Date() : null,
      injuryType: injuryType || null,
      bodyPart: bodyPart || null,
      injuryDate: injuryType ? new Date() : null,
      notes: notes || null,
      isVisibleToClubs: !!isVisibleToClubs,
    },
  });

  return NextResponse.json({ record });
}
