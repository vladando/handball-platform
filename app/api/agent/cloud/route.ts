import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveCloudFile, getCloudCategory } from "@/lib/storage";

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
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const files = await (prisma as any).agentCloudFile.findMany({
    where: { agentId: agent.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ files });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await getAgent(session);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: "Invalid form data" }, { status: 400 }); }

  const file = formData.get("file");
  const customName = (formData.get("name") as string | null)?.trim() || null;

  if (!file || !(file instanceof File))
    return NextResponse.json({ error: "File is required." }, { status: 422 });

  const result = await saveCloudFile(agent.id, file);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 422 });

  const category = getCloudCategory(file.type);

  const cloudFile = await (prisma as any).agentCloudFile.create({
    data: {
      agentId: agent.id,
      name: customName ?? file.name,
      originalName: file.name,
      url: result.url,
      size: file.size,
      mimeType: file.type || null,
      category,
    },
  });

  return NextResponse.json({ file: cloudFile }, { status: 201 });
}
