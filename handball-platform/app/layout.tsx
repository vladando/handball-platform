import type { Metadata } from "next";
import "./globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Nav from "@/components/Nav";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "HandballHub — Transfer Marketplace",
  description: "Professional handball transfer marketplace connecting elite players and clubs.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <Nav session={session} />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
