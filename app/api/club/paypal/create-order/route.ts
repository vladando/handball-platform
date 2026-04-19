import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getBase() {
  return process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getAccessToken() {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${getBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  return data.access_token as string;
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const club = await prisma.club.findUnique({ where: { userId } });
  if (!club) return NextResponse.json({ error: "Club not found." }, { status: 404 });
  if (club.verificationStatus !== "VERIFIED")
    return NextResponse.json({ error: "Club must be verified first." }, { status: 400 });
  if (club.subscriptionStatus === "ACTIVE")
    return NextResponse.json({ error: "Subscription already active." }, { status: 400 });

  try {
    const accessToken = await getAccessToken();
    const res = await fetch(`${getBase()}/v2/checkout/orders`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          amount: { currency_code: "EUR", value: "1.00" },
          description: `HandballHub Annual Subscription - ${club.name}`,
          custom_id: club.id,
        }],
      }),
    });
    const order = await res.json();
    if (!res.ok) throw new Error(order.message || "Failed to create order");
    return NextResponse.json({ orderId: order.id });
  } catch (e: any) {
    console.error("[PayPal] create-order error:", e.message);
    return NextResponse.json({ error: e.message || "Failed to create PayPal order." }, { status: 500 });
  }
}
