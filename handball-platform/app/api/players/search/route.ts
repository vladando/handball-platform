import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams: p } = new URL(req.url);
  const where: any = { isAvailable:true };
  if (p.get("position")) where.position = p.get("position");
  if (p.get("nationality")) where.nationality = { contains:p.get("nationality"), mode:"insensitive" };
  if (p.get("minH")) where.heightCm = { ...where.heightCm, gte:+p.get("minH")! };
  if (p.get("maxH")) where.heightCm = { ...where.heightCm, lte:+p.get("maxH")! };
  if (p.get("minSalary")) where.expectedSalary = { lte:+p.get("minSalary")!*100 };
  if (p.get("q")) { const q=p.get("q")!; where.OR=[{ firstName:{ contains:q,mode:"insensitive" } },{ lastName:{ contains:q,mode:"insensitive" } },{ currentClub:{ contains:q,mode:"insensitive" } }]; }
  const players = await prisma.player.findMany({ where, take:50, orderBy:{ createdAt:"desc" } }).catch(() => []);
  return NextResponse.json({ players });
}
