import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

const transporter: Transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const APP_URL = process.env.NEXTAUTH_URL ?? "https://handballhub.net";
const ADMIN_EMAIL = process.env.SMTP_USER ?? "handballhub@handballhub.net";

function logo() {
  return `<div style="text-align:center;margin-bottom:32px;">
    <span style="font-size:1.6rem;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;font-family:Arial,sans-serif;">
      Handball<span style="color:#e8ff47;">Hub</span>
    </span>
  </div>`;
}

function footer() {
  return `<p style="color:#555;font-size:0.78rem;margin-top:28px;line-height:1.6;border-top:1px solid #222;padding-top:20px;">
    HandballHub — The professional handball transfer platform<br/>
    <a href="${APP_URL}" style="color:#888;">${APP_URL}</a>
  </p>`;
}

// ── Welcome email (player or club) ────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string, role: "PLAYER" | "CLUB") {
  const isPlayer = role === "PLAYER";
  await transporter.sendMail({
    from: `"HandballHub" <${ADMIN_EMAIL}>`,
    to,
    subject: isPlayer ? "Welcome to HandballHub — Complete Your Profile" : "Welcome to HandballHub — Set Up Your Club",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0d0d0d;color:#f5f3ee;padding:40px 32px;border-radius:12px;">
        ${logo()}
        <h2 style="margin:0 0 12px;font-size:1.3rem;">Welcome, ${name}! 👋</h2>
        <p style="color:#888;line-height:1.7;margin:0 0 20px;">
          Your account has been created. You are now part of the HandballHub community —
          the professional platform connecting ${isPlayer ? "players with clubs" : "clubs with top handball talent"}.
        </p>
        ${isPlayer ? `
        <div style="background:rgba(232,255,71,0.06);border:1px solid rgba(232,255,71,0.2);border-radius:8px;padding:16px 20px;margin-bottom:24px;">
          <div style="font-weight:700;color:#e8ff47;margin-bottom:10px;text-transform:uppercase;font-size:0.85rem;">Your next steps</div>
          <div style="color:#ccc;font-size:0.88rem;line-height:1.9;">
            ✓ Complete your player profile<br/>
            ✓ Upload verification documents (passport + selfie)<br/>
            ✓ Add your career history and highlight videos<br/>
            ✓ Get verified and appear in club searches
          </div>
        </div>
        <a href="${APP_URL}/onboarding/player"
           style="display:block;text-align:center;background:#e8ff47;color:#000;font-weight:700;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:1rem;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;">
          Complete Your Profile →
        </a>` : `
        <div style="background:rgba(232,255,71,0.06);border:1px solid rgba(232,255,71,0.2);border-radius:8px;padding:16px 20px;margin-bottom:24px;">
          <div style="font-weight:700;color:#e8ff47;margin-bottom:10px;text-transform:uppercase;font-size:0.85rem;">Your next steps</div>
          <div style="color:#ccc;font-size:0.88rem;line-height:1.9;">
            1. Complete your club profile (contact, location, league)<br/>
            2. Submit verification documents:<br/>
            &nbsp;&nbsp;&nbsp;• Official club registration certificate<br/>
            &nbsp;&nbsp;&nbsp;• Authorization letter confirming your role<br/>
            &nbsp;&nbsp;&nbsp;• Passport / ID of the authorized representative<br/>
            3. Wait for admin approval (24–48 hours)<br/>
            4. Get full access to the player database
          </div>
        </div>
        <div style="background:rgba(255,255,255,0.03);border:1px solid #222;border-radius:8px;padding:14px 18px;margin-bottom:24px;font-size:0.85rem;color:#aaa;line-height:1.7;">
          ⚠️ <strong style="color:#f5f3ee;">Verification required</strong> — Club accounts must be verified before accessing the player database.
          Our team reviews all documents within <strong style="color:#f5f3ee;">24–48 hours</strong>.
        </div>
        <a href="${APP_URL}/onboarding/club"
           style="display:block;text-align:center;background:#e8ff47;color:#000;font-weight:700;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:1rem;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;">
          Set Up Your Club →
        </a>`}
        ${footer()}
      </div>
    `,
  });
}

// ── Admin notification — new club registered ──────────────────────

export async function sendAdminNewClubEmail(clubName: string, email: string, registrationIp: string) {
  await transporter.sendMail({
    from: `"HandballHub" <${ADMIN_EMAIL}>`,
    to: ADMIN_EMAIL,
    subject: `[HandballHub] New club registered: ${clubName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0d0d0d;color:#f5f3ee;padding:40px 32px;border-radius:12px;">
        ${logo()}
        <h2 style="margin:0 0 16px;font-size:1.2rem;">🏟 New Club Registration</h2>
        <div style="background:#111;border:1px solid #2a2a2a;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
          <table style="width:100%;border-collapse:collapse;font-size:0.88rem;">
            <tr><td style="color:#666;padding:4px 0;width:130px;">Club name</td><td style="color:#f5f3ee;font-weight:700;">${clubName}</td></tr>
            <tr><td style="color:#666;padding:4px 0;">Email</td><td style="color:#f5f3ee;">${email}</td></tr>
            <tr><td style="color:#666;padding:4px 0;">IP address</td><td style="color:#f5f3ee;font-family:monospace;">${registrationIp}</td></tr>
            <tr><td style="color:#666;padding:4px 0;">Registered</td><td style="color:#f5f3ee;">${new Date().toLocaleString()}</td></tr>
          </table>
        </div>
        <p style="color:#888;font-size:0.88rem;line-height:1.6;margin-bottom:20px;">
          This club will need to complete onboarding and submit verification documents before they can access the player database.
        </p>
        <a href="${APP_URL}/admin"
           style="display:block;text-align:center;background:#e8ff47;color:#000;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:0.9rem;text-transform:uppercase;letter-spacing:0.05em;">
          Open Admin Panel →
        </a>
        ${footer()}
      </div>
    `,
  });
}

// ── Club: docs submitted, awaiting review ─────────────────────────

export async function sendClubDocsSubmittedEmail(to: string, clubName: string) {
  await transporter.sendMail({
    from: `"HandballHub" <${ADMIN_EMAIL}>`,
    to,
    subject: "HandballHub — Verification Documents Received",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0d0d0d;color:#f5f3ee;padding:40px 32px;border-radius:12px;">
        ${logo()}
        <h2 style="margin:0 0 12px;font-size:1.3rem;">⏳ Documents Received</h2>
        <p style="color:#888;line-height:1.7;margin:0 0 20px;">
          Hi, we have received the verification documents for <strong style="color:#f5f3ee;">${clubName}</strong>.
        </p>
        <div style="background:rgba(232,255,71,0.06);border:1px solid rgba(232,255,71,0.2);border-radius:8px;padding:16px 20px;margin-bottom:24px;">
          <div style="font-weight:700;color:#e8ff47;margin-bottom:8px;text-transform:uppercase;font-size:0.85rem;">What happens next?</div>
          <div style="color:#ccc;font-size:0.88rem;line-height:1.9;">
            • Our team will review your documents within <strong style="color:#f5f3ee;">24–48 hours</strong><br/>
            • You will receive an email once the review is complete<br/>
            • After approval, you will have full access to the player database
          </div>
        </div>
        <a href="${APP_URL}/dashboard/club"
           style="display:block;text-align:center;background:#e8ff47;color:#000;font-weight:700;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:1rem;text-transform:uppercase;letter-spacing:0.05em;">
          Go to Dashboard →
        </a>
        ${footer()}
      </div>
    `,
  });
}

