// app/api/admin/clubs/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendClubVerifiedEmail, sendClubRejectedEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clubId, status, note } = await req.json();
  if (!["VERIFIED", "REJECTED"].includes(status))
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });

  const club = await prisma.club.update({
    where: { id: clubId },
    data: {
      verificationStatus: status,
      verificationNote: note?.trim() || null,
      verifiedAt: status === "VERIFIED" ? new Date() : null,
      verifiedBy: (session.user as any).id,
    },
    include: { user: { select: { email: true } } },
  });

  // Send notification email to club (non-blocking)
  const clubEmail = club.user?.email;
  if (clubEmail) {
    if (status === "VERIFIED") {
      sendClubVerifiedEmail(clubEmail, club.name).catch(err =>
        console.error("[admin/clubs/verify] verified email failed:", err)
      );
    } else {
      sendClubRejectedEmail(clubEmail, club.name, note?.trim()).catch(err =>
        console.error("[admin/clubs/verify] rejected email failed:", err)
      );
    }
  }

  return NextResponse.json({ club });
}
