import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ClubVerifyClient from "./ClubVerifyClient";

export default async function ClubVerifyPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "CLUB") redirect("/auth/login");

  const club = await prisma.club.findUnique({
    where: { userId: (session.user as any).id },
    select: {
      slug: true,
      name: true,
      contactName: true,
      contactTitle: true,
      verificationStatus: true,
      verificationNote: true,
    },
  });

  if (!club) redirect("/auth/login");

  return <ClubVerifyClient club={club} />;
}