// ── Admin notification — club submitted docs ──────────────────────

export async function sendAdminClubDocsEmail(clubName: string, email: string) {
  await transporter.sendMail({
    from: `"HandballHub" <${ADMIN_EMAIL}>`,
    to: ADMIN_EMAIL,
    subject: `[HandballHub] Club verification submitted: ${clubName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0d0d0d;color:#f5f3ee;padding:40px 32px;border-radius:12px;">
        ${logo()}
        <h2 style="margin:0 0 16px;font-size:1.2rem;">📋 Club Verification Submitted</h2>
        <div style="background:#111;border:1px solid #2a2a2a;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
          <table style="width:100%;border-collapse:collapse;font-size:0.88rem;">
            <tr><td style="color:#666;padding:4px 0;width:130px;">Club name</td><td style="color:#f5f3ee;font-weight:700;">${clubName}</td></tr>
            <tr><td style="color:#666;padding:4px 0;">Email</td><td style="color:#f5f3ee;">${email}</td></tr>
            <tr><td style="color:#666;padding:4px 0;">Submitted</td><td style="color:#f5f3ee;">${new Date().toLocaleString()}</td></tr>
          </table>
        </div>
        <p style="color:#888;font-size:0.88rem;line-height:1.6;margin-bottom:20px;">
          This club has submitted all 3 verification documents and is awaiting your review.
        </p>
        <a href="${APP_URL}/admin"
           style="display:block;text-align:center;background:#e8ff47;color:#000;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:0.9rem;text-transform:uppercase;letter-spacing:0.05em;">
          Review in Admin Panel →
        </a>
        ${footer()}
      </div>
    `,
  });
}

