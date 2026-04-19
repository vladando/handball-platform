import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import braintree from "braintree";
import { sendClubVerifiedEmail } from "@/lib/email";

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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "CLUB")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { nonce } = await req.json();
  if (!nonce) return NextResponse.json({ error: "Missing payment nonce." }, { status: 400 });

  const userId = (session.user as any).id;
  const club = await prisma.club.findUnique({
    where: { userId },
    include: { user: { select: { email: true } } },
  });

  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });
  if (club.verificationStatus !== "VERIFIED")
    return NextResponse.json({ error: "Club must be verified first." }, { status: 400 });
  if (club.subscriptionStatus === "ACTIVE")
    return NextResponse.json({ error: "Subscription already active." }, { status: 400 });

  try {
    const gateway = getGateway();
    const result = await gateway.transaction.sale({
      amount: "1.00",
      paymentMethodNonce: nonce,
      orderId: `handballhub-${club.id}-${Date.now()}`,
      options: { submitForSettlement: true },
    });

    if (!result.success) {
      console.error("[Braintree] transaction failed:", result.message);
      return NextResponse.json({ error: result.message || "Payment failed." }, { status: 400 });
    }

    // Activate subscription
    const endsAt = new Date();
    endsAt.setFullYear(endsAt.getFullYear() + 1);

    await prisma.club.update({
      where: { id: club.id },
      data: { subscriptionStatus: "ACTIVE", subscriptionEndsAt: endsAt },
    });

    // Send confirmation email
    if (club.user?.email) {
      await sendClubVerifiedEmail(club.user.email, club.name).catch(() => {});
    }

    return NextResponse.json({ success: true, transactionId: result.transaction.id });
  } catch (err: any) {
    console.error("[Braintree] checkout error:", err?.message);
    return NextResponse.json({ error: "Payment processing error." }, { status: 500 });
  }
}
