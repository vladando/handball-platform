import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agent = await prisma.agent.findUnique({
    where: { userId: (session.user as any).id },
    select: { id: true },
  });
  if (!agent) return NextResponse.json({ requests: [] });

  const requests = await (prisma as any).representationRequest.findMany({
    where: { agentId: agent.id },
    include: {
      player: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          position: true,
          nationality: true,
          photoUrl: true,
          slug: true,
          currentClub: true,
          isAvailable: true,
          agentId: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ requests });
}
