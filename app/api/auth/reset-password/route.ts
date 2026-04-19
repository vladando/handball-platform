import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    // Find token
    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });

    if (!resetToken) {
      return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
    }
    if (resetToken.expires < new Date()) {
      await prisma.passwordResetToken.delete({ where: { token } });
      return NextResponse.json({ error: "This reset link has expired. Please request a new one." }, { status: 400 });
    }

    // Update password
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { email: resetToken.email },
      data: { passwordHash },
    });

    // Delete token
    await prisma.passwordResetToken.delete({ where: { token } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
