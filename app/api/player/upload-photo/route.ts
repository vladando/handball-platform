// app/api/player/upload-photo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;
import { savePlayerImage, deleteLocalFile } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "PLAYER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const player = await prisma.player.findUnique({
    where: { userId: (session.user as any).id },
    select: { id: true, photoUrl: true },
  });
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

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

  const result = await savePlayerImage(player.id, file);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  // Delete old photo if it was a local file
  if (player.photoUrl?.startsWith("/uploads/")) {
    deleteLocalFile(player.photoUrl);
  }

  const updated = await prisma.player.update({
    where: { id: player.id },
    data: { photoUrl: result.url },
    select: { photoUrl: true },
  });

  return NextResponse.json({ photoUrl: updated.photoUrl });
}
