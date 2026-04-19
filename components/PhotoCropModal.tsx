"use client";
import { useState, useRef, useEffect } from "react";

interface Props {
  file: File;
  onConfirm: (croppedFile: File, posX: number, posY: number) => void;
  onCancel: () => void;
}

const PREVIEW = 260; // circle preview diameter in px

export default function PhotoCropModal({ file, onConfirm, onCancel }: Props) {
  const [pos, setPos] = useState({ x: 50, y: 50 }); // object-position percentages
  const [zoom, setZoom] = useState(1.2);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const dragRef = useRef({ sx: 0, sy: 0, px: 50, py: 50 });
  const imgUrl = useRef(URL.createObjectURL(file)).current;

  useEffect(() => () => URL.revokeObjectURL(imgUrl), [imgUrl]);

  // ── Mouse drag ────────────────────────────────────────────
  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    setDragging(true);
    dragRef.current = { sx: e.clientX, sy: e.clientY, px: pos.x, py: pos.y };

    const move = (ev: MouseEvent) => {
      const dx = (ev.clientX - dragRef.current.sx) / PREVIEW * 100 / zoom;
      const dy = (ev.clientY - dragRef.current.sy) / PREVIEW * 100 / zoom;
      setPos({
        x: Math.max(0, Math.min(100, dragRef.current.px - dx)),
        y: Math.max(0, Math.min(100, dragRef.current.py - dy)),
      });
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  // ── Touch drag (mobile) ───────────────────────────────────
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    setDragging(true);
    dragRef.current = { sx: t.clientX, sy: t.clientY, px: pos.x, py: pos.y };

    const move = (ev: TouchEvent) => {
      const tc = ev.touches[0];
      const dx = (tc.clientX - dragRef.current.sx) / PREVIEW * 100 / zoom;
      const dy = (tc.clientY - dragRef.current.sy) / PREVIEW * 100 / zoom;
      setPos({
        x: Math.max(0, Math.min(100, dragRef.current.px - dx)),
        y: Math.max(0, Math.min(100, dragRef.current.py - dy)),
      });
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", up);
  }

  // ── Confirm: crop to square via Canvas ───────────────────
  async function handleConfirm() {
    setProcessing(true);
    try {
      const SIZE = 600; // output canvas size
      const canvas = document.createElement("canvas");
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext("2d")!;

      const img = new Image();
      img.src = imgUrl;
      await new Promise<void>(r => { img.onload = () => r(); });

      // Cover the canvas with image at current zoom + position
      const fitScale = Math.max(SIZE / img.naturalWidth, SIZE / img.naturalHeight) * zoom;
      const drawW = img.naturalWidth * fitScale;
      const drawH = img.naturalHeight * fitScale;
      const offsetX = -(drawW - SIZE) * (pos.x / 100);
      const offsetY = -(drawH - SIZE) * (pos.y / 100);

      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

      canvas.toBlob(
        blob => {
          if (!blob) return;
          const cropped = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
          onConfirm(cropped, pos.x, pos.y);
        },
        "image/jpeg",
        0.92
      );
    } catch {
      setProcessing(false);
    }
  }

  return (
    <div className="modal-overlay" style={{ alignItems: "center" }}>
      <div className="modal" style={{ maxWidth: 380, width: "100%" }}>
        <div className="modal-title" style={{ fontSize: "1.4rem", marginBottom: 8 }}>
          &#128247; Position Your Photo
        </div>
        <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: 24, lineHeight: 1.6 }}>
          Drag the image to position it within the circle. Use the slider to zoom.
        </p>

        {/* ── Circle preview ──────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            style={{
              width: PREVIEW,
              height: PREVIEW,
              borderRadius: "50%",
              overflow: "hidden",
              border: "3px solid var(--accent)",
              boxShadow: "0 0 0 6px rgba(232,255,71,0.12)",
              cursor: dragging ? "grabbing" : "grab",
              userSelect: "none",
              flexShrink: 0,
              position: "relative",
            }}
          >
            <img
              src={imgUrl}
              alt="crop preview"
              draggable={false}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: `${pos.x}% ${pos.y}%`,
                transform: `scale(${zoom})`,
                transformOrigin: `${pos.x}% ${pos.y}%`,
                pointerEvents: "none",
                transition: dragging ? "none" : "transform 0.15s ease",
              }}
            />
            {/* Guide lines */}
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: "linear-gradient(rgba(232,255,71,0.06) 50%, transparent 50%), linear-gradient(90deg, rgba(232,255,71,0.06) 50%, transparent 50%)",
              backgroundSize: "100% 2px, 2px 100%",
              pointerEvents: "none",
            }} />
          </div>

          {/* ── Zoom slider ─────────────────────────── */}
          <div style={{ width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label className="label" style={{ marginBottom: 0 }}>&#128269; Zoom</label>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--accent)" }}>
                {Math.round(zoom * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={0.02}
              value={zoom}
              onChange={e => setZoom(+e.target.value)}
              style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--muted)", marginTop: 4 }}>
              <span>1× Normal</span>
              <span>3× Zoom</span>
            </div>
          </div>

          {/* ── Reset position ──────────────────────── */}
          <button
            onClick={() => { setPos({ x: 50, y: 50 }); setZoom(1.2); }}
            style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "0.78rem", cursor: "pointer", textDecoration: "underline" }}
          >
            Reset position
          </button>
        </div>

        <div className="modal-actions" style={{ marginTop: 28 }}>
          <button className="btn btn-ghost" onClick={onCancel} disabled={processing}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={processing}>
            {processing ? <><span className="spinner" /> Processing...</> : <><span>&#10003;</span> Save Photo</>}
          </button>
        </div>
      </div>
    </div>
  );
}
