import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendClubPaymentRequestEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "CLUB")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const club = await prisma.club.findUnique({
    where: { userId },
    include: { user: { select: { email: true } } },
  });
  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });

  if (club.verificationStatus !== "VERIFIED")
    return NextResponse.json({ error: "Club must be verified first." }, { status: 400 });

  if (club.subscriptionStatus === "ACTIVE")
    return NextResponse.json({ error: "Subscription already active." }, { status: 400 });

  const updated = await prisma.club.update({
    where: { id: club.id },
    data: { subscriptionStatus: "PENDING_PAYMENT" },
  });

  // Notify admin
  const clubEmail = club.user?.email ?? "";
  sendClubPaymentRequestEmail(club.name, clubEmail).catch(err =>
    console.error("[club/subscription] payment request email failed:", err)
  );

  return NextResponse.json({ ok: true, status: "PENDING_PAYMENT" });
}
