import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  if ((session.user as any).id === id)
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { player: true, club: true },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await prisma.$transaction(async (tx: any) => {

      // ── Messages ──────────────────────────────────────────────
      await tx.message.deleteMany({
        where: { OR: [{ senderId: id }, { receiverId: id }] },
      });

      // ── Sessions & Accounts (NextAuth) ────────────────────────
      await tx.session.deleteMany({ where: { userId: id } });
      await tx.account.deleteMany({ where: { userId: id } });

      // ── Password reset tokens ─────────────────────────────────
      if (user.email) {
        await tx.passwordResetToken.deleteMany({ where: { email: user.email } });
      }

      // ── Player related ────────────────────────────────────────
      if (user.player) {
        const playerId = user.player.id;

        await tx.videoVault.deleteMany({ where: { playerId } });
        await tx.careerEntry.deleteMany({ where: { playerId } });
        await tx.medicalRecord.deleteMany({ where: { playerId } });
        await tx.playerGalleryImage.deleteMany({ where: { playerId } });
        await tx.interaction.deleteMany({ where: { playerId } });
        await tx.watchlistItem.deleteMany({ where: { playerId } });
        await tx.scoutingNote.deleteMany({ where: { playerId } });

        await tx.player.delete({ where: { id: playerId } });
      }

      // ── Club related ──────────────────────────────────────────
      if (user.club) {
        const clubId = user.club.id;

        await tx.interaction.deleteMany({ where: { clubId } });
        await tx.watchlistItem.deleteMany({ where: { clubId } });
        await tx.scoutingNote.deleteMany({ where: { clubId } });

        await tx.club.delete({ where: { id: clubId } });
      }

      // ── Admin profile ─────────────────────────────────────────
      await tx.adminProfile.deleteMany({ where: { userId: id } });

      // ── User ──────────────────────────────────────────────────
      await tx.user.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/delete-user]", err);
    return NextResponse.json({ error: "Failed to delete user." }, { status: 500 });
  }
}
