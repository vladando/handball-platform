"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";

export default function Nav({ session }: { session: Session | null }) {
  const path = usePathname();
  const role = (session?.user as any)?.role;
  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-logo">Handball<span>Hub</span></Link>
        <ul className="nav-links">
          <li><Link href="/players" className={path.startsWith("/players") ? "active" : ""}>Players</Link></li>
          {role === "CLUB" && <li><Link href="/dashboard/club" className={path.startsWith("/dashboard/club") ? "active" : ""}>Dashboard</Link></li>}
          {role === "PLAYER" && <li><Link href="/dashboard/player" className={path.startsWith("/dashboard/player") ? "active" : ""}>My Profile</Link></li>}
          {role === "ADMIN" && <li><Link href="/admin" className={path.startsWith("/admin") ? "active" : ""}>Admin</Link></li>}
        </ul>
        <div className="nav-actions">
          {session ? (
            <>
              <span style={{ fontSize:"0.8rem", color:"var(--muted)", fontFamily:"var(--font-mono)" }}>{session.user?.email}</span>
              <button onClick={() => signOut({ callbackUrl:"/" })} className="btn btn-outline" style={{ fontSize:"0.8rem", padding:"8px 16px" }}>Sign Out</button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="btn btn-ghost" style={{ fontSize:"0.85rem", padding:"8px 16px" }}>Sign In</Link>
              <Link href="/auth/register" className="btn btn-primary" style={{ fontSize:"0.85rem", padding:"8px 16px" }}>Join Free</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
