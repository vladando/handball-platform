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

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await getAgent(session);
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth()));

  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 1);

  const events = await (prisma as any).agentCalendarEvent.findMany({
    where: { agentId: agent.id, eventAt: { gte: from, lt: to } },
    orderBy: { eventAt: "asc" },
  });

  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await getAgent(session);
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { title, description, eventAt } = await req.json();
  if (!title?.trim() || !eventAt)
    return NextResponse.json({ error: "title and eventAt are required" }, { status: 400 });

  const event = await (prisma as any).agentCalendarEvent.create({
    data: {
      agentId: agent.id,
      title: title.trim(),
      description: description?.trim() ?? null,
      eventAt: new Date(eventAt),
    },
  });

  return NextResponse.json({ event }, { status: 201 });
}
