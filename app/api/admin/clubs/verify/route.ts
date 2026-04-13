// app/api/admin/clubs/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clubId, status } = await req.json();
  if (!["VERIFIED", "REJECTED"].includes(status))
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });

  const club = await prisma.club.update({
    where: { id: clubId },
    data: {
      verificationStatus: status,
      verifiedAt: status === "VERIFIED" ? new Date() : null,
      verifiedBy: (session.user as any).id,
    },
  });

  return NextResponse.json({ club });
}
