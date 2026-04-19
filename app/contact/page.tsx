"use client";
import Link from "next/link";
import { useState } from "react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Open default mail client as fallback
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    window.location.href = `mailto:handballhub@handballhub.net?subject=${encodeURIComponent(subject)}&body=${body}`;
    setSent(true);
    setLoading(false);
  }

  return (
    <main className="page" style={{ padding: "60px 20px 80px" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <div style={{ fontSize: "0.78rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "var(--font-mono)", marginBottom: 16 }}>
            Get in touch
          </div>
          <h1 style={{ fontSize: "2.8rem", margin: "0 0 16px", fontFamily: "var(--font-display)" }}>Contact Us</h1>
          <p style={{ color: "var(--muted)", fontSize: "1rem", lineHeight: 1.7, maxWidth: 480, margin: "0 auto" }}>
            Have a question, partnership inquiry or need support? We&apos;re here to help.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 32 }}>

          {/* Left — info */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            <div className="card" style={{ padding: "24px" }}>
              <div style={{ fontSize: "1.6rem", marginBottom: 12 }}>✉️</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase", color: "var(--accent)", marginBottom: 8 }}>Email</div>
              <a href="mailto:handballhub@handballhub.net" style={{ color: "var(--white)", fontSize: "0.9rem", wordBreak: "break-all" }}>
                handballhub@handballhub.net
              </a>
            </div>

            <div className="card" style={{ padding: "24px" }}>
              <div style={{ fontSize: "1.6rem", marginBottom: 12 }}>⏱️</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase", color: "var(--accent)", marginBottom: 8 }}>Response time</div>
              <p style={{ color: "var(--muted)", fontSize: "0.88rem", lineHeight: 1.7, margin: 0 }}>
                We typically respond within 24–48 hours on business days.
              </p>
            </div>

            <div className="card" style={{ padding: "24px" }}>
              <div style={{ fontSize: "1.6rem", marginBottom: 12 }}>🤝</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase", color: "var(--accent)", marginBottom: 8 }}>Partnerships</div>
              <p style={{ color: "var(--muted)", fontSize: "0.88rem", lineHeight: 1.7, margin: 0 }}>
                Interested in partnering with HandballHub? Reach out and let&apos;s talk.
              </p>
            </div>

          </div>

          {/* Right — form */}
          <div className="card" style={{ padding: "32px" }}>
            {sent ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: "3rem", marginBottom: 16 }}>✅</div>
                <h3 style={{ marginBottom: 12 }}>Email client opened!</h3>
                <p style={{ color: "var(--muted)", lineHeight: 1.7, marginBottom: 24, fontSize: "0.9rem" }}>
                  Your default email app should have opened with the message pre-filled.
                  If not, email us directly at{" "}
                  <a href="mailto:handballhub@handballhub.net" style={{ color: "var(--accent)" }}>
                    handballhub@handballhub.net
                  </a>
                </p>
                <button className="btn btn-outline" onClick={() => setSent(false)}>
                  Send Another →
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h3 style={{ marginBottom: 24, fontSize: "1.1rem" }}>Send us a message</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="label">Your Name</label>
                    <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="John Smith" required />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="label">Your Email</label>
                    <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">Subject</label>
                  <select className="input" value={subject} onChange={e => setSubject(e.target.value)} required>
                    <option value="">Select a topic...</option>
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Player Support">Player Support</option>
                    <option value="Club Support">Club Support</option>
                    <option value="Verification Issue">Verification Issue</option>
                    <option value="Partnership">Partnership</option>
                    <option value="Technical Issue">Technical Issue</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Message</label>
                  <textarea
                    className="input"
                    rows={5}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Tell us how we can help..."
                    required
                    style={{ resize: "vertical", lineHeight: 1.6 }}
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "13px" }} disabled={loading}>
                  {loading ? <><span className="spinner" /> Sending…</> : "Send Message →"}
                </button>
                <p style={{ fontSize: "0.75rem", color: "var(--muted)", textAlign: "center", marginTop: 12 }}>
                  This will open your email client with the message pre-filled.
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Bottom links */}
        <div style={{ textAlign: "center", marginTop: 48, display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
          <Link href="/" style={{ color: "var(--muted)", fontSize: "0.85rem" }}>← Back to Home</Link>
          <Link href="/players" style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Browse Players</Link>
          <Link href="/auth/register" style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Join HandballHub</Link>
        </div>

      </div>
    </main>
  );
}
