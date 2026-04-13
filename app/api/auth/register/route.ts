import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function makeSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Math.random().toString(36).slice(2, 7);
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const { email, password, name, role } = await req.json();
  if (!email || !password || !name || !role) return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  if (!["PLAYER", "CLUB"].includes(role)) return NextResponse.json({ error: "Invalid role." }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email already registered." }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);
  const registrationIp = getClientIp(req);

  await prisma.$transaction(async (tx: any) => {
    const user = await tx.user.create({ data: { email, passwordHash, role, registrationIp } });
    if (role === "PLAYER") {
      const [firstName, ...rest] = name.split(" ");
      await tx.player.create({
        data: {
          userId: user.id,
          firstName: firstName || name,
          lastName: rest.join(" ") || "—",
          dateOfBirth: new Date("1995-01-01"),
          nationality: "Unknown",
          heightCm: 185,
          weightKg: 85,
          position: "CENTRE_BACK",
          slug: makeSlug(name),
          verificationStatus: "UNVERIFIED",
          isAvailable: true, // visible once verified
        },
      });
    } else {
      await tx.club.create({
        data: {
          userId: user.id,
          name,
          country: "Unknown",
          city: "Unknown",
          contactEmail: email,
          slug: makeSlug(name),
          subscriptionStatus: "TRIAL",
          subscriptionEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      });
    }
  });

  return NextResponse.json({ success: true });
}
