import { prisma } from "@/lib/prisma";
import PlayersClient from "./PlayersClient";

const POSITIONS = ["GOALKEEPER","LEFT_BACK","RIGHT_BACK","LEFT_WING","RIGHT_WING","CENTRE_BACK","PIVOT","CENTRE_FORWARD"];
const POS_LABELS: Record<string,string> = {
  GOALKEEPER:"Goalkeeper", LEFT_BACK:"Left Back", RIGHT_BACK:"Right Back",
  LEFT_WING:"Left Wing", RIGHT_WING:"Right Wing", CENTRE_BACK:"Centre Back",
  PIVOT:"Pivot", CENTRE_FORWARD:"Centre Forward",
};

export default async function PlayersPage() {
  const players = await prisma.player.findMany({
    where: { isAvailable: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  }).catch(() => []);

  const nationalities = await prisma.player
    .findMany({ select: { nationality: true }, distinct: ["nationality"] })
    .then(r => r.map((x: any) => x.nationality))
    .catch(() => []);

  return (
    <main className="page">
      <div className="container" style={{ paddingTop:40, paddingBottom:80 }}>
        <div style={{ marginBottom:40 }}>
          <div className="section-label">Transfer Market</div>
          <h2>Available Players <span style={{ color:"var(--accent)", fontSize:"0.6em" }}>{players.length}</span></h2>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"260px 1fr", gap:32, alignItems:"start" }}>
          <PlayersClient players={players as any} positions={POSITIONS} posLabels={POS_LABELS} nationalities={nationalities} />
        </div>
      </div>
    </main>
  );
}
