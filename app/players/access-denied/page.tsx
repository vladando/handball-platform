import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function PlayersAccessDeniedPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  const isPlayer = role === "PLAYER";

  return (
    <main className="page">
      <div className="container" style={{ paddingTop: 80, paddingBottom: 80, maxWidth: 600, textAlign: "center" }}>
        <div style={{ fontSize: "4rem", marginBottom: 24 }}>🔒</div>
        <div className="section-label" style={{ marginBottom: 16 }}>Restricted Area</div>
        <h2 style={{ marginBottom: 16 }}>
          Player Database is <span style={{ color: "var(--accent)" }}>Club Only</span>
        </h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.8, fontSize: "0.95rem", marginBottom: 32 }}>
          {isPlayer
            ? "As a player, you have your own public profile page. The player database is reserved for verified clubs looking to sign players."
            : "Access to the player database requires a registered club account. Sign up as a club to search and contact players."}
        </p>

        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          {!session ? (
            <>
              <Link href="/auth/register?role=CLUB" className="btn btn-primary">Register as Club →</Link>
              <Link href="/auth/login" className="btn btn-outline">Sign In</Link>
            </>
          ) : isPlayer ? (
            <Link href={`/dashboard/player`} className="btn btn-primary">Go to My Profile →</Link>
          ) : (
            <Link href="/auth/register?role=CLUB" className="btn btn-primary">Register as Club →</Link>
          )}
          <Link href="/" className="btn btn-ghost">Back to Home</Link>
        </div>
      </div>
    </main>
  );
}
