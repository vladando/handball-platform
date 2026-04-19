import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSubscriptionActivatedEmail } from "@/lib/email";

// Verify Paddle webhook signature
async function verifyPaddleSignature(req: NextRequest, body: string): Promise<boolean> {
  const secret = process.env.PADDLE_WEBHOOK_SECRET ?? "";
  const signature = req.headers.get("paddle-signature") ?? "";

  if (!signature || !secret) return false;

  // Parse ts and h1 from signature header
  const parts = Object.fromEntries(
    signature.split(";").map(p => p.split("=") as [string, string])
  );
  const ts = parts["ts"];
  const h1 = parts["h1"];
  if (!ts || !h1) return false;

  const payload = `${ts}:${body}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(payload);

  const key = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, msgData);
  const computed = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  return computed === h1;
}

export async function POST(req: NextRequest) {
  const body = await req.text();

  const valid = await verifyPaddleSignature(req, body);
  if (!valid) {
    console.error("[paddle webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.event_type === "transaction.completed") {
    const tx = event.data;
    // clubId stored in custom_data
    const clubId = tx?.custom_data?.clubId ?? tx?.items?.[0]?.custom_data?.clubId;

    if (!clubId) {
      console.error("[paddle webhook] No clubId in custom_data", JSON.stringify(tx?.custom_data));
      return NextResponse.json({ ok: true }); // don't fail, just log
    }

    const endsAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const club = await prisma.club.update({
      where: { id: clubId },
      data: {
        subscriptionStatus: "ACTIVE",
        subscriptionEndsAt: endsAt,
      },
      include: { user: { select: { email: true } } },
    }).catch(err => { console.error("[paddle webhook] DB update failed", err); return null; });

    if (club?.user?.email) {
      sendSubscriptionActivatedEmail(club.user.email, club.name).catch(err =>
        console.error("[paddle webhook] email failed", err)
      );
    }

    console.log(`[paddle webhook] Subscription activated for club ${clubId}`);
  }

  return NextResponse.json({ ok: true });
}
