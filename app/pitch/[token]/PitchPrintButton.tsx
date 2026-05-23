"use client";

export default function PitchPrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print"
      style={{
        background: "#e8ff47",
        color: "#000",
        border: "none",
        borderRadius: 6,
        padding: "10px 20px",
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 800,
        fontSize: "0.9rem",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      🖨️ Download PDF
    </button>
  );
}
