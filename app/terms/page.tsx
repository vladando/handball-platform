import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service, Refund Policy & Privacy Policy | HandballHub",
  description: "HandballHub Terms of Service, Subscription Terms, Refund Policy, Privacy Policy and Cookie Policy.",
};

export default function TermsPage() {
  const updated = "19 April 2026";

  return (
    <main className="page">
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div className="section-label">Legal</div>
          <h2>Terms of Service, Refund &amp; Privacy Policy</h2>
          <p style={{ color: "var(--muted)", marginTop: 12, fontSize: "0.85rem" }}>
            Last updated: {updated} · Effective immediately upon account registration.
          </p>
          {/* Quick nav */}
          <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              ["#acceptance", "1. Acceptance"],
              ["#verification", "2. Verification"],
              ["#data-consent", "3. Data Consent"],
              ["#logging", "4. Activity Logging"],
              ["#subscription", "5. Subscription"],
              ["#refund", "6. Refund Policy"],
              ["#prohibited", "7. Prohibited Conduct"],
              ["#privacy", "8. Privacy Policy"],
              ["#cookies", "9. Cookies"],
              ["#liability", "10. Liability"],
              ["#governing-law", "11. Governing Law"],
              ["#changes", "12. Changes"],
            ].map(([href, label]) => (
              <a key={href} href={href} style={{ fontSize: "0.78rem", color: "var(--accent)", textDecoration: "none", padding: "4px 10px", border: "1px solid rgba(232,255,71,0.25)", borderRadius: "var(--radius)", fontFamily: "var(--font-mono)" }}>
                {label}
              </a>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

          <Section id="acceptance" num="1" title="Acceptance of Terms">
            <p>By creating an account, submitting a player profile, or verifying your identity on <strong>HandballHub</strong> ("the Platform", "we", "us", "our"), you agree to be bound by these Terms of Service, Refund Policy, and Privacy Policy (collectively, "the Terms"). If you do not agree, you must not use the Platform.</p>
            <p>These Terms constitute a legally binding agreement between you and HandballHub. Your continued use of the Platform after any changes constitutes acceptance of the revised Terms.</p>
            <p>Registered address: HandballHub · contact: <strong>legal@handballhub.net</strong></p>
          </Section>

          <Section id="verification" num="2" title="Identity Verification & Data Accuracy">
            <p>When submitting verification documents (passport, selfie, or any other identity material), you expressly confirm that:</p>
            <ul>
              <li>All documents submitted are genuine, unaltered, and belong to you.</li>
              <li>All personal data — including name, date of birth, nationality, physical measurements, career history, contact details and salary expectations — is <strong>accurate, complete and truthful</strong>.</li>
              <li>You will notify HandballHub promptly of any material changes to your information.</li>
              <li>Submitting false, misleading or fraudulent information is a serious breach of these Terms and may result in immediate account suspension, permanent ban, and/or referral to relevant authorities.</li>
            </ul>
            <p>HandballHub reserves the right to reject, revoke or suspend any verification at any time if it determines that submitted documents or profile data are inaccurate or fraudulent.</p>
          </Section>

          <Section id="data-consent" num="3" title="Consent to Data Publication">
            <p>By verifying your profile, you grant HandballHub a non-exclusive, worldwide licence to display the following information:</p>
            <ul>
              <li><strong>Publicly visible:</strong> name, profile photo, position, nationality, physical stats, bio, career history, video vault, and availability status.</li>
              <li><strong>Club-only</strong> (revealed to verified clubs upon their acceptance of our Terms): direct phone number, Viber/WhatsApp contact, agent details, and salary expectations.</li>
              <li><strong>Admin-only:</strong> identity verification documents, medical records marked as private, and account activity logs.</li>
            </ul>
            <p>You may withdraw consent at any time by deleting your account. Publicly visible data will be removed within 30 days. Verification documents are retained for up to 12 months for legal compliance purposes.</p>
          </Section>

          <Section id="logging" num="4" title="Activity Logging & Digital Evidence">
            <p>HandballHub records and retains logs of all significant platform activity, including but not limited to:</p>
            <ul>
              <li>Account registration, login events and IP addresses.</li>
              <li>Profile creation, edits and verification submissions.</li>
              <li>Club reveal events — when a club unlocks a player's contact details.</li>
              <li>Messages exchanged between clubs and players.</li>
              <li>Document uploads and any subsequent changes.</li>
              <li>Payment transactions and subscription activity.</li>
            </ul>
            <p>You acknowledge that <strong>all recorded platform activity may be used as digital evidence</strong> in the event of a dispute, legal proceeding, fraud investigation, or regulatory inquiry. Logs are retained for a minimum of 5 years.</p>
          </Section>

          <Section id="subscription" num="5" title="Club Subscription — Pricing, Payment & Billing">
            <p><strong>Player accounts are free.</strong> HandballHub does not charge players any fees.</p>
            <p><strong>Club accounts</strong> require an annual subscription to access the full player database. The current subscription fee is:</p>
            <ul>
              <li><strong>€1,000 per year</strong> — one annual payment</li>
            </ul>
            <p>The subscription grants verified clubs access to:</p>
            <ul>
              <li>Full verified player database with advanced search and filters</li>
              <li>Player contact details and agent information (per-reveal)</li>
              <li>Watchlist, scouting notes and direct messaging</li>
              <li>Transfer history and interaction logs</li>
            </ul>

            <div style={{ background: "rgba(232,255,71,0.05)", border: "1px solid rgba(232,255,71,0.2)", borderRadius: 8, padding: "14px 16px", margin: "4px 0" }}>
              <strong style={{ color: "var(--accent)" }}>Merchant of Record — Paddle.com</strong>
              <p style={{ margin: "8px 0 0" }}>All payments are processed by <strong>Paddle.com Market Limited</strong> ("Paddle"), our authorised Merchant of Record. Paddle appears as the merchant on your bank or card statement. Paddle is responsible for collecting payment, issuing VAT/tax invoices, handling chargebacks, and ensuring PCI-DSS compliance. By completing a payment you also agree to <a href="https://www.paddle.com/legal/terms" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>Paddle's Terms of Service</a> and <a href="https://www.paddle.com/legal/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>Privacy Policy</a>.</p>
            </div>

            <p><strong>Billing:</strong> The subscription is a single annual charge. There is no automatic renewal — you must manually repurchase each year. You will receive a payment confirmation and tax invoice from Paddle by email.</p>
            <p><strong>Activation:</strong> Your subscription is activated immediately upon successful payment confirmation from Paddle. Access is valid for 12 months from the activation date.</p>
            <p><strong>Tax:</strong> Prices shown are exclusive of applicable VAT or local taxes. Paddle calculates and collects the correct tax based on your billing location.</p>
            <p>HandballHub reserves the right to modify subscription pricing with at least 30 days notice to existing subscribers.</p>
          </Section>

          <Section id="refund" num="6" title="Refund Policy">
            <div style={{ background: "rgba(255,59,59,0.06)", border: "1px solid rgba(255,59,59,0.25)", borderRadius: 8, padding: "14px 16px", margin: "4px 0" }}>
              <strong style={{ color: "#ff6b6b" }}>All subscription payments are final and non-refundable.</strong>
            </div>
            <p>Due to the nature of the service — immediate digital access to a live database of verified player profiles — HandballHub does not offer refunds, partial refunds, or credits for:</p>
            <ul>
              <li>Unused portions of an active subscription period</li>
              <li>Change of mind or decision not to use the Platform after payment</li>
              <li>Failure to use available features during the subscription period</li>
              <li>Club verification being rejected after payment (subscription is for platform access, not guaranteed verification status)</li>
              <li>Cancellation of account during the subscription period</li>
            </ul>
            <p><strong>Exceptions — considered solely at HandballHub's discretion:</strong></p>
            <ul>
              <li>Duplicate charges caused by a verified technical error on our side</li>
              <li>Payment processed after account suspension due solely to our error</li>
              <li>Platform downtime exceeding 72 consecutive hours during the subscription period</li>
            </ul>
            <p>To request a refund exception, email <strong>support@handballhub.net</strong> within <strong>7 days</strong> of the charge, including your order ID (found in your Paddle receipt). We will respond within 14 business days.</p>
            <p>All approved refunds are processed through Paddle and returned to the original payment method within 5–10 business days. Refund disputes can also be raised directly with Paddle via your Paddle receipt email.</p>
          </Section>

          <Section id="prohibited" num="7" title="Prohibited Conduct">
            <p>You agree not to:</p>
            <ul>
              <li>Impersonate another person or submit documents belonging to another individual.</li>
              <li>Create multiple accounts to circumvent bans or verification requirements.</li>
              <li>Use the Platform to distribute spam, malware or any harmful content.</li>
              <li>Attempt to scrape, reverse-engineer or systematically extract data from the Platform.</li>
              <li>Share, resell or sublicense your account access or subscription to third parties.</li>
              <li>Use the Platform for any purpose that violates applicable law or regulation.</li>
            </ul>
          </Section>

          <Section id="privacy" num="8" title="Privacy Policy & Data Protection">
            <p>HandballHub processes personal data in accordance with Regulation (EU) 2016/679 (<strong>GDPR</strong>) and applicable national data protection law. The data controller is HandballHub (contact: <strong>legal@handballhub.net</strong>).</p>
            <p><strong>Data we collect:</strong></p>
            <ul>
              <li><strong>Account data:</strong> email address, hashed password, role, registration IP address and timestamp.</li>
              <li><strong>Profile data:</strong> name, photo, position, nationality, physical measurements, career history, contact details, salary expectations.</li>
              <li><strong>Verification documents:</strong> passport/ID scans and selfies — stored encrypted, accessed only by authorised admin personnel.</li>
              <li><strong>Usage data:</strong> login events, search queries, profile views, messages, document uploads, and all platform interactions.</li>
              <li><strong>Payment data:</strong> transaction IDs and subscription status. Card numbers and banking details are handled exclusively by Paddle — HandballHub never sees or stores them.</li>
              <li><strong>Technical data:</strong> IP addresses, browser type, device type, and session data for security and fraud prevention.</li>
            </ul>
            <p><strong>Legal basis for processing:</strong></p>
            <ul>
              <li>Performance of contract — to provide the Platform services you signed up for.</li>
              <li>Legitimate interests — security, fraud prevention, platform improvement.</li>
              <li>Legal obligation — retaining records for tax, financial and legal compliance.</li>
              <li>Consent — where explicitly given (e.g. marketing communications).</li>
            </ul>
            <p><strong>Data sharing:</strong> We do not sell personal data. Player contact details are shared with verified, paying clubs only upon their explicit request. We share data with Paddle (payment processing), email service providers (transactional emails), and hosting/infrastructure providers — all under strict data processing agreements.</p>
            <p><strong>International transfers:</strong> Where data is transferred outside the EEA, we ensure appropriate safeguards are in place (e.g. Standard Contractual Clauses).</p>
            <p><strong>Retention:</strong> Account data is retained for the duration of your account plus 12 months. Verification documents up to 12 months after account closure. Activity logs minimum 5 years. Payment records as required by tax law.</p>
            <p><strong>Your rights under GDPR:</strong></p>
            <ul>
              <li><strong>Access</strong> — request a copy of all personal data we hold about you.</li>
              <li><strong>Rectification</strong> — correct inaccurate or incomplete data.</li>
              <li><strong>Erasure</strong> — request deletion of your data (subject to legal retention obligations).</li>
              <li><strong>Portability</strong> — receive your data in a machine-readable format.</li>
              <li><strong>Restriction</strong> — request that we restrict processing in certain circumstances.</li>
              <li><strong>Objection</strong> — object to processing based on legitimate interests.</li>
              <li><strong>Withdraw consent</strong> — where processing is based on consent, you may withdraw it at any time.</li>
            </ul>
            <p>To exercise any of these rights, contact <strong>legal@handballhub.net</strong>. We will respond within 30 days. You also have the right to lodge a complaint with your national data protection authority.</p>
          </Section>

          <Section id="cookies" num="9" title="Cookie Policy">
            <p>HandballHub uses cookies and similar technologies to operate and improve the Platform. By using the Platform, you consent to our use of cookies as described below.</p>
            <p><strong>What are cookies?</strong> Cookies are small text files stored on your device by your browser. They help us recognise you, remember your preferences, and keep your session secure.</p>
            <p><strong>Cookies we use:</strong></p>
            <ul>
              <li><strong>Strictly necessary cookies:</strong> Session authentication cookies (NextAuth.js) — required to keep you logged in. These cannot be disabled without breaking core functionality.</li>
              <li><strong>Functional cookies:</strong> Language preference storage (localStorage) — stores your chosen display language.</li>
              <li><strong>Payment cookies:</strong> When you initiate a payment via Paddle, Paddle may set cookies necessary for fraud prevention and checkout functionality. These are governed by Paddle's Cookie Policy.</li>
            </ul>
            <p><strong>We do not use:</strong> advertising cookies, third-party tracking cookies, or analytics cookies that track you across other websites.</p>
            <p>You can control cookies through your browser settings. Disabling strictly necessary cookies will prevent you from logging in. For more information on managing cookies, visit <a href="https://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>allaboutcookies.org</a>.</p>
          </Section>

          <Section id="liability" num="10" title="Limitation of Liability">
            <p>HandballHub provides the Platform on an "as is" basis. We do not guarantee that any transfer or employment will result from use of the Platform. To the maximum extent permitted by law, HandballHub shall not be liable for:</p>
            <ul>
              <li>Any indirect, incidental or consequential loss arising from use of the Platform.</li>
              <li>Loss of earnings, transfer fees or any opportunity resulting from Platform downtime or errors.</li>
              <li>The conduct of clubs or players you interact with through the Platform.</li>
              <li>Any decisions made by clubs or players based on profile information.</li>
              <li>Payment processing issues, disputes or delays caused by Paddle or your payment provider.</li>
            </ul>
            <p>HandballHub's total liability to you shall not exceed the amount paid by you in subscription fees in the 12 months preceding the claim.</p>
          </Section>

          <Section id="governing-law" num="11" title="Governing Law & Disputes">
            <p>These Terms are governed by and construed in accordance with the laws of the European Union and applicable national law. Any dispute arising out of or relating to these Terms shall first be subject to good-faith negotiation. If unresolved within 30 days, disputes shall be submitted to the competent courts of HandballHub's jurisdiction.</p>
            <p>For payment-related disputes, you may also contact Paddle directly via your purchase receipt. Paddle, as Merchant of Record, handles payment disputes and chargebacks.</p>
          </Section>

          <Section id="changes" num="12" title="Changes to These Terms">
            <p>We may update these Terms at any time. Material changes will be communicated via email or a prominent notice on the Platform at least 14 days before they take effect. Your continued use of the Platform after the effective date constitutes acceptance of the revised Terms.</p>
          </Section>

          {/* Contact */}
          <div className="card" style={{ background: "var(--card2)" }}>
            <div className="section-label" style={{ marginBottom: 12 }}>Contact Us</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, fontSize: "0.88rem", color: "var(--muted)", lineHeight: 1.9 }}>
              <div>
                <div style={{ color: "var(--white)", fontWeight: 600, marginBottom: 4 }}>Legal &amp; Data Protection</div>
                <a href="mailto:legal@handballhub.net" style={{ color: "var(--accent)" }}>legal@handballhub.net</a><br />
                GDPR requests, data subject rights, legal inquiries
              </div>
              <div>
                <div style={{ color: "var(--white)", fontWeight: 600, marginBottom: 4 }}>Support &amp; Billing</div>
                <a href="mailto:support@handballhub.net" style={{ color: "var(--accent)" }}>support@handballhub.net</a><br />
                Refund exceptions, payment issues, general support
              </div>
            </div>
          </div>

          <div style={{ paddingBottom: 48 }}>
            <Link href="/" className="btn btn-outline" style={{ fontSize: "0.85rem" }}>← Back to HandballHub</Link>
          </div>

        </div>
      </div>
    </main>
  );
}

function Section({ id, num, title, children }: { id: string; num: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id} className="card">
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 16 }}>
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--accent)",
          background: "rgba(232,255,71,0.08)", border: "1px solid rgba(232,255,71,0.2)",
          borderRadius: "var(--radius)", padding: "4px 8px", flexShrink: 0, marginTop: 2,
        }}>
          {num.padStart(2, "0")}
        </div>
        <h4 style={{ textTransform: "uppercase", fontSize: "0.95rem" }}>{title}</h4>
      </div>
      <div style={{
        fontSize: "0.88rem", color: "rgba(245,243,238,0.8)", lineHeight: 1.85,
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        {children}
      </div>
    </div>
  );
}
