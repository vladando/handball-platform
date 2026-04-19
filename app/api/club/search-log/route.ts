import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "CLUB")
    return NextResponse.json({ ok: false });

  const userId = (session.user as any).id;
  const club = await prisma.club.findUnique({ where: { userId }, select: { id: true } });
  if (!club) return NextResponse.json({ ok: false });

  const { position, nationality, minHeight, maxHeight, minAge, maxAge } = await req.json();

  await prisma.clubSearchLog.create({
    data: {
      clubId: club.id,
      position: position || null,
      nationality: nationality || null,
      minHeight: minHeight ? parseInt(minHeight) : null,
      maxHeight: maxHeight ? parseInt(maxHeight) : null,
      minAge: minAge ? parseInt(minAge) : null,
      maxAge: maxAge ? parseInt(maxAge) : null,
    },
  });

  return NextResponse.json({ ok: true });
}
