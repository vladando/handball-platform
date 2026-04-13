// app/players/[slug]/page.tsx
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import PlayerProfileClient from "./PlayerProfileClient";
import PhotoLightbox from "@/components/PhotoLightbox";

const POS_SHORT: Record<string, string> = {
  GOALKEEPER: "GK", LEFT_BACK: "LB", RIGHT_BACK: "RB", LEFT_WING: "LW",
  RIGHT_WING: "RW", CENTRE_BACK: "CB", PIVOT: "PV", CENTRE_FORWARD: "CF",
};

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const player = await prisma.player.findUnique({
    where: { slug },
    include: {
      videos: { orderBy: { sortOrder: "asc" } },
      careerEntries: { orderBy: { startDate: "desc" } },
      medicalRecords: { orderBy: { createdAt: "desc" } },
      galleryImages: { orderBy: { sortOrder: "asc" } },
      user: { select: { email: true } },
    },
  }).catch(() => null);

  if (!player) notFound();

  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  const isClub = role === "CLUB";
  const isAdmin = role === "ADMIN";

  // Fetch club + check verification + load existing interaction
  let isVerifiedClub = false;
  let alreadyRevealed = false;
  let existingInteractionId: string | null = null;
  let existingContact: { email: string | null; phone: string | null; agentName: string | null; agentPhone: string | null; agentEmail: string | null } | null = null;

  if (isClub) {
    const userId = (session?.user as any)?.id;
    const club = await prisma.club.findUnique({
      where: { userId },
      select: { id: true, verificationStatus: true },
    }).catch(() => null);
    isVerifiedClub = club?.verificationStatus === "VERIFIED";

    if (club?.id) {
      const existing = await prisma.interaction.findUnique({
        where: { clubId_playerId: { clubId: club.id, playerId: player.id } },
        select: { id: true },
      }).catch(() => null);
      if (existing) {
        alreadyRevealed = true;
        existingInteractionId = existing.id;
        // Pre-load contact so it shows immediately without another reveal click
        existingContact = {
          email: (player as any).user?.email ?? null,
          phone: player.phone ?? null,
          agentName: player.agentName ?? null,
          agentPhone: player.agentPhone ?? null,
          agentEmail: player.agentEmail ?? null,
        };
      }
    }
  }
  if (isAdmin) isVerifiedClub = true;

  const age = new Date().getFullYear() - new Date(player.dateOfBirth).getFullYear();

  return (
    <main className="page">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
        <div className="container" style={{ paddingTop: 40, paddingBottom: 40 }}>
          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: "0.8rem", color: "var(--muted)" }}>
            <Link href="/players" style={{ color: "var(--muted)" }}>Players</Link>
            <span>/</span>
            <span style={{ color: "var(--white)" }}>{player.firstName} {player.lastName}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 32, alignItems: "center" }}>
            {/* Photo — click to open lightbox */}
            <div style={{ flexShrink: 0 }}>
              {player.photoUrl ? (
                <PhotoLightbox src={player.photoUrl} alt={`${player.firstName} ${player.lastName}`}>
                  <div style={{
                    width: 120, height: 120, borderRadius: "var(--radius-lg)",
                    border: "2px solid var(--border)", overflow: "hidden",
                    cursor: "zoom-in", transition: "border-color 0.2s",
                  }}>
                    <img
                      src={player.photoUrl}
                      alt={player.firstName}
                      style={{
                        width: "100%", height: "100%", objectFit: "cover",
                        objectPosition: `${player.photoPositionX ?? 50}% ${player.photoPositionY ?? 50}%`,
                      }}
                    />
                  </div>
                </PhotoLightbox>
              ) : (
                <div style={{ width: 120, height: 120, borderRadius: "var(--radius-lg)", background: "linear-gradient(135deg,#1a1a1a,#0d0d0d)", border: "2px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem", overflow: "hidden" }}>
                  🏐
                </div>
              )}
            </div>

            {/* Info */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                <span className="pos-pill" style={{ fontSize: "0.75rem" }}>{POS_SHORT[player.position]}</span>
                {player.isAvailable
                  ? <span className="badge badge-green">● Available</span>
                  : <span className="badge badge-muted">Not Available</span>
                }
                {(player as any).verificationStatus === "VERIFIED" && (
                  <span className="badge badge-green" style={{ gap: 4 }}>✅ Verified</span>
                )}
              </div>

              <h2 style={{ marginBottom: 6, fontSize: "clamp(1.8rem, 4vw, 3rem)" }}>
                {player.firstName}{" "}
                <span style={{ color: "var(--accent)" }}>{player.lastName}</span>
              </h2>

              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: "0.85rem", color: "var(--muted)" }}>
                <span>{player.nationality}</span>
                <span>·</span>
                <span>{player.currentClub ?? "Free Agent"}</span>
                <span>·</span>
                <span>{age} yrs</span>
                <span>·</span>
                <span>{player.heightCm}cm / {player.weightKg}kg</span>
              </div>

              {player.expectedSalary && (
                <div style={{ marginTop: 12 }}>
                  <span className="badge badge-accent" style={{ fontSize: "0.8rem", padding: "4px 10px" }}>
                    Asking: €{Math.round(player.expectedSalary / 100).toLocaleString()}/yr
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="container" style={{ paddingTop: 40, paddingBottom: 80 }}>
        <PlayerProfileClient
          player={player as any}
          isClub={isClub}
          isVerifiedClub={isVerifiedClub}
          alreadyRevealed={alreadyRevealed}
          initialInteractionId={existingInteractionId}
          initialContact={existingContact}
        />
      </div>
    </main>
  );
}
