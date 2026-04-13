// app/api/player/gallery/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteLocalFile } from "@/lib/storage";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "PLAYER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const player = await prisma.player.findUnique({
    where: { userId: (session.user as any).id },
    select: { id: true },
  });
  if (!player) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const image = await prisma.playerGalleryImage.findUnique({ where: { id } });
  if (!image || image.playerId !== player.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (image.url.startsWith("/uploads/")) {
    deleteLocalFile(image.url);
  }

  await prisma.playerGalleryImage.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
