import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "CLUB")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const {
    country, city, address, foundedYear,
    leagueName,
    contactPhone, contactEmail, website,
    contactName, contactTitle,
    description,
  } = await req.json();

  await prisma.club.update({
    where: { userId },
    data: {
      country:      country?.trim()      || "Unknown",
      city:         city?.trim()         || "Unknown",
      address:      address?.trim()      || null,
      foundedYear:  foundedYear ? parseInt(foundedYear) : null,
      leagueName:   leagueName?.trim()   || null,
      contactPhone: contactPhone?.trim() || null,
      contactEmail: contactEmail?.trim() || null,
      website:      website?.trim()      || null,
      contactName:  contactName?.trim()  || null,
      contactTitle: contactTitle?.trim() || null,
      description:  description?.trim()  || null,
      onboardingCompleted: true,
    },
  });

  return NextResponse.json({ ok: true });
}
