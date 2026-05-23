import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

function posLabel(p: string) {
  return p?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) ?? "—";
}

function getAge(dob: Date | null | undefined): string {
  if (!dob) return "—";
  return String(Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)));
}

export default async function PitchPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const deck = await prisma.pitchDeck.findUnique({ where: { token } });

  if (!deck) notFound();

  // Check expiry
  if (deck.expiresAt && new Date(deck.expiresAt) < new Date()) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#090909", color: "#f5f3ee", fontFamily: "sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>⏰</div>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", textTransform: "uppercase" }}>Pitch Link Expired</h2>
          <p style={{ color: "#6b6b6b", marginTop: 8 }}>This pitch link has expired. Please contact the agent for a new link.</p>
        </div>
      </div>
    );
  }

  // Increment views (fire and forget)
  prisma.pitchDeck.update({ where: { token }, data: { views: { increment: 1 } } }).catch(() => {});

  // Load agent
  const agent = await prisma.agent.findUnique({
    where: { id: deck.agentId },
    select: { firstName: true, lastName: true, phone: true, website: true, country: true, photoUrl: true },
  });

  // Load players
  const playerIds: string[] = JSON.parse(deck.playerIds);
  const players = await prisma.player.findMany({
    where: { id: { in: playerIds } },
    select: {
      id: true, firstName: true, lastName: true, photoUrl: true, position: true,
      nationality: true, currentClub: true, isAvailable: true, verificationStatus: true,
      dateOfBirth: true, heightCm: true, weightKg: true, dominantHand: true, bio: true,
    },
  });

  // Preserve order from playerIds
  const orderedPlayers = playerIds.map(id => players.find(p => p.id === id)).filter(Boolean);

  return (
    <div style={{ minHeight: "100vh", background: "#090909", color: "#f5f3ee" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@300;400;500;600&display=swap');
        body { font-family: 'Barlow', sans-serif; margin: 0; background: #090909; color: #f5f3ee; }
        * { box-sizing: border-box; }
        .pitch-header { background: #111; border-bottom: 1px solid rgba(245,243,238,0.1); padding: 32px 40px; }
        .pitch-container { max-width: 1100px; margin: 0 auto; padding: 48px 24px; }
        .player-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
        .player-card { background: #111; border: 1px solid rgba(245,243,238,0.1); border-radius: 10px; overflow: hidden; }
        .player-photo { width: 100%; aspect-ratio: 3/4; object-fit: cover; background: #1a1a1a; display: flex; align-items: center; justify-content: center; font-size: 4rem; }
        .player-body { padding: 18px; }
        .badge { display: inline-flex; align-items: center; font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; font-weight: 500; text-transform: uppercase; padding: 3px 8px; border-radius: 2px; }
        .badge-green { background: rgba(0,200,100,0.15); color: #00c864; }
        .badge-accent { background: rgba(232,255,71,0.15); color: #e8ff47; }
        .badge-muted { background: rgba(107,107,107,0.2); color: #6b6b6b; }
        .badge-blue { background: rgba(26,86,255,0.15); color: #6b9fff; }
        @media (max-width: 600px) {
          .pitch-header { padding: 24px 20px; }
          .pitch-container { padding: 32px 16px; }
          .player-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Header */}
      <div className="pitch-header">
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.7rem", color: "#e8ff47", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>
                Agent Presentation
              </div>
              <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(1.8rem, 4vw, 3rem)", textTransform: "uppercase", margin: 0 }}>
                {deck.title}
              </h1>
              {agent && (
                <div style={{ marginTop: 8, color: "#6b6b6b", fontSize: "0.9rem" }}>
                  Presented by <span style={{ color: "#f5f3ee", fontWeight: 600 }}>{agent.firstName} {agent.lastName}</span>
                  {agent.country && ` · ${agent.country}`}
                </div>
              )}
            </div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "1.4rem", color: "#e8ff47", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              HH<span style={{ color: "#f5f3ee" }}>.</span>
            </div>
          </div>

          {deck.message && (
            <div style={{ marginTop: 20, padding: "16px 20px", background: "rgba(232,255,71,0.04)", border: "1px solid rgba(232,255,71,0.15)", borderRadius: 6, fontSize: "0.9rem", lineHeight: 1.7, color: "#d0cfc8", maxWidth: 700 }}>
              {deck.message}
            </div>
          )}
        </div>
      </div>

      {/* Players */}
      <div className="pitch-container">
        <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.72rem", color: "#e8ff47", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            {orderedPlayers.length} Player{orderedPlayers.length !== 1 ? "s" : ""} Available
          </div>
        </div>

        <div className="player-grid">
          {orderedPlayers.map((p: any) => (
            <div key={p.id} className="player-card">
              {/* Photo */}
              <div style={{ position: "relative" }}>
                {p.photoUrl ? (
                  <img src={p.photoUrl} alt={`${p.firstName} ${p.lastName}`}
                    style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", display: "block" }} />
                ) : (
                  <div style={{ width: "100%", aspectRatio: "3/4", background: "linear-gradient(135deg, #1a1a1a, #0d0d0d)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "4rem" }}>
                    👤
                  </div>
                )}
                {/* Position badge overlay */}
                <div style={{ position: "absolute", bottom: 12, left: 12 }}>
                  <span className="badge badge-blue" style={{ fontSize: "0.6rem" }}>{posLabel(p.position)}</span>
                </div>
              </div>

              {/* Info */}
              <div className="player-body">
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "1.4rem", textTransform: "uppercase", lineHeight: 1.05, marginBottom: 6 }}>
                  {p.firstName}<br />{p.lastName}
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                  <span className={`badge ${p.isAvailable ? "badge-green" : "badge-muted"}`}>
                    {p.isAvailable ? "Available" : "Unavailable"}
                  </span>
                  {p.verificationStatus === "VERIFIED" && (
                    <span className="badge badge-accent">✓ Verified</span>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: "rgba(245,243,238,0.06)", borderRadius: 4, overflow: "hidden", marginBottom: 14 }}>
                  {[
                    { key: "Age", val: getAge(p.dateOfBirth) },
                    { key: "Height", val: p.heightCm ? `${p.heightCm}cm` : "—" },
                    { key: "Hand", val: p.dominantHand ?? "—" },
                  ].map(s => (
                    <div key={s.key} style={{ background: "#111", padding: "10px 6px", textAlign: "center" }}>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "#e8ff47" }}>{s.val}</div>
                      <div style={{ fontSize: "0.6rem", color: "#6b6b6b", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.key}</div>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: "0.82rem", color: "#6b6b6b" }}>
                  {p.nationality && <div>🌍 {p.nationality}</div>}
                  {p.currentClub && <div style={{ marginTop: 2 }}>🏟 {p.currentClub}</div>}
                </div>

                {p.bio && (
                  <p style={{ marginTop: 12, fontSize: "0.82rem", color: "#a0a0a0", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {p.bio}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Agent contact footer */}
        {agent && (
          <div style={{ marginTop: 60, padding: "32px 0", borderTop: "1px solid rgba(245,243,238,0.1)", display: "flex", flexWrap: "wrap", gap: 32, alignItems: "flex-start" }}>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.65rem", color: "#e8ff47", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 6 }}>Agent Contact</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "1.4rem", textTransform: "uppercase" }}>
                {agent.firstName} {agent.lastName}
              </div>
              {agent.country && <div style={{ fontSize: "0.85rem", color: "#6b6b6b", marginTop: 2 }}>📍 {agent.country}</div>}
              {agent.phone && <div style={{ fontSize: "0.85rem", color: "#f5f3ee", marginTop: 6 }}>📞 {agent.phone}</div>}
              {agent.website && (
                <div style={{ marginTop: 4 }}>
                  <a href={agent.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.85rem", color: "#e8ff47" }}>🌐 {agent.website}</a>
                </div>
              )}
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.65rem", color: "#6b6b6b", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Powered by
              </div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "1.4rem", color: "#f5f3ee" }}>
                Handball<span style={{ color: "#e8ff47" }}>Hub</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
