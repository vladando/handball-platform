import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "PLAYER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const { x, y } = await req.json();

  await prisma.player.update({
    where: { userId },
    data: {
      photoPositionX: typeof x === "number" ? x : 50,
      photoPositionY: typeof y === "number" ? y : 50,
    },
  });

  return NextResponse.json({ ok: true });
}
