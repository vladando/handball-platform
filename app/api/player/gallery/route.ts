// app/api/player/gallery/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { savePlayerImage } from "@/lib/storage";

export const maxDuration = 30;

// GET /api/player/gallery — list gallery images for logged-in player
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "PLAYER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const player = await prisma.player.findUnique({
    where: { userId: (session.user as any).id },
    select: { id: true },
  });
  if (!player) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const images = await prisma.playerGalleryImage.findMany({
    where: { playerId: player.id },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ images });
}

// POST /api/player/gallery — upload a new gallery image
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "PLAYER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const player = await prisma.player.findUnique({
    where: { userId: (session.user as any).id },
    select: { id: true },
  });
  if (!player) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Max 12 gallery images
  const count = await prisma.playerGalleryImage.count({ where: { playerId: player.id } });
  if (count >= 12) {
    return NextResponse.json({ error: "Maximum 12 gallery images allowed." }, { status: 422 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const caption = (formData.get("caption") as string) ?? "";

  const result = await savePlayerImage(player.id, file);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  const image = await prisma.playerGalleryImage.create({
    data: {
      playerId: player.id,
      url: result.url!,
      caption: caption || null,
      sortOrder: count,
    },
  });

  return NextResponse.json({ image }, { status: 201 });
}
