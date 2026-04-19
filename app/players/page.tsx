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

  // Only CLUB and ADMIN can browse players
  if (!session || (role !== "CLUB" && role !== "ADMIN")) {
    redirect("/players/access-denied");
  }

  // Check if club is verified
  let isVerified = role === "ADMIN";
  if (role === "CLUB") {
    const userId = (session.user as any).id;
    const club = await prisma.club.findUnique({
      where: { userId },
      select: { verificationStatus: true },
    }).catch(() => null);
    isVerified = club?.verificationStatus === "VERIFIED";
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
        {!isVerified && (
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
        <div className="players-layout">
          <PlayersClient players={players as any} positions={POSITIONS} posLabels={POS_LABELS} nationalities={nationalities} isVerified={isVerified} />
        </div>
      </div>
    </main>
  );
}
