import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ClubOnboardingClient from "./ClubOnboardingClient";

export default async function ClubOnboardingPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "CLUB") redirect("/auth/login");

  const userId = (session.user as any).id;
  const club = await prisma.club.findUnique({
    where: { userId },
    select: {
      country: true, city: true, address: true, foundedYear: true,
      leagueName: true,
      contactPhone: true, contactEmail: true, website: true,
      contactName: true, contactTitle: true,
      description: true,
      onboardingCompleted: true,
      slug: true,
    },
  });

  if (!club) redirect("/auth/login");
  // If already completed, send to dashboard
  if (club.onboardingCompleted) redirect("/dashboard/club");

  return <ClubOnboardingClient club={club} />;
}
