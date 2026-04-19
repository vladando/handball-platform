import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "CLUB")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const club = await prisma.club.findUnique({
    where: { userId },
    include: { user: { select: { email: true } } },
  });

  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });
  if (club.verificationStatus !== "VERIFIED")
    return NextResponse.json({ error: "Club must be verified first." }, { status: 400 });
  if (club.subscriptionStatus === "ACTIVE")
    return NextResponse.json({ error: "Already active." }, { status: 400 });

  // Store clubId in Paddle custom data via the client-side checkout
  // Return the price ID and customer email for Paddle.js inline checkout
  return NextResponse.json({
    priceId: process.env.PADDLE_PRICE_ID,
    clientToken: process.env.PADDLE_CLIENT_TOKEN,
    customerEmail: club.user?.email ?? "",
    clubId: club.id,
  });
}