// ── Club: verified ────────────────────────────────────────────────

export async function sendClubVerifiedEmail(to: string, clubName: string) {
  await transporter.sendMail({
    from: `"HandballHub" <${ADMIN_EMAIL}>`,
    to,
    subject: "HandballHub — Your Club Has Been Verified! ✅",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0d0d0d;color:#f5f3ee;padding:40px 32px;border-radius:12px;">
        ${logo()}
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:3rem;margin-bottom:12px;">✅</div>
          <h2 style="margin:0 0 8px;font-size:1.4rem;color:#00c864;">Club Verified!</h2>
          <p style="color:#888;margin:0;">${clubName}</p>
        </div>
        <p style="color:#888;line-height:1.7;margin:0 0 20px;text-align:center;">
          Congratulations! Your club has been successfully verified and now has <strong style="color:#f5f3ee;">full access</strong> to the HandballHub player database.
        </p>
        <div style="background:rgba(0,200,100,0.06);border:1px solid rgba(0,200,100,0.2);border-radius:8px;padding:16px 20px;margin-bottom:24px;">
          <div style="font-weight:700;color:#00c864;margin-bottom:10px;text-transform:uppercase;font-size:0.85rem;">You now have access to</div>
          <div style="color:#ccc;font-size:0.88rem;line-height:1.9;">
            ✓ Full verified player database<br/>
            ✓ Player contact details (phone, agent info)<br/>
            ✓ Scouting tools — watchlist and notes<br/>
            ✓ Send transfer interest requests<br/>
            ✓ Direct messaging with players
          </div>
        </div>
        <a href="${APP_URL}/players"
           style="display:block;text-align:center;background:#00c864;color:#000;font-weight:700;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:1rem;text-transform:uppercase;letter-spacing:0.05em;">
          Browse Players →
        </a>
        ${footer()}
      </div>
    `,
  });
}

// ── Club: rejected ────────────────────────────────────────────────

export async function sendClubRejectedEmail(to: string, clubName: string, note?: string) {
  await transporter.sendMail({
    from: `"HandballHub" <${ADMIN_EMAIL}>`,
    to,
    subject: "HandballHub — Verification Update Required",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0d0d0d;color:#f5f3ee;padding:40px 32px;border-radius:12px;">
        ${logo()}
        <h2 style="margin:0 0 12px;font-size:1.3rem;">❌ Verification Update Required</h2>
        <p style="color:#888;line-height:1.7;margin:0 0 20px;">
          Unfortunately, we were unable to verify <strong style="color:#f5f3ee;">${clubName}</strong> with the documents provided.
          Please review the issue below and resubmit your documents.
        </p>
        ${note ? `
        <div style="background:rgba(255,59,59,0.08);border:1px solid rgba(255,59,59,0.25);border-radius:8px;padding:16px 20px;margin-bottom:24px;">
          <div style="font-weight:700;color:#ff3b3b;margin-bottom:8px;text-transform:uppercase;font-size:0.82rem;">Admin note</div>
          <div style="color:#ccc;font-size:0.88rem;line-height:1.7;">${note}</div>
        </div>` : ""}
        <div style="background:#111;border:1px solid #222;border-radius:8px;padding:16px 20px;margin-bottom:24px;font-size:0.88rem;color:#aaa;line-height:1.8;">
          Please ensure you submit:<br/>
          • Official club registration certificate or federation license<br/>
          • Authorization letter on club letterhead (with stamp/seal)<br/>
          • Clear passport or ID photo of the authorized representative
        </div>
        <a href="${APP_URL}/dashboard/club/verify"
           style="display:block;text-align:center;background:#e8ff47;color:#000;font-weight:700;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:1rem;text-transform:uppercase;letter-spacing:0.05em;">
          Resubmit Documents →
        </a>
        ${footer()}
      </div>
    `,
  });
}

// ── Club: payment request sent to admin ──────────────────────────

