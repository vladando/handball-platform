import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolvePlayerForSession } from "@/lib/playerAuth";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || (role !== "PLAYER" && role !== "AGENT"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { agentPlayerId, x, y } = body;

  const player = await resolvePlayerForSession(session, agentPlayerId);
  if (!player) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.player.update({
    where: { id: player.id },
    data: {
      photoPositionX: typeof x === "number" ? x : 50,
      photoPositionY: typeof y === "number" ? y : 50,
    },
  });

  return NextResponse.json({ ok: true });
}
