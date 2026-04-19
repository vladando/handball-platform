import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

const POS_SHORT: Record<string, string> = {
  GOALKEEPER:"GK",LEFT_BACK:"LB",RIGHT_BACK:"RB",LEFT_WING:"LW",
  RIGHT_WING:"RW",CENTRE_BACK:"CB",PIVOT:"PV",CENTRE_FORWARD:"CF",
};

async function getData(showPlayers: boolean) {
  try {
    const [players, clubCount, interactionCount] = await Promise.all([
      showPlayers
        ? prisma.player.findMany({ where:{ verificationStatus:"VERIFIED" }, take:6, orderBy:{ createdAt:"desc" } })
        : Promise.resolve([]),
      prisma.club.count({ where:{ verificationStatus:"VERIFIED" } }),
      prisma.interaction.count(),
    ]);
    const playerCount = await prisma.player.count({ where:{ verificationStatus:"VERIFIED" } });
    return { players, stats:{ players:playerCount, clubs:clubCount, interactions:interactionCount } };
  } catch { return { players:[], stats:{ players:0, clubs:0, interactions:0 } }; }
}

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  const canSeePlayers = role === "CLUB" || role === "ADMIN";

  // Fetch player slug for PLAYER role + redirect to onboarding if not completed
  let playerSlug: string | null = null;
  if (role === "PLAYER") {
    const p = await prisma.player.findUnique({
      where: { userId: (session!.user as any).id },
      select: { slug: true, onboardingCompleted: true },
    }).catch(() => null);
    if (p && !p.onboardingCompleted) redirect("/onboarding/player");
    playerSlug = p?.slug ?? null;
  }

  // Check if club is verified + redirect to onboarding if not completed
  let isVerifiedClub = role === "ADMIN";
  let hasSubscription = role === "ADMIN";
  if (role === "CLUB") {
    const userId = (session?.user as any)?.id;
    const club = await prisma.club.findUnique({
      where: { userId },
      select: { verificationStatus: true, onboardingCompleted: true, subscriptionStatus: true },
    }).catch(() => null);
    if (club && !club.onboardingCompleted) redirect("/onboarding/club");
    isVerifiedClub = club?.verificationStatus === "VERIFIED";
    hasSubscription = club?.subscriptionStatus === "ACTIVE";
  }

  // Unread messages count for homepage button badge
  let unreadCount = 0;
  if (role === "PLAYER" || role === "CLUB") {
    unreadCount = await prisma.message.count({
      where: { receiverId: (session!.user as any).id, isRead: false },
    }).catch(() => 0);
  }

  const { players, stats } = await getData(canSeePlayers);

  return (
    <main className="page">
      {/* Hero */}
      <section className="hero-section">
        <div className="container" style={{ position:"relative", zIndex:1 }}>
          <div className="section-label">Professional Handball Transfers</div>
          <h1 style={{ maxWidth:700, marginBottom:24 }}>
            Find Your<br />
            <span style={{ color:"var(--accent)" }}>Next Move</span>
          </h1>
          <p style={{ fontSize:"1.15rem", color:"var(--muted)", maxWidth:520, marginBottom:40, lineHeight:1.7 }}>
            The marketplace where elite handball players meet top clubs. Verified profiles, direct contact, full transparency.
          </p>
          {/* CTA buttons — dynamic based on role */}
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            {!session ? (
              <>
                <Link href="/auth/register?role=PLAYER" className="btn btn-primary" style={{ fontSize:"1rem", padding:"14px 32px" }}>I&apos;m a Player</Link>
                <Link href="/auth/register?role=CLUB" className="btn btn-outline" style={{ fontSize:"1rem", padding:"14px 28px" }}>Represent a Club</Link>
              </>
            ) : role === "CLUB" ? (
              <>
                <Link href="/players" className="btn btn-primary" style={{ fontSize:"1rem", padding:"14px 32px" }}>🔍 Find Players</Link>
                <Link href="/dashboard/club" className="btn btn-outline" style={{ fontSize:"1rem", padding:"14px 28px" }}>Dashboard</Link>
                <Link href="/messages" className="btn btn-outline" style={{ fontSize:"1rem", padding:"14px 28px" }}>
                  💬 Messages{unreadCount > 0 && <span className="nav-badge" style={{ fontSize:"0.7rem", padding:"2px 7px", height:"20px" }}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
                </Link>
              </>
            ) : role === "PLAYER" ? (
              <>
                <Link href={playerSlug ? `/players/${playerSlug}` : "/dashboard/player"} className="btn btn-primary" style={{ fontSize:"1rem", padding:"14px 32px" }}>👤 My Profile</Link>
                <Link href="/dashboard/player?tab=profile" className="btn btn-outline" style={{ fontSize:"1rem", padding:"14px 28px" }}>✏️ Edit Profile</Link>
                <Link href="/messages" className="btn btn-outline" style={{ fontSize:"1rem", padding:"14px 28px" }}>
                  💬 Messages{unreadCount > 0 && <span className="nav-badge" style={{ fontSize:"0.7rem", padding:"2px 7px", height:"20px" }}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
                </Link>
              </>
            ) : (
              <Link href="/admin" className="btn btn-primary" style={{ fontSize:"1rem", padding:"14px 32px" }}>⚙ Admin Panel</Link>
            )}
          </div>

          {/* Static stats */}
          <div className="stats-row">
            {[
              { num:"80+",  label:"Verified Clubs" },
              { num:"120+", label:"Available Players" },
              { num:"100+", label:"Connections Made" },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontFamily:"var(--font-display)", fontWeight:900, fontSize:"3.5rem", color:"var(--accent)", lineHeight:1 }}>{s.num}</div>
                <div style={{ fontSize:"0.8rem", color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.1em", marginTop:4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Competition logos */}
          <div style={{ marginTop:40, paddingTop:32, borderTop:"1px solid rgba(245,243,238,0.08)" }}>
            <div style={{ fontSize:"0.65rem", color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:20 }}>
              Players from top competitions
            </div>
            <div className="league-logos-row">
              {[
                { img:"https://r2.thesportsdb.com/images/media/league/logo/03iuwj1704207321.png",  label:"Champions League", alt:"EHF Champions League" },
                { img:"https://r2.thesportsdb.com/images/media/league/badge/oil7my1704209758.png", label:"European League",  alt:"EHF European League" },
              ].map((c, i, arr) => (
                <div key={c.alt} style={{ display:"flex", alignItems:"center", gap:0 }}>
                  <div className="league-logo-item">
                    <img src={c.img} alt={c.alt} className="league-logo-img" style={{ filter:"brightness(0) invert(1)", opacity:0.6 }} />
                    <span className="league-logo-label">{c.label}</span>
                  </div>
                  {i < arr.length - 1 && <div className="league-logo-sep" />}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ fontFamily:"var(--font-display)", fontWeight:900, fontSize:"clamp(8rem,20vw,18rem)", lineHeight:0.85, color:"transparent", WebkitTextStroke:"1px rgba(245,243,238,0.08)", position:"absolute", right:"-2rem", top:"50%", transform:"translateY(-50%)", pointerEvents:"none", userSelect:"none" }}>7</div>
        <div style={{ position:"absolute", top:0, left:0, right:0, bottom:0, background:"radial-gradient(ellipse at 30% 50%, rgba(232,255,71,0.04) 0%, transparent 60%)", pointerEvents:"none" }} />
      </section>

      {/* Featured Players — only CLUB and ADMIN */}
      {role !== "PLAYER" && <section className="featured-section">
        <div className="container">
          {canSeePlayers ? (
            <>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:40 }}>
                <div>
                  <div className="section-label">Marketplace</div>
                  <h2>Featured Players</h2>
                </div>
                <Link href="/players" className="btn btn-outline" style={{ fontSize:"0.85rem" }}>View All →</Link>
              </div>

              {players.length === 0 ? (
                <div style={{ textAlign:"center", padding:"80px 0", color:"var(--muted)" }}>
                  <div style={{ fontSize:"3rem", marginBottom:16 }}>🏐</div>
                  <p>No verified players listed yet.</p>
                </div>
              ) : (
                <>
                  {!isVerifiedClub && (
                    <div style={{ background:"rgba(232,255,71,0.06)", border:"1px solid rgba(232,255,71,0.25)", borderRadius:"var(--radius-lg)", padding:"14px 20px", marginBottom:24, display:"flex", alignItems:"center", gap:14 }}>
                      <span style={{ fontSize:"1.3rem" }}>🔒</span>
                      <div style={{ fontSize:"0.82rem", color:"var(--muted)" }}>
                        <span style={{ fontFamily:"var(--font-display)", fontWeight:800, color:"var(--accent)", textTransform:"uppercase", marginRight:8 }}>Locked</span>
                        Player details are hidden until your club is verified by an admin.
                      </div>
                    </div>
                  )}
                  {isVerifiedClub && !hasSubscription && (
                    <div style={{ background:"rgba(232,255,71,0.06)", border:"1px solid rgba(232,255,71,0.3)", borderRadius:"var(--radius-lg)", padding:"14px 20px", marginBottom:24, display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
                      <span style={{ fontSize:"1.3rem" }}>💳</span>
                      <div style={{ flex:1 }}>
                        <span style={{ fontFamily:"var(--font-display)", fontWeight:800, color:"var(--accent)", textTransform:"uppercase", marginRight:8, fontSize:"0.82rem" }}>Subscription Required</span>
                        <span style={{ fontSize:"0.82rem", color:"var(--muted)" }}>Subscribe to unlock full player access.</span>
                      </div>
                      <a href="/dashboard/club" style={{ padding:"8px 18px", background:"var(--accent)", color:"var(--black)", borderRadius:"var(--radius)", fontWeight:700, fontSize:"0.82rem", textDecoration:"none", whiteSpace:"nowrap" }}>Subscribe →</a>
                    </div>
                  )}
                  <div className="grid-3">
                    {players.map((p: any) => (
                      <div key={p.id} style={{ position:"relative" }}>
                        <div style={{ filter: (isVerifiedClub && hasSubscription) ? "none" : "blur(7px)", pointerEvents: (isVerifiedClub && hasSubscription) ? "auto" : "none" }}>
                          <Link href={`/players/${p.slug}`} className="player-card">
                            <div className="player-card-photo">
                              {p.photoUrl
                                ? <img src={p.photoUrl} alt={p.firstName} style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:`${p.photoPositionX??50}% ${p.photoPositionY??50}%` }} />
                                : <span style={{ fontSize:"3.5rem", zIndex:1 }}>🏐</span>
                              }
                              <div style={{ position:"absolute", top:12, left:12, zIndex:2 }}>
                                <span className="pos-pill">{POS_SHORT[p.position]}</span>
                              </div>
                              <div style={{ position:"absolute", top:12, right:12, zIndex:2 }}>
                                <span className="badge badge-green">● Available</span>
                              </div>
                            </div>
                            <div className="player-card-body">
                              <div className="player-card-name">{p.firstName} {p.lastName}</div>
                              <div style={{ fontSize:"0.85rem", color:"var(--muted)" }}>
                                {p.nationality} · {p.currentClub ?? "Free Agent"}
                              </div>
                              {p.expectedSalary && (
                                <div style={{ marginTop:8 }}>
                                  <span className="badge badge-accent">€{Math.round(p.expectedSalary/100).toLocaleString()}/yr</span>
                                </div>
                              )}
                            </div>
                            <div className="player-card-stats">
                              <div className="player-card-stat"><div className="val">{p.heightCm}</div><div className="key">cm</div></div>
                              <div className="player-card-stat"><div className="val">{p.weightKg}</div><div className="key">kg</div></div>
                              <div className="player-card-stat"><div className="val">{new Date().getFullYear()-new Date(p.dateOfBirth).getFullYear()}</div><div className="key">age</div></div>
                            </div>
                          </Link>
                        </div>
                        {(!isVerifiedClub || !hasSubscription) && (
                          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6, borderRadius:"var(--radius-lg)" }}>
                            <span style={{ fontSize:"1.8rem" }}>🔒</span>
                            <span style={{ fontSize:"0.68rem", color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.08em", textAlign:"center" }}>
                              {!isVerifiedClub ? "Verify club\nto unlock" : "Subscribe\nto unlock"}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            /* Non-club users see a CTA instead of player cards */
            <div className="cta-grid">
              <div>
                <div className="section-label">Marketplace</div>
                <h2 style={{ marginBottom:16 }}>
                  Find Your<br />
                  <span style={{ color:"var(--accent)" }}>Next Player</span>
                </h2>
                <p style={{ color:"var(--muted)", lineHeight:1.8, marginBottom:28, fontSize:"0.95rem" }}>
                  {role === "PLAYER"
                    ? "As a player, focus on building your profile. Clubs will find and contact you directly."
                    : "The player database is exclusively available to registered and verified clubs."}
                </p>
                <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                  {role === "PLAYER" ? (
                    <Link href="/dashboard/player" className="btn btn-primary">Go to My Profile →</Link>
                  ) : (
                    <>
                      <Link href="/auth/register?role=CLUB" className="btn btn-primary">Register as Club →</Link>
                      <Link href="/auth/login" className="btn btn-outline">Sign In</Link>
                    </>
                  )}
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {[
                  { icon:"🔒", label:"Database Access", desc:"Exclusive to verified clubs" },
                  { icon:"🔍", label:"Advanced Filters", desc:"Position, height, salary, nation" },
                  { icon:"⚡", label:"Direct Contact", desc:"Unlock in one click" },
                  { icon:"📋", label:"Scouting Notes", desc:"Track your shortlist privately" },
                ].map(f => (
                  <div key={f.label} className="card" style={{ textAlign:"center", padding:"20px 16px" }}>
                    <div style={{ fontSize:"2rem", marginBottom:8 }}>{f.icon}</div>
                    <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"0.82rem", textTransform:"uppercase", marginBottom:4 }}>{f.label}</div>
                    <div style={{ fontSize:"0.75rem", color:"var(--muted)" }}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>}

      {/* How it works */}
      <section style={{ padding:"80px 0", borderTop:"1px solid var(--border)", background:"var(--card)" }}>
        <div className="container">
          <div style={{ textAlign:"center", marginBottom:60 }}>
            <div className="section-label" style={{ justifyContent:"center" }}>Platform</div>
            <h2>How It Works</h2>
          </div>
          <div className="grid-3">
            {[
              { icon:"👤", num:"01", title:"Create Profile", desc:"Players build their profile free — bio, stats, video vault, career history, medical records." },
              { icon:"🔍", num:"02", title:"Clubs Search", desc:"Verified clubs use advanced filters — position, height, salary, nationality — to find the perfect match." },
              { icon:"⚡", num:"03", title:"Reveal & Connect", desc:"Clubs unlock player contact details in one click. Players are always free — optional paid promotions and boosts available." },
            ].map(step => (
              <div key={step.num} className="card" style={{ position:"relative", overflow:"hidden" }}>
                <div style={{ fontSize:"0.7rem", fontFamily:"var(--font-mono)", color:"var(--accent)", letterSpacing:"0.1em", marginBottom:16 }}>{step.num}</div>
                <div style={{ fontSize:"2.5rem", marginBottom:16 }}>{step.icon}</div>
                <h4 style={{ textTransform:"uppercase", marginBottom:10 }}>{step.title}</h4>
                <p style={{ color:"var(--muted)", fontSize:"0.9rem", lineHeight:1.7 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — different for logged-in vs guest */}
      {!session ? (
        <section style={{ padding:"100px 0", textAlign:"center" }}>
          <div className="container">
            <div className="section-label" style={{ justifyContent:"center" }}>Join Today — Free</div>
            <h2 style={{ marginBottom:20 }}>
              Ready to Find<br />
              <span style={{ color:"var(--accent)" }}>Your Club?</span>
            </h2>
            <p style={{ color:"var(--muted)", maxWidth:400, margin:"0 auto 40px" }}>
              Players join for free. Clubs get a 14-day trial. No credit card required.
            </p>
            <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
              <Link href="/auth/register?role=PLAYER" className="btn btn-primary" style={{ fontSize:"1rem", padding:"14px 32px" }}>I&apos;m a Player</Link>
              <Link href="/auth/register?role=CLUB" className="btn btn-outline" style={{ fontSize:"1rem", padding:"14px 32px" }}>I Represent a Club</Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="premium-section">
          <div className="container">
            <div className="premium-grid">
              <div>
                <div className="section-label">Premium</div>
                <h2 style={{ marginBottom:16 }}>
                  Stand Out From<br />
                  <span style={{ color:"var(--accent)" }}>The Crowd</span>
                </h2>
                <p style={{ color:"var(--muted)", lineHeight:1.8, fontSize:"0.95rem", marginBottom:28 }}>
                  {role === "PLAYER"
                    ? "Upgrade to Premium and get your profile seen by more clubs. Appear at the top of search results, get a featured badge, and unlock advanced analytics on who's viewing your profile."
                    : "Get your club in front of the best talent. Unlock unlimited player reveals, priority support, and dedicated scouting tools."}
                </p>
                <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:32 }}>
                  {(role === "PLAYER" ? [
                    { icon:"⭐", text:"Featured placement — appear first in search results" },
                    { icon:"📊", text:"Profile analytics — see which clubs viewed you" },
                    { icon:"🏆", text:"Verified Premium badge on your profile" },
                    { icon:"🔔", text:"Priority notification to clubs matching your profile" },
                  ] : [
                    { icon:"🔍", text:"Unlimited player profile reveals" },
                    { icon:"⭐", text:"Priority access to newly verified players" },
                    { icon:"📊", text:"Advanced scouting analytics dashboard" },
                    { icon:"🔔", text:"Dedicated account manager support" },
                  ]).map((item, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12, fontSize:"0.88rem", color:"rgba(245,243,238,0.85)", lineHeight:1.5 }}>
                      <span style={{ flexShrink:0, fontSize:"1rem" }}>{item.icon}</span>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/dashboard/player?tab=premium"
                  className="btn btn-primary"
                  style={{ fontSize:"1rem", padding:"15px 36px", display:"inline-flex" }}
                >
                  ⚡ Upgrade to Premium
                </Link>
              </div>
              <div className="premium-cards">
                {[
                  { icon:"⭐", label:"Top Search Results", desc:"Always appear first when clubs search your position" },
                  { icon:"📊", label:"Profile Analytics", desc:"Track which clubs viewed your profile and when" },
                  { icon:"🏆", label:"Premium Badge", desc:"Stand out with a verified premium profile badge" },
                  { icon:"🔔", label:"Club Alerts", desc:"Get notified instantly when a club shows interest" },
                ].map(f => (
                  <div key={f.label} style={{
                    background:"var(--card2)", border:"1px solid rgba(232,255,71,0.15)",
                    borderRadius:"var(--radius-lg)", padding:"20px 16px", textAlign:"center",
                  }}>
                    <div style={{ fontSize:"2rem", marginBottom:10 }}>{f.icon}</div>
                    <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"0.8rem", textTransform:"uppercase", marginBottom:6, color:"var(--accent)" }}>{f.label}</div>
                    <div style={{ fontSize:"0.75rem", color:"var(--muted)", lineHeight:1.5 }}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer style={{ borderTop:"1px solid var(--border)", padding:"32px 0" }}>
        <div className="container" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16 }}>
          <div style={{ fontFamily:"var(--font-display)", fontWeight:900, fontSize:"1.2rem", textTransform:"uppercase" }}>
            Handball<span style={{ color:"var(--accent)" }}>Hub</span>
          </div>
          <div style={{ fontSize:"0.8rem", color:"var(--muted)" }}>
            © {new Date().getFullYear()} HandballHub · Free for players
          </div>
          <div style={{ display:"flex", gap:24 }}>
            <Link href="/terms" style={{ fontSize:"0.8rem", color:"var(--muted)" }}>Terms &amp; Privacy</Link>
            <Link href="#" style={{ fontSize:"0.8rem", color:"var(--muted)" }}>Contact</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
