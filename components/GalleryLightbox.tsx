"use client";
// components/GalleryLightbox.tsx
// Full-screen image gallery with prev/next navigation and keyboard support.

import { useEffect, useCallback } from "react";

interface GalleryImage {
  url: string;
  caption?: string | null;
  label?: string; // e.g. "Profile Photo"
}

interface Props {
  images: GalleryImage[];
  startIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function GalleryLightbox({ images, startIndex, onClose, onNavigate }: Props) {
  const current = images[startIndex];
  const hasPrev = startIndex > 0;
  const hasNext = startIndex < images.length - 1;

  const prev = useCallback(() => { if (hasPrev) onNavigate(startIndex - 1); }, [hasPrev, startIndex, onNavigate]);
  const next = useCallback(() => { if (hasNext) onNavigate(startIndex + 1); }, [hasNext, startIndex, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape")      onClose();
      if (e.key === "ArrowLeft")   prev();
      if (e.key === "ArrowRight")  next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prev, next]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "16px",
        animation: "fadeIn 0.18s ease",
      }}
    >
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>

      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: "absolute", top: 16, right: 20,
          background: "rgba(255,255,255,0.08)", border: "none",
          color: "#fff", fontSize: "1.4rem", cursor: "pointer",
          width: 40, height: 40, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 10001,
        }}
      >
        ✕
      </button>

      {/* Counter */}
      {images.length > 1 && (
        <div style={{
          position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)",
          fontFamily: "var(--font-mono)", fontSize: "0.78rem",
          color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em",
        }}>
          {startIndex + 1} / {images.length}
        </div>
      )}

      {/* Prev arrow */}
      {hasPrev && (
        <button
          onClick={e => { e.stopPropagation(); prev(); }}
          style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
            color: "#fff", fontSize: "1.4rem", cursor: "pointer",
            width: 48, height: 48, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s",
            zIndex: 10001,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(232,255,71,0.15)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
        >
          ‹
        </button>
      )}

      {/* Image */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: "90vw", maxHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}
      >
        <img
          key={current.url}
          src={current.url}
          alt={current.caption ?? current.label ?? ""}
          style={{
            maxWidth: "90vw", maxHeight: "75vh",
            objectFit: "contain",
            borderRadius: 8,
            boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
            animation: "fadeIn 0.2s ease",
          }}
        />

        {/* Caption / label */}
        {(current.caption || current.label) && (
          <div style={{
            textAlign: "center", fontSize: "0.85rem",
            color: "rgba(245,243,238,0.7)", maxWidth: 500,
            lineHeight: 1.5,
          }}>
            {current.label && (
              <span style={{ color: "var(--accent)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", marginRight: current.caption ? 8 : 0 }}>
                {current.label}
              </span>
            )}
            {current.caption}
          </div>
        )}
      </div>

      {/* Next arrow */}
      {hasNext && (
        <button
          onClick={e => { e.stopPropagation(); next(); }}
          style={{
            position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
            color: "#fff", fontSize: "1.4rem", cursor: "pointer",
            width: 48, height: 48, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s",
            zIndex: 10001,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(232,255,71,0.15)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
        >
          ›
        </button>
      )}

      {/* Thumbnail strip (when 2+ images) */}
      {images.length > 1 && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: "absolute", bottom: 16,
            display: "flex", gap: 6,
            maxWidth: "90vw", overflowX: "auto",
            padding: "4px 0",
          }}
        >
          {images.map((img, i) => (
            <div
              key={img.url + i}
              onClick={() => onNavigate(i)}
              style={{
                width: 48, height: 48, flexShrink: 0,
                borderRadius: 6, overflow: "hidden",
                border: `2px solid ${i === startIndex ? "var(--accent)" : "rgba(255,255,255,0.15)"}`,
                cursor: "pointer", opacity: i === startIndex ? 1 : 0.55,
                transition: "opacity 0.15s, border-color 0.15s",
              }}
            >
              <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
