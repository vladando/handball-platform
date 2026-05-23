import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "PLAYER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const player = await prisma.player.findUnique({
    where: { userId: (session.user as any).id },
    select: { id: true },
  });
  if (!player) return NextResponse.json({ requests: [] });

  const requests = await (prisma as any).representationRequest.findMany({
    where: { playerId: player.id },
    include: {
      agent: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          photoUrl: true,
          country: true,
          licenseNumber: true,
          phone: true,
          website: true,
          bio: true,
          slug: true,
          players: {
            select: { id: true },
            where: { onboardingCompleted: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ requests });
}
