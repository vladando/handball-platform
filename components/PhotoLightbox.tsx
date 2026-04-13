"use client";
// components/PhotoLightbox.tsx
// Wraps any element — clicking it opens a full-screen lightbox with the photo.
import { useEffect, useState } from "react";

interface Props {
  src: string;
  alt?: string;
  positionX?: number;
  positionY?: number;
  children: React.ReactNode;
}

export default function PhotoLightbox({ src, alt = "Photo", children }: Props) {
  const [open, setOpen] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        style={{ cursor: "zoom-in", display: "contents" }}
      >
        {children}
      </div>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.92)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "zoom-out",
            animation: "fadeIn 0.15s ease",
          }}
        >
          {/* Close button */}
          <button
            onClick={e => { e.stopPropagation(); setOpen(false); }}
            style={{
              position: "absolute", top: 20, right: 24,
              background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff", borderRadius: "50%",
              width: 40, height: 40, fontSize: "1.2rem",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              lineHeight: 1, zIndex: 1,
            }}
            title="Close (Esc)"
          >
            ✕
          </button>

          {/* Image */}
          <img
            src={src}
            alt={alt}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              objectFit: "contain",
              borderRadius: 8,
              boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
              cursor: "default",
              userSelect: "none",
            }}
          />

          {/* ESC hint */}
          <div style={{
            position: "absolute", bottom: 20,
            fontSize: "0.75rem", color: "rgba(255,255,255,0.3)",
            letterSpacing: "0.1em", textTransform: "uppercase",
          }}>
            Press Esc or click to close
          </div>
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }`}</style>
    </>
  );
}
