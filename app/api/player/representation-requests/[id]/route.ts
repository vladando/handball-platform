import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "PLAYER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const player = await prisma.player.findUnique({
    where: { userId: (session.user as any).id },
    select: { id: true, agentId: true },
  });
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const { id } = await params;
  const { action } = await req.json(); // action: "accept" | "reject"

  if (!["accept", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const request = await (prisma as any).representationRequest.findFirst({
    where: { id, playerId: player.id },
    include: { agent: { select: { id: true, firstName: true, lastName: true, phone: true, website: true } } },
  });
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "Request already responded to" }, { status: 409 });
  }

  const newStatus = action === "accept" ? "ACCEPTED" : "REJECTED";

  // Update the request
  const updated = await (prisma as any).representationRequest.update({
    where: { id },
    data: { status: newStatus, respondedAt: new Date() },
  });

  if (action === "accept") {
    // If player already has a different agent, reject all other pending requests first
    if (player.agentId && player.agentId !== request.agentId) {
      return NextResponse.json({ error: "You already have an agent" }, { status: 409 });
    }

    // Assign agent to player
    await prisma.player.update({
      where: { id: player.id },
      data: {
        agentId: request.agentId,
        // Populate agent contact fields from the agent record
        agentName: `${request.agent.firstName} ${request.agent.lastName}`,
        agentPhone: request.agent.phone ?? null,
        agentEmail: null, // will be visible via agent record
      },
    });

    // Reject all other pending requests from other agents
    await (prisma as any).representationRequest.updateMany({
      where: {
        playerId: player.id,
        id: { not: id },
        status: "PENDING",
      },
      data: { status: "REJECTED", respondedAt: new Date() },
    });
  }

  return NextResponse.json({ request: updated, status: newStatus });
}
