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
    // Include createdAt so we can use it as the retroactive cutoff
    select: { id: true, createdAt: true },
  });
  if (!agent) return NextResponse.json({ notifications: [] });

  const since30d = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  // Never show notifications for activity that predates the agent's account
  const accountCreatedAt = agent.createdAt;
  const effectiveSince30d = since30d > accountCreatedAt ? since30d : accountCreatedAt;
  const effectiveSince7d = since7d > accountCreatedAt ? since7d : accountCreatedAt;

  // Club unlock notifications — interactions on agent's players (only since account was created)
  const interactions = await prisma.interaction.findMany({
    where: {
      player: { agentId: agent.id },
      createdAt: { gte: effectiveSince30d },
    },
    include: {
      club: { select: { name: true, logoUrl: true, country: true } },
      player: { select: { firstName: true, lastName: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // New free agent players — registered after agent account was created (max 7d lookback)
  const newPlayers = await prisma.player.findMany({
    where: {
      onboardingCompleted: true,
      isAvailable: true,
      agentId: null,
      createdAt: { gte: effectiveSince7d },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      position: true,
      nationality: true,
      createdAt: true,
      slug: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Representation request responses — only those responded to after account creation
  const repRequests = await (prisma as any).representationRequest.findMany({
    where: {
      agentId: agent.id,
      status: { in: ["ACCEPTED", "REJECTED"] },
      respondedAt: { gte: effectiveSince30d },
    },
    include: {
      player: { select: { firstName: true, lastName: true, slug: true } },
    },
    orderBy: { respondedAt: "desc" },
    take: 30,
  });

  const notifications = [
    ...interactions.map((i) => ({
      id: `unlock_${i.id}`,
      type: "club_unlock" as const,
      title: "Club unlocked contact",
      body: `${i.club.name} unlocked ${i.player.firstName} ${i.player.lastName}'s contact`,
      createdAt: i.createdAt.toISOString(),
      link: i.player.slug ? `/players/${i.player.slug}` : null,
    })),
    ...newPlayers.map((p) => ({
      id: `free_agent_${p.id}`,
      type: "new_free_agent" as const,
      title: "New free agent available",
      body: `${p.firstName} ${p.lastName} (${p.position?.replace(/_/g, " ") ?? "Unknown"}) joined HandballHub`,
      createdAt: p.createdAt.toISOString(),
      link: p.slug ? `/players/${p.slug}` : null,
    })),
    ...repRequests.map((r: any) => ({
      id: `rep_request_${r.id}`,
      type: r.status === "ACCEPTED" ? "request_accepted" as const : "request_rejected" as const,
      title: r.status === "ACCEPTED" ? "Representation accepted! 🎉" : "Representation declined",
      body: r.status === "ACCEPTED"
        ? `${r.player.firstName} ${r.player.lastName} accepted your representation request`
        : `${r.player.firstName} ${r.player.lastName} declined your representation request`,
      createdAt: (r.respondedAt ?? r.createdAt).toISOString(),
      link: r.player.slug ? `/players/${r.player.slug}` : null,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ notifications });
}
