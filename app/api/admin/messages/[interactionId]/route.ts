// app/api/admin/messages/[interactionId]/route.ts
// Admin-only: fetch all messages for any interaction (read-only oversight)
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ interactionId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { interactionId } = await params;

  const interaction = await prisma.interaction.findUnique({
    where: { id: interactionId },
    include: {
      club:   { select: { name: true, userId: true } },
      player: { select: { firstName: true, lastName: true, userId: true } },
      messages: {
        include: { sender: { select: { id: true, role: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!interaction)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ interaction });
}
