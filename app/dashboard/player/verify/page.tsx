import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import VerifyClient from "./VerifyClient";

export default async function VerifyPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "PLAYER") redirect("/auth/login");

  const player = await prisma.player.findUnique({
    where: { userId: (session.user as any).id },
    select: {
      slug: true,
      firstName: true,
      verificationStatus: true,
      verificationNote: true,
    },
  });

  if (!player) redirect("/auth/login");

  return <VerifyClient player={player} />;
}
