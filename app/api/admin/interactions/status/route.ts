// app/api/admin/interactions/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { interactionId, status } = await req.json();
  const valid = ["PENDING","INVOICED","PAID","DISPUTED","WAIVED"];
  if (!valid.includes(status))
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });

  const interaction = await prisma.interaction.update({
    where: { id: interactionId },
    data: { commissionStatus: status },
  });

  return NextResponse.json({ interaction });
}
