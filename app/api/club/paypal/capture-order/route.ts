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

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId } = await req.json();
  if (!orderId) return NextResponse.json({ error: "Order ID required." }, { status: 400 });

  const userId = (session.user as any).id;
  const club = await prisma.club.findUnique({ where: { userId } });
  if (!club) return NextResponse.json({ error: "Club not found." }, { status: 404 });

  try {
    const accessToken = await getAccessToken();
    const res = await fetch(`${getBase()}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
    });
    const capture = await res.json();
    if (!res.ok || capture.status !== "COMPLETED")
      throw new Error(capture.message || "Payment capture failed");

    await prisma.club.update({
      where: { id: club.id },
      data: {
        subscriptionStatus: "ACTIVE",
        subscriptionEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[PayPal] capture-order error:", e.message);
    return NextResponse.json({ error: e.message || "Failed to capture payment." }, { status: 500 });
  }
}
