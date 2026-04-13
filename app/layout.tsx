import type { Metadata } from "next";
import "./globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Nav from "@/components/Nav";
import { ToastProvider } from "@/components/Toast";
import SessionProvider from "@/components/SessionProvider";
import VerificationBanner from "@/components/VerificationBanner";

export const metadata: Metadata = {
  title: "HandballHub — Professional Transfer Marketplace",
  description: "The marketplace where elite handball players meet top clubs. Verified profiles, direct contact, full transparency.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  // Load verification status only for PLAYER accounts
  let verificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED" | null = null;
  let rejectionNote: string | null = null;
  if (role === "PLAYER") {
    const player = await prisma.player.findUnique({
      where: { userId: (session!.user as any).id },
      select: { verificationStatus: true, verificationNote: true },
    }).catch(() => null);
    verificationStatus = (player?.verificationStatus as any) ?? "UNVERIFIED";
    rejectionNote = player?.verificationNote ?? null;
  }

  return (
    <html lang="en">
      <body>
        <SessionProvider session={session}>
          <ToastProvider>
            <Nav session={session} />
            {verificationStatus && verificationStatus !== "VERIFIED" && (
              <VerificationBanner status={verificationStatus} rejectionNote={rejectionNote} />
            )}
            {verificationStatus === "VERIFIED" && (
              <VerificationBanner status="VERIFIED" />
            )}
            {children}
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
