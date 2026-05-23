// app/api/player/upload-photo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolvePlayerForSession } from "@/lib/playerAuth";

export const maxDuration = 30;
import { savePlayerImage, deleteLocalFile } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || (role !== "PLAYER" && role !== "AGENT")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const agentPlayerId = (formData.get("agentPlayerId") as string) || null;

  const player = await resolvePlayerForSession(session, agentPlayerId);
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  // Get current photoUrl for cleanup
  const existing = await prisma.player.findUnique({
    where: { id: player.id },
    select: { photoUrl: true },
  });

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const result = await savePlayerImage(player.id, file);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  // Delete old photo if it was a local file
  if (existing?.photoUrl?.startsWith("/uploads/")) {
    deleteLocalFile(existing.photoUrl);
  }

  const updated = await prisma.player.update({
    where: { id: player.id },
    data: { photoUrl: result.url },
    select: { photoUrl: true },
  });

  return NextResponse.json({ photoUrl: updated.photoUrl });
}
