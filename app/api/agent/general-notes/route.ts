import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getAgent(session: any) {
  return prisma.agent.findUnique({
    where: { userId: (session.user as any).id },
    select: { id: true },
  });
}

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await getAgent(session);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const notes = await (prisma as any).agentGeneralNote.findMany({
    where: { agentId: agent.id },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });
  return NextResponse.json({ notes });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await getAgent(session);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const { title, content, color } = await req.json();
  if (!content?.trim())
    return NextResponse.json({ error: "Content is required" }, { status: 400 });

  const note = await (prisma as any).agentGeneralNote.create({
    data: {
      agentId: agent.id,
      title: title?.trim() || null,
      content: content.trim(),
      color: color ?? "default",
    },
  });
  return NextResponse.json({ note }, { status: 201 });
}