export async function sendClubPaymentRequestEmail(clubName: string, clubEmail: string) {
  await transporter.sendMail({
    from: `"HandballHub" <${ADMIN_EMAIL}>`,
    to: ADMIN_EMAIL,
    subject: `[HandballHub] Subscription payment request: ${clubName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0d0d0d;color:#f5f3ee;padding:40px 32px;border-radius:12px;">
        ${logo()}
        <h2 style="margin:0 0 16px;font-size:1.2rem;">💳 Subscription Payment Request</h2>
        <div style="background:#111;border:1px solid #2a2a2a;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
          <table style="width:100%;border-collapse:collapse;font-size:0.88rem;">
            <tr><td style="color:#666;padding:4px 0;width:130px;">Club name</td><td style="color:#f5f3ee;font-weight:700;">${clubName}</td></tr>
            <tr><td style="color:#666;padding:4px 0;">Email</td><td style="color:#f5f3ee;">${clubEmail}</td></tr>
            <tr><td style="color:#666;padding:4px 0;">Amount</td><td style="color:#e8ff47;font-weight:700;">€1,000 / year</td></tr>
            <tr><td style="color:#666;padding:4px 0;">Submitted</td><td style="color:#f5f3ee;">${new Date().toLocaleString()}</td></tr>
          </table>
        </div>
        <p style="color:#888;font-size:0.88rem;line-height:1.6;margin-bottom:20px;">
          This club has confirmed payment intent. Once you receive the bank transfer, activate their subscription in the admin panel.
        </p>
        <a href="${APP_URL}/admin"
           style="display:block;text-align:center;background:#e8ff47;color:#000;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:0.9rem;text-transform:uppercase;letter-spacing:0.05em;">
          Open Admin Panel →
        </a>
        ${footer()}
      </div>
    `,
  });
}

// ── Club: subscription activated ────────────────────────────────

export async function sendSubscriptionActivatedEmail(to: string, clubName: string) {
  const expiresDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  await transporter.sendMail({
    from: `"HandballHub" <${ADMIN_EMAIL}>`,
    to,
    subject: "HandballHub — Your Subscription Is Now Active! 🎉",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0d0d0d;color:#f5f3ee;padding:40px 32px;border-radius:12px;">
        ${logo()}
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:3rem;margin-bottom:12px;">🎉</div>
          <h2 style="margin:0 0 8px;font-size:1.4rem;color:#e8ff47;">Subscription Activated!</h2>
          <p style="color:#888;margin:0;">${clubName}</p>
        </div>
        <p style="color:#888;line-height:1.7;margin:0 0 20px;text-align:center;">
          Your payment has been confirmed and your annual subscription is now <strong style="color:#e8ff47;">active</strong>.
          You have full access to the HandballHub platform.
        </p>
        <div style="background:rgba(232,255,71,0.06);border:1px solid rgba(232,255,71,0.2);border-radius:8px;padding:16px 20px;margin-bottom:24px;">
          <table style="width:100%;border-collapse:collapse;font-size:0.88rem;">
            <tr><td style="color:#666;padding:4px 0;width:150px;">Plan</td><td style="color:#f5f3ee;font-weight:700;">Annual — €1,000/year</td></tr>
            <tr><td style="color:#666;padding:4px 0;">Valid until</td><td style="color:#e8ff47;font-weight:700;">${expiresDate}</td></tr>
          </table>
        </div>
        <div style="background:rgba(232,255,71,0.04);border:1px solid rgba(232,255,71,0.15);border-radius:8px;padding:16px 20px;margin-bottom:24px;">
          <div style="font-weight:700;color:#e8ff47;margin-bottom:10px;text-transform:uppercase;font-size:0.85rem;">Full access includes</div>
          <div style="color:#ccc;font-size:0.88rem;line-height:1.9;">
            ✓ Unlimited player database browsing<br/>
            ✓ Advanced search with all filters<br/>
            ✓ Player contact & agent details<br/>
            ✓ Watchlist, scouting notes, messaging<br/>
            ✓ Transfer history and interaction log
          </div>
        </div>
        <a href="${APP_URL}/players"
           style="display:block;text-align:center;background:#e8ff47;color:#000;font-weight:700;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:1rem;text-transform:uppercase;letter-spacing:0.05em;">
          Browse Players Now →
        </a>
        ${footer()}
      </div>
    `,
  });
}

// ── Player: verified ─────────────────────────────────────────────

export async function sendPlayerVerifiedEmail(to: string, playerName: string) {
  await transporter.sendMail({
    from: `"HandballHub" <${ADMIN_EMAIL}>`,
    to,
    subject: "HandballHub — Your Profile Has Been Verified! ✅",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0d0d0d;color:#f5f3ee;padding:40px 32px;border-radius:12px;">
        ${logo()}
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:3rem;margin-bottom:12px;">✅</div>
          <h2 style="margin:0 0 8px;font-size:1.4rem;color:#00c864;">Profile Verified!</h2>
          <p style="color:#888;margin:0;">${playerName}</p>
        </div>
        <p style="color:#888;line-height:1.7;margin:0 0 20px;text-align:center;">
          Congratulations! Your player profile has been <strong style="color:#f5f3ee;">officially verified</strong> by the HandballHub team.
          You now appear with a verified badge in club searches.
        </p>
        <div style="background:rgba(0,200,100,0.06);border:1px solid rgba(0,200,100,0.2);border-radius:8px;padding:16px 20px;margin-bottom:24px;">
          <div style="font-weight:700;color:#00c864;margin-bottom:10px;text-transform:uppercase;font-size:0.85rem;">What this means</div>
          <div style="color:#ccc;font-size:0.88rem;line-height:1.9;">
            ✓ Verified badge visible on your profile<br/>
            ✓ Higher ranking in club search results<br/>
            ✓ Clubs can view your full contact details<br/>
            ✓ Eligible to receive transfer interest requests
          </div>
        </div>
        <a href="${APP_URL}/dashboard/player"
           style="display:block;text-align:center;background:#00c864;color:#000;font-weight:700;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:1rem;text-transform:uppercase;letter-spacing:0.05em;">
          View Your Profile →
        </a>
        ${footer()}
      </div>
    `,
  });
}

