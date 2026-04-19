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

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  // Load verification status + slug for PLAYER accounts
  let verificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED" | null = null;
  let rejectionNote: string | null = null;
  let playerSlug: string | null = null;
  let onboardingCompleted = false;
  if (role === "PLAYER") {
    const player = await prisma.player.findUnique({
      where: { userId: (session!.user as any).id },
      select: { verificationStatus: true, verificationNote: true, slug: true, onboardingCompleted: true },
    }).catch(() => null);
    verificationStatus = (player?.verificationStatus as any) ?? "UNVERIFIED";
    rejectionNote = player?.verificationNote ?? null;
    playerSlug = player?.slug ?? null;
    onboardingCompleted = player?.onboardingCompleted ?? false;
  }

  // Unread message count for PLAYER and CLUB
  let unreadCount = 0;
  if (role === "PLAYER" || role === "CLUB") {
    unreadCount = await prisma.message.count({
      where: { receiverId: (session!.user as any).id, isRead: false },
    }).catch(() => 0);
  }

  return (
    <html lang="en">
      <body>
        <SessionProvider session={session}>
          <ToastProvider>
            <Nav session={session} playerSlug={playerSlug} unreadCount={unreadCount} />
{verificationStatus && (
              <VerificationBanner
                status={verificationStatus}
                rejectionNote={rejectionNote}
                onboardingCompleted={onboardingCompleted}
              />
            )}
            {children}
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
