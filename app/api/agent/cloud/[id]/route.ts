import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteLocalFile } from "@/lib/storage";

async function getAgent(session: any) {
  return prisma.agent.findUnique({
    where: { userId: (session.user as any).id },
    select: { id: true },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await getAgent(session);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const { id } = await params;
  const existing = await (prisma as any).agentCloudFile.findFirst({
    where: { id, agentId: agent.id },
  });
  if (!existing) return NextResponse.json({ error: "File not found" }, { status: 404 });

  const body = await req.json();
  const file = await (prisma as any).agentCloudFile.update({
    where: { id },
    data: {
      name: body.name?.trim() ?? existing.name,
      notes: body.notes !== undefined ? (body.notes?.trim() ?? null) : existing.notes,
    },
  });

  return NextResponse.json({ file });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await getAgent(session);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const { id } = await params;
  const existing = await (prisma as any).agentCloudFile.findFirst({
    where: { id, agentId: agent.id },
  });
  if (!existing) return NextResponse.json({ error: "File not found" }, { status: 404 });

  // Delete from storage
  deleteLocalFile(existing.url);

  await (prisma as any).agentCloudFile.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
