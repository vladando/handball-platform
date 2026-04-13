"use client";
import { useState, useRef, useEffect } from "react";

export default function ChatWindow({ interactionId, initialMessages, userId }: {
  interactionId: string;
  initialMessages: any[];
  userId: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll for new messages every 5s
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/messages/${interactionId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [interactionId]);

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    const res = await fetch(`/api/messages/${interactionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setMessages(m => [...m, data.message]);
      setText("");
    }
    setSending(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", height: "60vh", padding: 0, overflow: "hidden" }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--muted)", marginTop: 60, fontSize: "0.9rem" }}>
            No messages yet. Say hi! 👋
          </div>
        )}
        {messages.map((m: any) => {
          const isMine = m.senderId === userId;
          return (
            <div key={m.id} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "70%",
                background: isMine ? "var(--accent)" : "var(--card2)",
                color: isMine ? "var(--black)" : "var(--white)",
                borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                padding: "10px 16px",
                fontSize: "0.9rem",
                lineHeight: 1.5,
              }}>
                <div>{m.content}</div>
                <div style={{ fontSize: "0.68rem", opacity: 0.6, marginTop: 4, textAlign: isMine ? "right" : "left" }}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: "1px solid var(--border)", padding: "16px 20px", display: "flex", gap: 12, alignItems: "flex-end" }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message… (Enter to send)"
          rows={1}
          style={{
            flex: 1, resize: "none", background: "var(--card2)", border: "1px solid var(--border)",
            borderRadius: "var(--radius)", color: "var(--white)", padding: "10px 14px",
            fontSize: "0.9rem", fontFamily: "inherit", outline: "none",
            minHeight: 44, maxHeight: 120,
          }}
        />
        <button
          className="btn btn-primary"
          onClick={send}
          disabled={sending || !text.trim()}
          style={{ padding: "10px 20px", flexShrink: 0 }}
        >
          {sending ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
