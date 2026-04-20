// app/api/admin/players/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPlayerVerifiedEmail, sendPlayerRejectedEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { playerId, status, note } = await req.json();
  if (!playerId || !["VERIFIED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const player = await prisma.player.update({
    where: { id: playerId },
    data: {
      verificationStatus: status,
      verificationNote: note ?? null,
      verifiedAt: status === "VERIFIED" ? new Date() : null,
      verifiedBy: status === "VERIFIED" ? (session.user as any).id : null,
      // When verified, make player available by default
      isAvailable: status === "VERIFIED" ? true : undefined,
    },
    select: {
      firstName: true,
      lastName: true,
      user: { select: { email: true } },
    },
  });

  // Send email notification to the player
  const email = player.user?.email;
  const name = [player.firstName, player.lastName].filter(Boolean).join(" ") || "Player";
  if (email) {
    try {
      if (status === "VERIFIED") {
        await sendPlayerVerifiedEmail(email, name);
      } else {
        await sendPlayerRejectedEmail(email, name, note ?? undefined);
      }
    } catch {
      // Don't fail the request if email fails
    }
  }

  return NextResponse.json({ ok: true });
}
