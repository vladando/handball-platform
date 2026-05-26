import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import PlayerDossierClient from "./PlayerDossierClient";

export default async function PlayerDetailPage({
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
      medicalRecords: { orderBy: { createdAt: "desc" }, take: 10 },
      galleryImages: { orderBy: { createdAt: "desc" } },
      videos: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!player) redirect("/dashboard/agent");

  const [contracts, commissions, transfers, agentNotes, generalNotes] = await Promise.all([
    prisma.agentContract.findMany({
      where: { agentId: agent.id, playerId },
      orderBy: { endDate: "asc" },
    }),
    prisma.agentCommission.findMany({
      where: { agentId: agent.id, playerId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.transferRecord.findMany({
      where: { agentId: agent.id, playerId },
      orderBy: { transferDate: "desc" },
    }),
    prisma.agentNote.findMany({
      where: { agentId: agent.id, playerId },
      orderBy: { createdAt: "desc" },
    }),
    (prisma as any).agentGeneralNote.findMany({
      where: { agentId: agent.id, playerId },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    }),
  ]);

  return (
    <PlayerDossierClient
      player={JSON.parse(JSON.stringify(player))}
      contracts={JSON.parse(JSON.stringify(contracts))}
      commissions={JSON.parse(JSON.stringify(commissions))}
      transfers={JSON.parse(JSON.stringify(transfers))}
      agentNotes={JSON.parse(JSON.stringify(agentNotes))}
      generalNotes={JSON.parse(JSON.stringify(generalNotes))}
    />
  );
}
