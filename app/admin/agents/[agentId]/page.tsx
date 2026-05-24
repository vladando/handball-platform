import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import AgentDashboardClient from "@/app/dashboard/agent/AgentDashboardClient";

export default async function AdminAgentViewPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") redirect("/");

  const { agentId } = await params;

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      players: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true, firstName: true, lastName: true, photoUrl: true,
          position: true, nationality: true, currentClub: true,
          verificationStatus: true, isAvailable: true, slug: true,
          dateOfBirth: true, heightCm: true, weightKg: true,
          dominantHand: true, bio: true, phone: true,
          expectedSalaryMin: true, expectedSalaryMax: true,
          achievements: true, defensivePosition: true, createdAt: true,
          onboardingCompleted: true,
          healthStatus: true, rehabNote: true, rehabReturnDate: true,
        },
      },
      contracts: {
        include: { player: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { endDate: "asc" },
      },
      commissions: {
        include: { player: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { dueDate: "asc" },
      },
      transfers: {
        include: { player: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { transferDate: "desc" },
      },
      pitchDecks: {
        orderBy: { createdAt: "desc" },
      },
      calendarEvents: {
        orderBy: { eventAt: "asc" },
      },
    },
  });

  if (!agent) redirect("/admin?tab=agents");

  return (
    <>
      {/* Admin banner — fixed at top, above everything */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: "rgba(255,59,59,0.95)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(255,59,59,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 20px",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "1.1rem" }}>🔴</span>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#fff" }}>
              Admin View — Read-only preview
            </div>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.8)", marginTop: 1 }}>
              Viewing dashboard of: <strong>{agent.firstName} {agent.lastName}</strong>
              {(agent as any).user?.email ? ` · ${(agent as any).user.email}` : ""}
            </div>
          </div>
        </div>
        <Link
          href="/admin?tab=agents"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: "var(--radius)",
            color: "#fff",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "0.75rem",
            textTransform: "uppercase",
            textDecoration: "none",
            letterSpacing: "0.05em",
          }}
        >
          ← Back to Admin
        </Link>
      </div>

      {/* Push content down so banner doesn't overlap */}
      <div style={{ paddingTop: 52 }}>
        <AgentDashboardClient agent={agent as any} adminView />
      </div>
    </>
  );
}
