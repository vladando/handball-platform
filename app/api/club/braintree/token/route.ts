import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import braintree from "braintree";

function getGateway() {
  return new braintree.BraintreeGateway({
    environment: process.env.BRAINTREE_ENV === "production"
      ? braintree.Environment.Production
      : braintree.Environment.Sandbox,
    merchantId: process.env.BRAINTREE_MERCHANT_ID!,
    publicKey: process.env.BRAINTREE_PUBLIC_KEY!,
    privateKey: process.env.BRAINTREE_PRIVATE_KEY!,
  });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "CLUB")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const club = await prisma.club.findUnique({
    where: { userId },
    select: { verificationStatus: true, subscriptionStatus: true },
  });

  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });
  if (club.verificationStatus !== "VERIFIED")
    return NextResponse.json({ error: "Club must be verified first." }, { status: 400 });
  if (club.subscriptionStatus === "ACTIVE")
    return NextResponse.json({ error: "Subscription already active." }, { status: 400 });

  try {
    const gateway = getGateway();
    const result = await gateway.clientToken.generate({});
    return NextResponse.json({ clientToken: result.clientToken });
  } catch (err: any) {
    console.error("[Braintree] token error:", err?.message);
    return NextResponse.json({ error: "Payment system error." }, { status: 500 });
  }
}
