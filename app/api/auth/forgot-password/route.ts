import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

    // Always return success to prevent email enumeration
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    if (user) {
      // Delete any existing reset tokens for this email
      await prisma.passwordResetToken.deleteMany({ where: { email: user.email } });

      // Generate a secure random token
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: { email: user.email, token, expires },
      });

      const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

      await sendPasswordResetEmail(user.email, resetUrl);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
