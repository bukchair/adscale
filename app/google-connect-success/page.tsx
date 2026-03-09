"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveConnection } from "../lib/auth";

type Platform = {
  id: string;
  label: string;
  scopeKeyword: string;
  saveFields: (base: Record<string, string>, email: string) => Record<string, string>;
};

const GOOGLE_PLATFORMS: Platform[] = [
  {
    id: "google_ads",
    label: "Google Ads",
    scopeKeyword: "adwords",
    saveFields: (base, email) => ({ ...base, account_name: email }),
  },
  {
    id: "ga4",
    label: "Google Analytics 4",
    scopeKeyword: "analytics",
    saveFields: (base, email) => ({ ...base, account_name: email }),
  },
  {
    id: "gsc",
    label: "Google Search Console",
    scopeKeyword: "webmasters",
    saveFields: (base, email) => ({ ...base, account_name: email }),
  },
  {
    id: "gmail",
    label: "Gmail",
    scopeKeyword: "gmail",
    saveFields: (base, email) => ({ ...base, sender_email: email, oauth: "connected" }),
  },
];

function GoogleConnectSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<"loading" | "select" | "done" | "error">("loading");
  const [connData, setConnData] = useState<{
    access_token: string;
    refresh_token: string;
    scope: string;
    email: string;
    name: string;
  } | null>(null);
  const [returnTo, setReturnTo] = useState("/modules?tab=integrations");
  const [availablePlatforms, setAvailablePlatforms] = useState<Platform[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [savedPlatforms, setSavedPlatforms] = useState<string[]>([]);

  useEffect(() => {
    const data = searchParams.get("data");
    const rt = searchParams.get("returnTo") || "/modules?tab=integrations";
    setReturnTo(rt);

    if (!data) { setStep("error"); return; }

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

      // Show all platforms that have a matching scope in the token
      const available = GOOGLE_PLATFORMS.filter(p =>
        grantedScopes.includes(p.scopeKeyword)
      );

      // If no specific scopes matched, show all platforms (generic token)
      const platforms = available.length > 0 ? available : GOOGLE_PLATFORMS;

      // Default: all checked
      const defaultSelected: Record<string, boolean> = {};
      platforms.forEach(p => { defaultSelected[p.id] = true; });

      setConnData(conn);
      setAvailablePlatforms(platforms);
      setSelected(defaultSelected);
      setStep("select");
    } catch {
      setStep("error");
    }
  }, [searchParams]);

  const handleConfirm = () => {
    if (!connData) return;

    const baseFields = {
      access_token: connData.access_token,
      refresh_token: connData.refresh_token,
      email: connData.email,
      connected_via: "google_oauth",
    };

    const saved: string[] = [];
    availablePlatforms.forEach(p => {
      if (selected[p.id]) {
        saveConnection(p.id, p.saveFields(baseFields, connData.email));
        saved.push(p.label);
      }
    });

    setSavedPlatforms(saved);
    setStep("done");

    setTimeout(() => router.replace(returnTo), 2500);
  };

  const togglePlatform = (id: string) => {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const uncheckedCount = Object.values(selected).filter(v => !v).length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a14",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      direction: "rtl",
      padding: "20px",
    }}>
      <div style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 20,
        padding: "36px 40px",
        textAlign: "center",
        maxWidth: 460,
        width: "100%",
      }}>

        {/* Loading */}
        {step === "loading" && (
          <>
            <div style={{ width: 48, height: 48, border: "3px solid rgba(99,102,241,0.3)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 20px" }} />
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 16 }}>טוען...</p>
          </>
        )}

        {/* Platform selection */}
        {step === "select" && connData && (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>
              <svg width="40" height="40" viewBox="0 0 48 48" style={{ display: "block", margin: "0 auto" }}>
                <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 29.8 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.8 20-21 0-1.4-.2-2.7-.5-4z" />
                <path fill="#34A853" d="M6.3 14.7l7 5.1C15.1 16 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 16.1 3 9.3 7.8 6.3 14.7z" />
                <path fill="#FBBC05" d="M24 45c5.5 0 10.5-1.8 14.4-4.9l-6.7-5.5C29.6 36.4 26.9 37 24 37c-5.7 0-10.6-3.1-11.7-7.5l-7 5.4C8.4 41.2 15.6 45 24 45z" />
                <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-1.1 3-3.4 5.5-6.3 7.1l6.7 5.5C40.5 38 45 32 45 24c0-1.4-.2-2.7-.5-4z" />
              </svg>
            </div>

            <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
              החיבור הצליח
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 20 }}>
              מחובר עם: <span style={{ color: "#6366f1", fontWeight: 600 }}>{connData.email}</span>
            </p>

            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginBottom: 14, textAlign: "right" }}>
              אילו פלטפורמות לחבר עם החשבון הזה?
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {availablePlatforms.map(p => (
                <label
                  key={p.id}
                  onClick={() => togglePlatform(p.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: `1px solid ${selected[p.id] ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.1)"}`,
                    background: selected[p.id] ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.03)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    textAlign: "right",
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: 5,
                    border: `2px solid ${selected[p.id] ? "#6366f1" : "rgba(255,255,255,0.3)"}`,
                    background: selected[p.id] ? "#6366f1" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, transition: "all 0.15s",
                  }}>
                    {selected[p.id] && (
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span style={{ color: selected[p.id] ? "#fff" : "rgba(255,255,255,0.5)", fontWeight: selected[p.id] ? 600 : 400, fontSize: 14 }}>
                    {p.label}
                  </span>
                </label>
              ))}
            </div>

            {uncheckedCount > 0 && (
              <p style={{ color: "rgba(255,200,100,0.8)", fontSize: 12, marginBottom: 16, background: "rgba(255,200,100,0.08)", border: "1px solid rgba(255,200,100,0.2)", borderRadius: 8, padding: "8px 12px" }}>
                פלטפורמות שלא תבחר ניתן לחבר בנפרד עם חשבון Google אחר מדף האינטגרציות
              </p>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleConfirm}
                disabled={!Object.values(selected).some(Boolean)}
                style={{
                  flex: 1, padding: "12px 20px", borderRadius: 10, border: "none",
                  background: Object.values(selected).some(Boolean) ? "#6366f1" : "rgba(255,255,255,0.1)",
                  color: "#fff", fontWeight: 700, fontSize: 14,
                  cursor: Object.values(selected).some(Boolean) ? "pointer" : "not-allowed",
                  transition: "opacity 0.2s",
                }}
              >
                חבר פלטפורמות נבחרות
              </button>
              <button
                onClick={() => router.replace(returnTo)}
                style={{
                  padding: "12px 16px", borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "transparent", color: "rgba(255,255,255,0.5)",
                  fontWeight: 600, fontSize: 13, cursor: "pointer",
                }}
              >
                ביטול
              </button>
            </div>
          </>
        )}

        {/* Done */}
        {step === "done" && (
          <>
            <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
            <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 12 }}>החיבור הצליח!</h2>
            {savedPlatforms.length > 0 && (
              <>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginBottom: 12 }}>חוברו:</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                  {savedPlatforms.map(p => (
                    <div key={p} style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8, padding: "8px 16px", color: "#10b981", fontWeight: 600, fontSize: 14 }}>
                      ✓ {p}
                    </div>
                  ))}
                </div>
              </>
            )}
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>מועבר בחזרה למערכת...</p>
          </>
        )}

        {/* Error */}
        {step === "error" && (
          <>
            <div style={{ fontSize: 52, marginBottom: 16 }}>❌</div>
            <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 12 }}>שגיאה בחיבור</h2>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginBottom: 20 }}>לא הצלחנו לחבר את החשבון.</p>
            <button
              onClick={() => router.replace(returnTo)}
              style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "#6366f1", color: "#fff", fontWeight: 600, cursor: "pointer" }}
            >
              חזור
            </button>
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
