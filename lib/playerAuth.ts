import { prisma } from "@/lib/prisma";

/**
 * Resolves a player record for the current session.
 * - PLAYER role: looks up player by session userId
 * - AGENT role: verifies the agent owns the player (by agentPlayerId)
 * Returns null if not found or not authorized.
 */
export async function resolvePlayerForSession(
  session: any,
  agentPlayerId?: string | null
): Promise<{ id: string; userId: string } | null> {
  const role = (session?.user as any)?.role;

  if (role === "PLAYER") {
    return prisma.player.findUnique({
      where: { userId: (session.user as any).id },
      select: { id: true, userId: true },
    });
  }

  if (role === "AGENT" && agentPlayerId) {
    const agent = await prisma.agent.findUnique({
      where: { userId: (session.user as any).id },
      select: { id: true },
    });
    if (!agent) return null;

    return prisma.player.findFirst({
      where: { id: agentPlayerId, agentId: agent.id },
      select: { id: true, userId: true },
    });
  }

  return null;
}
