"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import type { Session } from "next-auth";

export default function Nav({ session, playerSlug, unreadCount: initialUnread = 0 }: {
  session: Session | null;
  playerSlug?: string | null;
  unreadCount?: number;
}) {
  const path = usePathname();
  const role = (session?.user as any)?.role;
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const dropdownRef = useRef<HTMLLIElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Sync server-rendered initial value whenever it changes
  useEffect(() => { setUnread(initialUnread); }, [initialUnread]);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [path]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  // Refresh unread count for PLAYER, CLUB and AGENT
  useEffect(() => {
    if (role !== "PLAYER" && role !== "CLUB" && role !== "AGENT") return;
    const fetchCount = () =>
      fetch("/api/messages/unread-count")
        .then(r => r.json())
        .then(d => { if (typeof d.count === "number") setUnread(d.count); })
        .catch(() => {});
    fetchCount();
    const id = setInterval(fetchCount, 30_000);
    return () => clearInterval(id);
  }, [path, role]);

  const profileHref = playerSlug ? `/players/${playerSlug}` : "/dashboard/player";
  const settingsHref = role === "PLAYER" ? "/dashboard/player?tab=settings"
    : role === "CLUB" ? "/dashboard/club?tab=settings"
    : role === "AGENT" ? "/dashboard/agent?tab=settings"
    : null;

  // Shared dropdown link style
  const dropStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 10,
    padding: "12px 16px", fontSize: "0.88rem",
    color: "var(--white)", borderBottom: "1px solid var(--border)",
    transition: "background 0.15s",
  };

  const navLinks = (
    <>
      {role !== "AGENT" && <li><Link href="/players" className={path.startsWith("/players") ? "active" : ""}>Players</Link></li>}
      {role === "CLUB" && <li><Link href="/dashboard/club" className={path.startsWith("/dashboard/club") ? "active" : ""}>Dashboard</Link></li>}
      {role === "PLAYER" && <li><Link href={profileHref} className={path.startsWith("/players/") ? "active" : ""}>My Profile</Link></li>}
      {role === "PLAYER" && <li><Link href="/dashboard/player?tab=profile" className={path === "/dashboard/player" ? "active" : ""}>Edit Profile</Link></li>}
      {(role === "CLUB" || role === "PLAYER") && (
        <li>
          <Link href="/messages" className={path.startsWith("/messages") ? "active" : ""}>
            Messages{unread > 0 && <span className="nav-badge">{unread > 99 ? "99+" : unread}</span>}
          </Link>
        </li>
      )}
      {role === "AGENT" && <>
        <li><Link href="/dashboard/agent?tab=overview" className={path.startsWith("/dashboard/agent") ? "active" : ""}>Dashboard</Link></li>
        <li><Link href="/dashboard/agent?tab=players" className={path.startsWith("/dashboard/agent") ? "active" : ""}>My Players</Link></li>
        <li>
          <Link href="/messages" className={path.startsWith("/messages") ? "active" : ""}>
            Messages{unread > 0 && <span className="nav-badge">{unread > 99 ? "99+" : unread}</span>}
          </Link>
        </li>
      </>}
      {role === "ADMIN" && <li><Link href="/admin" className={path.startsWith("/admin") ? "active" : ""}>Admin</Link></li>}
    </>
  );

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <Link href={role === "AGENT" ? "/dashboard/agent" : "/"} className="nav-logo">
            Handball<span>Hub</span>
          </Link>

          {/* Desktop links */}
          <ul className="nav-links">
            {role !== "AGENT" && <li><Link href="/players" className={path.startsWith("/players") ? "active" : ""}>Players</Link></li>}
            {role === "CLUB" && <li><Link href="/dashboard/club" className={path.startsWith("/dashboard/club") ? "active" : ""}>Dashboard</Link></li>}
            {role === "PLAYER" && <li><Link href={profileHref} className={path.startsWith("/players/") ? "active" : ""}>My Profile</Link></li>}
            {role === "PLAYER" && <li><Link href="/dashboard/player?tab=profile" className={path === "/dashboard/player" ? "active" : ""}>Edit Profile</Link></li>}
            {(role === "CLUB" || role === "PLAYER") && (
              <li>
                <Link href="/messages" className={path.startsWith("/messages") ? "active" : ""}>
                  Messages{unread > 0 && <span className="nav-badge">{unread > 99 ? "99+" : unread}</span>}
                </Link>
              </li>
            )}
            {role === "AGENT" && <>
              <li><Link href="/dashboard/agent?tab=overview" className={path.startsWith("/dashboard/agent") ? "active" : ""}>Dashboard</Link></li>
              <li><Link href="/dashboard/agent?tab=players" className={path.startsWith("/dashboard/agent") ? "active" : ""}>My Players</Link></li>
              <li>
                <Link href="/messages" className={path.startsWith("/messages") ? "active" : ""}>
                  Messages{unread > 0 && <span className="nav-badge">{unread > 99 ? "99+" : unread}</span>}
                </Link>
              </li>
            </>}
            {role === "ADMIN" && <li><Link href="/admin" className={path.startsWith("/admin") ? "active" : ""}>Admin</Link></li>}

            {/* More dropdown */}
            <li ref={dropdownRef} style={{ position: "relative" }}>
              <button
                onClick={() => setDropdownOpen(o => !o)}
                style={{ background: "none", border: "none", cursor: "pointer", color: dropdownOpen ? "var(--accent)" : "var(--muted)", fontSize: "inherit", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, padding: "4px 0" }}
              >
                More <span style={{ fontSize: "0.65rem", transition: "transform 0.2s", display: "inline-block", transform: dropdownOpen ? "rotate(180deg)" : "none" }}>▼</span>
              </button>
              {dropdownOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 10px)", right: 0,
                  background: "var(--card)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius)", minWidth: 200,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                  zIndex: 1000, overflow: "hidden",
                }}>
                  {settingsHref && (
                    <Link href={settingsHref} onClick={() => setDropdownOpen(false)} style={dropStyle}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--card2)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      Settings
                    </Link>
                  )}
                  <Link href="/contact" onClick={() => setDropdownOpen(false)} style={dropStyle}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--card2)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    Contact
                  </Link>
                  <Link href="/terms" onClick={() => setDropdownOpen(false)} style={{ ...dropStyle, borderBottom: "none" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--card2)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    Terms &amp; Privacy
                  </Link>
                </div>
              )}
            </li>
          </ul>

          <div className="nav-actions">
            {session ? (
              <>
                <span className="nav-user-email" style={{ fontSize: "0.8rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                  {(session.user as any)?.name ?? session.user?.email}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="btn btn-outline nav-signout"
                  style={{ fontSize: "0.8rem", padding: "8px 16px" }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="btn btn-outline nav-signin" style={{ fontSize: "0.85rem", padding: "8px 16px" }}>Login</Link>
                <Link href="/auth/register" className="btn btn-primary nav-joinbtn" style={{ fontSize: "0.85rem", padding: "8px 16px" }}>Join Free</Link>
              </>
            )}

            {/* Hamburger button */}
            <button
              className="hamburger"
              onClick={() => setMenuOpen(o => !o)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              <span style={{ transform: menuOpen ? "rotate(45deg) translate(5px, 7px)" : "none" }} />
              <span style={{ opacity: menuOpen ? 0 : 1 }} />
              <span style={{ transform: menuOpen ? "rotate(-45deg) translate(5px, -7px)" : "none" }} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="mobile-menu" role="dialog" aria-label="Navigation menu">
          <ul>
            {navLinks}
            {settingsHref && (
              <li><Link href={settingsHref} className={path.includes("tab=settings") ? "active" : ""}>Settings</Link></li>
            )}
            <li><Link href="/contact" className={path === "/contact" ? "active" : ""}>Contact</Link></li>
            <li><Link href="/terms" className={path === "/terms" ? "active" : ""}>Terms &amp; Privacy</Link></li>
            <div className="mobile-menu-divider" />
            {session ? (
              <li>
                <button
                  className="mobile-menu-btn"
                  onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/" }); }}
                  style={{ color: "var(--red)" }}
                >
                  Sign Out
                </button>
              </li>
            ) : (
              <>
                <li><Link href="/auth/login">Login</Link></li>
                <li><Link href="/auth/register" style={{ color: "var(--accent)" }}>Join Free</Link></li>
              </>
            )}
          </ul>
        </div>
      )}
    </>
  );
}
