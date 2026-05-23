import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AgentPlayerEditClient from "./AgentPlayerEditClient";

export default async function AgentPlayerEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT") redirect("/auth/login");

  const { id: playerId } = await params;

  const agent = await prisma.agent.findUnique({
    where: { userId: (session.user as any).id },
    select: { id: true },
  });
  if (!agent) redirect("/auth/login");

  const player = await prisma.player.findFirst({
    where: { id: playerId, agentId: agent.id },
    include: {
      careerEntries: { orderBy: { startDate: "desc" } },
      medicalRecords: { orderBy: { createdAt: "desc" } },
      videos: { orderBy: { sortOrder: "asc" } },
      galleryImages: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!player) redirect("/dashboard/agent");

  return <AgentPlayerEditClient player={player as any} />;
}
