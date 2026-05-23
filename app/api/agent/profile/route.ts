// app/api/agent/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const agent = await prisma.agent.findUnique({
    where: { userId: (session.user as any).id },
  });
  return NextResponse.json({ agent });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await req.json();
  const allowed = ["firstName", "lastName", "bio", "phone", "website", "country", "licenseNumber", "onboardingCompleted"];
  const update: any = {};
  for (const key of allowed) {
    if (key in data) update[key] = data[key];
  }
  const agent = await prisma.agent.update({
    where: { userId: (session.user as any).id },
    data: update,
  });
  return NextResponse.json({ agent });
}
