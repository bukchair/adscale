"use client";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();
  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a14", color: "#fff",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "'Segoe UI', Arial, sans-serif", textAlign: "center", padding: "20px",
    }}>
      <div style={{ fontSize: 72, marginBottom: 16 }}>🔍</div>
      <h1 style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 900, margin: "0 0 12px",
        background: "linear-gradient(90deg,#6366f1,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        404 — עמוד לא נמצא
      </h1>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, maxWidth: 400, lineHeight: 1.7, margin: "0 0 32px" }}>
        העמוד שחיפשת אינו קיים או הוסר. חזור לדף הבית.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={() => router.push("/")}
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 10, padding: "12px 28px", color: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 700 }}>
          ← חזרה לדף הבית
        </button>
        <button onClick={() => router.push("/modules")}
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "12px 28px", color: "#fff", cursor: "pointer", fontSize: 15 }}>
          כניסה למערכת
        </button>
      </div>
    </div>
  );
}
