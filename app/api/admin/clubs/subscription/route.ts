import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendSubscriptionActivatedEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clubId, action } = await req.json();
  // action: "ACTIVATE" | "RESET"

  const endsAt = action === "ACTIVATE"
    ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // +1 year
    : null;

  const club = await prisma.club.update({
    where: { id: clubId },
    data: {
      subscriptionStatus: action === "ACTIVATE" ? "ACTIVE" : "TRIAL",
      subscriptionEndsAt: endsAt,
    },
    include: { user: { select: { email: true } } },
  });

  if (action === "ACTIVATE" && club.user?.email) {
    sendSubscriptionActivatedEmail(club.user.email, club.name).catch(err =>
      console.error("[admin/clubs/subscription] activation email failed:", err)
    );
  }

  return NextResponse.json({ ok: true, club });
}
