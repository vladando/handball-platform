import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session||(session.user as any).role!=="PLAYER") return NextResponse.json({ error:"Unauthorized" },{ status:401 });
  const data = await req.json();
  const player = await prisma.player.update({ where:{ userId:(session.user as any).id }, data:{ firstName:data.firstName, lastName:data.lastName, bio:data.bio, nationality:data.nationality, heightCm:+data.heightCm, weightKg:+data.weightKg, position:data.position, dominantHand:data.dominantHand, currentClub:data.currentClub||null, expectedSalary:data.expectedSalary?+data.expectedSalary:null, phone:data.phone||null, agentName:data.agentName||null, agentPhone:data.agentPhone||null, agentEmail:data.agentEmail||null, isAvailable:!!data.isAvailable } });
  return NextResponse.json({ player });
}
