import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import PlayersClient from "./PlayersClient";

const POSITIONS = ["GOALKEEPER","LEFT_BACK","RIGHT_BACK","LEFT_WING","RIGHT_WING","CENTRE_BACK","PIVOT","CENTRE_FORWARD"];
const POS_LABELS: Record<string,string> = {
  GOALKEEPER:"Goalkeeper", LEFT_BACK:"Left Back", RIGHT_BACK:"Right Back",
  LEFT_WING:"Left Wing", RIGHT_WING:"Right Wing", CENTRE_BACK:"Centre Back",
  PIVOT:"Pivot", CENTRE_FORWARD:"Centre Forward",
};

export default async function PlayersPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  // CLUB, AGENT, and ADMIN can browse players
  if (!session || (role !== "CLUB" && role !== "AGENT" && role !== "ADMIN")) {
    redirect("/players/access-denied");
  }

  // Check verification/access per role
  let isVerified = role === "ADMIN";
  let hasSubscription = role === "ADMIN";
  let isAgent = false;

  if (role === "CLUB") {
    const userId = (session.user as any).id;
    const club = await prisma.club.findUnique({
      where: { userId },
      select: { verificationStatus: true, subscriptionStatus: true },
    }).catch(() => null);
    isVerified = club?.verificationStatus === "VERIFIED";
    hasSubscription = club?.subscriptionStatus === "ACTIVE";
  }

  if (role === "AGENT") {
    const userId = (session.user as any).id;
    const agent = await prisma.agent.findUnique({
      where: { userId },
      select: { onboardingCompleted: true },
    }).catch(() => null);
    // Agents with completed onboarding get full access (no subscription required)
    isAgent = true;
    isVerified = agent?.onboardingCompleted === true;
    hasSubscription = isVerified; // agents don't need subscription
  }

  const players = await prisma.player.findMany({
    where: { verificationStatus: "VERIFIED" },
    orderBy: { createdAt: "desc" },
    take: 100,
  }).catch(() => []);

  const nationalities = await prisma.player
    .findMany({ where: { verificationStatus: "VERIFIED" }, select: { nationality: true }, distinct: ["nationality"] })
    .then(r => r.map((x: any) => x.nationality))
    .catch(() => []);

  return (
    <main className="page">
      <div className="container" style={{ paddingTop:40, paddingBottom:80 }}>
        <div style={{ marginBottom:40 }}>
          <div className="section-label">Transfer Market</div>
          <h2>Available Players <span style={{ color:"var(--accent)", fontSize:"0.6em" }}>{players.length}</span></h2>
        </div>
        {!isVerified && role === "CLUB" && (
          <div style={{ background:"rgba(232,255,71,0.06)", border:"1px solid rgba(232,255,71,0.25)", borderRadius:"var(--radius-lg)", padding:"16px 24px", marginBottom:32, display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
            <span style={{ fontSize:"1.6rem" }}>🔒</span>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"0.9rem", textTransform:"uppercase", color:"var(--accent)", marginBottom:4 }}>
                Club Verification Required
              </div>
              <div style={{ fontSize:"0.82rem", color:"var(--muted)" }}>
                Player database is locked until an admin verifies your club. You can see how many players are available, but all details are hidden.
              </div>
            </div>
          </div>
        )}
        {!isVerified && role === "AGENT" && (
          <div style={{ background:"rgba(232,255,71,0.06)", border:"1px solid rgba(232,255,71,0.25)", borderRadius:"var(--radius-lg)", padding:"16px 24px", marginBottom:32, display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
            <span style={{ fontSize:"1.6rem" }}>🔒</span>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"0.9rem", textTransform:"uppercase", color:"var(--accent)", marginBottom:4 }}>
                Complete Agent Onboarding
              </div>
              <div style={{ fontSize:"0.82rem", color:"var(--muted)" }}>
                Finish setting up your agent profile to access the player database.
              </div>
            </div>
            <a href="/onboarding/agent" style={{ padding:"10px 20px", background:"var(--accent)", color:"var(--black)", borderRadius:"var(--radius)", fontWeight:700, fontSize:"0.85rem", textDecoration:"none", whiteSpace:"nowrap" }}>
              Complete Setup →
            </a>
          </div>
        )}
        {isVerified && !hasSubscription && role === "CLUB" && (
          <div style={{ background:"rgba(232,255,71,0.06)", border:"1px solid rgba(232,255,71,0.3)", borderRadius:"var(--radius-lg)", padding:"20px 24px", marginBottom:32, display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
            <span style={{ fontSize:"1.6rem" }}>💳</span>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"0.9rem", textTransform:"uppercase", color:"var(--accent)", marginBottom:4 }}>
                Subscription Required
              </div>
              <div style={{ fontSize:"0.82rem", color:"var(--muted)" }}>
                Your club is verified but your subscription is not active. Subscribe for €1,000/year to unlock full player access.
              </div>
            </div>
            <a href="/dashboard/club" style={{ padding:"10px 20px", background:"var(--accent)", color:"var(--black)", borderRadius:"var(--radius)", fontWeight:700, fontSize:"0.85rem", textDecoration:"none", whiteSpace:"nowrap" }}>
              Subscribe →
            </a>
          </div>
        )}
        <div className="players-layout">
          <PlayersClient
            players={players as any}
            positions={POSITIONS}
            posLabels={POS_LABELS}
            nationalities={nationalities}
            isVerified={isVerified && hasSubscription}
            isAgent={isAgent}
          />
        </div>
      </div>
    </main>
  );
}
