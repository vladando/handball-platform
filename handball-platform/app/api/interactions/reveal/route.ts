import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

function hashIp(ip: string) { return createHash("sha256").update(ip+(process.env.IP_SALT??"")).digest("hex"); }
function getIp(req: NextRequest) { return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? req.headers.get("x-real-ip") ?? "unknown"; }

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error:"Unauthorized" },{ status:401 });
  if ((session.user as any).role !== "CLUB") return NextResponse.json({ error:"Only clubs may reveal contacts." },{ status:403 });

  const { playerId, tosAccepted, tosVersion } = await req.json();
  if (!tosAccepted||!playerId) return NextResponse.json({ error:"Invalid request." },{ status:400 });

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      const club = await tx.club.findUnique({ where:{ userId:(session.user as any).id }, select:{ id:true, verificationStatus:true, subscriptionStatus:true } });
      if (!club) throw { msg:"Club not found.", status:404 };
      if (!["ACTIVE","TRIAL"].includes(club.subscriptionStatus)) throw { msg:"Active subscription required.",status:402 };
      const player = await tx.player.findUnique({ where:{ id:playerId }, select:{ id:true, isAvailable:true, phone:true, agentName:true, agentPhone:true, agentEmail:true } });
      if (!player) throw { msg:"Player not found.",status:404 };
      const existing = await tx.interaction.findUnique({ where:{ clubId_playerId:{ clubId:club.id, playerId } }, select:{ id:true, createdAt:true } });
      if (!existing) {
        await tx.interaction.create({ data:{ clubId:club.id, playerId, ipAddress:hashIp(getIp(req)), userAgent:req.headers.get("user-agent")??"", acceptedTosAt:new Date(), acceptedTosVersion:tosVersion??"v1.0", commissionStatus:"PENDING", commissionRate:"0.0500" } });
      }
      return { alreadyRevealed:!!existing, contact:{ phone:player.phone, agentName:player.agentName, agentPhone:player.agentPhone, agentEmail:player.agentEmail } };
    });
    return NextResponse.json({ success:true, data:result });
  } catch(err: any) {
    if (err.msg) return NextResponse.json({ error:err.msg },{ status:err.status });
    console.error(err);
    return NextResponse.json({ error:"Internal server error." },{ status:500 });
  }
}