// ── Player: rejected ──────────────────────────────────────────────

export async function sendPlayerRejectedEmail(to: string, playerName: string, note?: string) {
  await transporter.sendMail({
    from: `"HandballHub" <${ADMIN_EMAIL}>`,
    to,
    subject: "HandballHub — Profile Verification Update",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0d0d0d;color:#f5f3ee;padding:40px 32px;border-radius:12px;">
        ${logo()}
        <h2 style="margin:0 0 12px;font-size:1.3rem;">❌ Verification Update Required</h2>
        <p style="color:#888;line-height:1.7;margin:0 0 20px;">
          Hi <strong style="color:#f5f3ee;">${playerName}</strong>, we were unable to verify your profile with the documents provided.
          Please review the information below and resubmit.
        </p>
        ${note ? `
        <div style="background:rgba(255,59,59,0.08);border:1px solid rgba(255,59,59,0.25);border-radius:8px;padding:16px 20px;margin-bottom:24px;">
          <div style="font-weight:700;color:#ff3b3b;margin-bottom:8px;text-transform:uppercase;font-size:0.82rem;">Admin note</div>
          <div style="color:#ccc;font-size:0.88rem;line-height:1.7;">${note}</div>
        </div>` : ""}
        <div style="background:#111;border:1px solid #222;border-radius:8px;padding:16px 20px;margin-bottom:24px;font-size:0.88rem;color:#aaa;line-height:1.8;">
          Please ensure you have submitted:<br/>
          • A clear passport or national ID photo<br/>
          • A recent selfie photo<br/>
          • Complete and accurate profile information
        </div>
        <a href="${APP_URL}/dashboard/player?tab=settings"
           style="display:block;text-align:center;background:#e8ff47;color:#000;font-weight:700;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:1rem;text-transform:uppercase;letter-spacing:0.05em;">
          Update Your Profile →
        </a>
        ${footer()}
      </div>
    `,
  });
}

// ── Password reset ────────────────────────────────────────────────

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await transporter.sendMail({
    from: `"HandballHub" <${ADMIN_EMAIL}>`,
    to,
    subject: "Reset your HandballHub password",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0d0d0d;color:#f5f3ee;padding:40px 32px;border-radius:12px;">
        ${logo()}
        <h2 style="margin:0 0 12px;font-size:1.3rem;">Reset your password</h2>
        <p style="color:#888;line-height:1.7;margin:0 0 28px;">
          We received a request to reset your password. Click the button below to choose a new one.
          This link expires in <strong style="color:#f5f3ee;">1 hour</strong>.
        </p>
        <a href="${resetUrl}" style="display:block;text-align:center;background:#e8ff47;color:#000;font-weight:700;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:1rem;text-transform:uppercase;letter-spacing:0.05em;">
          Reset Password →
        </a>
        <p style="color:#555;font-size:0.78rem;margin-top:28px;line-height:1.6;">
          If you didn't request this, you can safely ignore this email.<br/>
          Or copy this link: <span style="color:#888;">${resetUrl}</span>
        </p>
        ${footer()}
      </div>
    `,
  });
}
