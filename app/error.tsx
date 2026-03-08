"use client";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a14", color: "#fff",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "'Segoe UI', Arial, sans-serif", textAlign: "center", padding: "20px",
    }}>
      <div style={{ fontSize: 72, marginBottom: 16 }}>⚠️</div>
      <h1 style={{ fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 900, margin: "0 0 12px",
        background: "linear-gradient(90deg,#6366f1,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        משהו השתבש
      </h1>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, maxWidth: 400, lineHeight: 1.7, margin: "0 0 32px" }}>
        אירעה שגיאה בלתי צפויה. אנא נסה שוב או חזור לדף הבית.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={reset}
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 10, padding: "12px 28px", color: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 700 }}>
          נסה שוב
        </button>
        <button onClick={() => window.location.href = "/"}
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "12px 28px", color: "#fff", cursor: "pointer", fontSize: 15 }}>
          ← דף הבית
        </button>
      </div>
    </div>
  );
}
