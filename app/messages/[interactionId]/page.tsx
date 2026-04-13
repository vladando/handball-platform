import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ChatWindow from "./ChatWindow";

export default async function ConversationPage({ params }: { params: Promise<{ interactionId: string }> }) {
  const { interactionId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");
  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  const interaction = await prisma.interaction.findUnique({
    where: { id: interactionId },
    include: {
      club: { select: { id: true, name: true, userId: true, logoUrl: true, slug: true } },
      player: { select: { id: true, firstName: true, lastName: true, userId: true, photoUrl: true, slug: true } },
      messages: {
        include: { sender: { select: { id: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!interaction) redirect("/messages");
  const isClub = interaction.club.userId === userId;
  const isPlayer = interaction.player.userId === userId;
  if (!isClub && !isPlayer) redirect("/messages");

  // Mark received as read
  await prisma.message.updateMany({ where: { interactionId, receiverId: userId, isRead: false }, data: { isRead: true } });

  const otherName = isClub ? `${interaction.player.firstName} ${interaction.player.lastName}` : interaction.club.name;
  const otherPhoto = isClub ? interaction.player.photoUrl : interaction.club.logoUrl;
  const otherLink = isClub ? `/players/${interaction.player.slug}` : `/clubs/${interaction.club.slug}`;

  return (
    <main className="page">
      <div className="container" style={{ paddingTop: 40, paddingBottom: 80, maxWidth: 760 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <Link href="/messages" style={{ color: "var(--muted)", fontSize: "0.85rem" }}>← Messages</Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", border: "2px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", background: "var(--card2)" }}>
              {otherPhoto ? <img src={otherPhoto} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : "🏐"}
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>{otherName}</span>
          </div>
        </div>

        <ChatWindow
          interactionId={interactionId}
          initialMessages={interaction.messages as any[]}
          userId={userId}
        />
      </div>
    </main>
  );
}
