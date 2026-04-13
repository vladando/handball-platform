// app/api/admin/players/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { playerId, status, note } = await req.json();
  if (!playerId || !["VERIFIED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await prisma.player.update({
    where: { id: playerId },
    data: {
      verificationStatus: status,
      verificationNote: note ?? null,
      verifiedAt: status === "VERIFIED" ? new Date() : null,
      verifiedBy: status === "VERIFIED" ? (session.user as any).id : null,
      // When verified, make player available by default
      isAvailable: status === "VERIFIED" ? true : undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
