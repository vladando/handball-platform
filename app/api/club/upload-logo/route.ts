// app/api/club/upload-logo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveClubLogo, deleteLocalFile } from "@/lib/storage";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "CLUB") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const club = await prisma.club.findUnique({
    where: { userId: (session.user as any).id },
    select: { id: true, logoUrl: true },
  });
  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });

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

  const result = await saveClubLogo(club.id, file);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  // Delete old logo if it was a local file
  if (club.logoUrl?.startsWith("/uploads/")) {
    deleteLocalFile(club.logoUrl);
  }

  const updated = await prisma.club.update({
    where: { id: club.id },
    data: { logoUrl: result.url },
    select: { logoUrl: true },
  });

  return NextResponse.json({ logoUrl: updated.logoUrl });
}
