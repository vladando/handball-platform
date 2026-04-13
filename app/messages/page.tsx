import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

const POS_SHORT: Record<string, string> = {
  GOALKEEPER:"GK",LEFT_BACK:"LB",RIGHT_BACK:"RB",LEFT_WING:"LW",
  RIGHT_WING:"RW",CENTRE_BACK:"CB",PIVOT:"PV",CENTRE_FORWARD:"CF",
};

export default async function MessagesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");
  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (role === "ADMIN") redirect("/admin");

  let conversations: any[] = [];

  if (role === "CLUB") {
    const club = await prisma.club.findUnique({ where: { userId }, select: { id: true } });
    if (club) {
      const interactions = await prisma.interaction.findMany({
        where: { clubId: club.id },
        include: {
          player: { select: { id: true, firstName: true, lastName: true, photoUrl: true, position: true, slug: true } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
      });
      conversations = await Promise.all(interactions.map(async (i: any) => ({
        ...i,
        unread: await prisma.message.count({ where: { interactionId: i.id, receiverId: userId, isRead: false } }),
      })));
    }
  } else if (role === "PLAYER") {
    const player = await prisma.player.findUnique({ where: { userId }, select: { id: true } });
    if (player) {
      const interactions = await prisma.interaction.findMany({
        where: { playerId: player.id },
        include: {
          club: { select: { id: true, name: true, logoUrl: true, country: true, slug: true } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
      });
      conversations = await Promise.all(interactions.map(async (i: any) => ({
        ...i,
        unread: await prisma.message.count({ where: { interactionId: i.id, receiverId: userId, isRead: false } }),
      })));
    }
  }

  return (
    <main className="page">
      <div className="container" style={{ paddingTop: 40, paddingBottom: 80, maxWidth: 760 }}>
        <div className="section-label">Inbox</div>
        <h2 style={{ marginBottom: 32 }}>Messages</h2>

        {conversations.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "60px 24px", color: "var(--muted)" }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>💬</div>
            <p>No conversations yet.</p>
            <p style={{ fontSize: "0.85rem", marginTop: 8 }}>
              {role === "CLUB" ? "Reveal a player's contact to start a conversation." : "Clubs that reveal your contact can message you here."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {conversations.map((c: any) => {
              const lastMsg = c.messages?.[0];
              const isClub = role === "CLUB";
              const name = isClub ? `${c.player.firstName} ${c.player.lastName}` : c.club.name;
              const sub = isClub ? POS_SHORT[c.player.position] : c.club.country;
              const photo = isClub ? c.player.photoUrl : c.club.logoUrl;
              return (
                <Link key={c.id} href={`/messages/${c.id}`} style={{ textDecoration: "none" }}>
                  <div className="card" style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", cursor: "pointer", borderColor: c.unread > 0 ? "var(--accent)" : undefined }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--card2)", border: "2px solid var(--border)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>
                      {photo ? <img src={photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : "🏐"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem" }}>{name}</span>
                        {lastMsg && <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{new Date(lastMsg.createdAt).toLocaleDateString()}</span>}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.82rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 400 }}>
                          {lastMsg ? lastMsg.content : <em>No messages yet — start the conversation!</em>}
                        </span>
                        {c.unread > 0 && (
                          <span style={{ background: "var(--accent)", color: "var(--black)", fontSize: "0.7rem", fontWeight: 800, padding: "2px 8px", borderRadius: 999, flexShrink: 0, marginLeft: 8 }}>{c.unread}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
