"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveConnection } from "../lib/auth";

function GoogleConnectSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"processing" | "done" | "error">("processing");
  const [platforms, setPlatforms] = useState<string[]>([]);

  useEffect(() => {
    const data = searchParams.get("data");
    const returnTo = searchParams.get("returnTo") || "/modules?tab=integrations";

    if (!data) {
      setStatus("error");
      return;
    }

    try {
      const conn = JSON.parse(decodeURIComponent(data)) as {
        access_token: string;
        refresh_token: string;
        scope: string;
        email: string;
        name: string;
        connected_at: string;
      };

      const grantedScopes = conn.scope || "";
      const connected: string[] = [];

      // Auto-connect Google platforms based on granted scopes
      const baseFields = {
        access_token: conn.access_token,
        refresh_token: conn.refresh_token,
        email: conn.email,
        connected_via: "google_oauth",
      };

      if (grantedScopes.includes("adwords")) {
        saveConnection("google_ads", { ...baseFields, account_name: conn.email });
        connected.push("Google Ads");
      }
      if (grantedScopes.includes("analytics")) {
        saveConnection("ga4", { ...baseFields, account_name: conn.email });
        connected.push("Google Analytics 4");
      }
      if (grantedScopes.includes("webmasters")) {
        saveConnection("gsc", { ...baseFields, account_name: conn.email });
        connected.push("Google Search Console");
      }
      if (grantedScopes.includes("gmail")) {
        saveConnection("gmail", { ...baseFields, sender_email: conn.email, oauth: "connected" });
        connected.push("Gmail");
      }

      // If no specific scopes but we got a token, store as generic google connection
      if (connected.length === 0) {
        saveConnection("google_ads", { ...baseFields, account_name: conn.email });
        connected.push("Google");
      }

      setPlatforms(connected);
      setStatus("done");

      // Redirect back after a short delay
      setTimeout(() => {
        router.replace(returnTo);
      }, 2500);
    } catch {
      setStatus("error");
      setTimeout(() => router.replace("/modules?tab=integrations"), 2000);
    }
  }, [searchParams, router]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a14",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      direction: "rtl",
    }}>
      <div style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 20,
        padding: "40px 48px",
        textAlign: "center",
        maxWidth: 420,
      }}>
        {status === "processing" && (
          <>
            <div style={{ width: 48, height: 48, border: "3px solid rgba(99,102,241,0.3)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 20px" }} />
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 16 }}>מחבר לפלטפורמות Google...</p>
          </>
        )}
        {status === "done" && (
          <>
            <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
            <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 12 }}>החיבור הצליח!</h2>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginBottom: 16 }}>
              הפלטפורמות הבאות חוברו אוטומטית:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {platforms.map(p => (
                <div key={p} style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8, padding: "8px 16px", color: "#10b981", fontWeight: 600, fontSize: 14 }}>
                  ✓ {p}
                </div>
              ))}
            </div>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 16 }}>מועבר בחזרה למערכת...</p>
          </>
        )}
        {status === "error" && (
          <>
            <div style={{ fontSize: 52, marginBottom: 16 }}>❌</div>
            <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 12 }}>שגיאה בחיבור</h2>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>לא הצלחנו לחבר את החשבון. מועבר בחזרה...</p>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function GoogleConnectSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#0a0a14", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 48, height: 48, border: "3px solid rgba(99,102,241,0.3)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <GoogleConnectSuccessContent />
    </Suspense>
  );
}
