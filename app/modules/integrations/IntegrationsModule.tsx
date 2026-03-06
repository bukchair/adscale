"use client";
import { useState } from "react";

interface Integration {
  id: string;
  name: string;
  platform: string;
  icon: string;
  status: "connected" | "disconnected" | "error";
  lastSync?: string;
  accountName?: string;
  color: string;
}

const INTEGRATIONS: Integration[] = [
  { id: "google", name: "Google Ads", platform: "GOOGLE_ADS", icon: "🎯", status: "connected", lastSync: new Date(Date.now() - 3600000).toISOString(), accountName: "My Store - Google Ads", color: "#4285F4" },
  { id: "meta", name: "Meta Ads", platform: "META_ADS", icon: "📘", status: "connected", lastSync: new Date(Date.now() - 7200000).toISOString(), accountName: "My Store Facebook Page", color: "#1877F2" },
  { id: "tiktok", name: "TikTok Ads", platform: "TIKTOK_ADS", icon: "🎵", status: "disconnected", color: "#010101" },
  { id: "woo", name: "WooCommerce", platform: "WOOCOMMERCE", icon: "🛒", status: "connected", lastSync: new Date(Date.now() - 1800000).toISOString(), accountName: "mystore.co.il", color: "#96588A" },
  { id: "shopify", name: "Shopify", platform: "SHOPIFY", icon: "🛍️", status: "disconnected", color: "#96BF48" },
  { id: "ga4", name: "Google Analytics 4", platform: "GA4", icon: "📊", status: "connected", lastSync: new Date(Date.now() - 86400000).toISOString(), accountName: "GA4 - MyStore", color: "#F9AB00" },
  { id: "gsc", name: "Google Search Console", platform: "GSC", icon: "🔍", status: "error", lastSync: new Date(Date.now() - 172800000).toISOString(), color: "#4CAF50" },
];

const STATUS_CONFIG = {
  connected: { color: "#10b981", label: "מחובר", icon: "●" },
  disconnected: { color: "#8888aa", label: "לא מחובר", icon: "○" },
  error: { color: "#ef4444", label: "שגיאה", icon: "!" },
};

export default function IntegrationsModule() {
  const [syncing, setSyncing] = useState<string | null>(null);

  const triggerSync = async (id: string) => {
    setSyncing(id);
    await new Promise((r) => setTimeout(r, 2000));
    setSyncing(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Summary */}
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ background: "#1a1a2e", border: "1px solid #10b98133", borderRadius: 12, padding: "16px 24px", display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#10b981" }}>{INTEGRATIONS.filter((i) => i.status === "connected").length}</div>
          <div style={{ fontSize: 12, color: "#8888aa" }}>מחוברים</div>
        </div>
        <div style={{ background: "#1a1a2e", border: "1px solid #ef444433", borderRadius: 12, padding: "16px 24px", display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#ef4444" }}>{INTEGRATIONS.filter((i) => i.status === "error").length}</div>
          <div style={{ fontSize: 12, color: "#8888aa" }}>שגיאות</div>
        </div>
        <div style={{ background: "#1a1a2e", border: "1px solid #3a3a5a", borderRadius: 12, padding: "16px 24px", display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#8888aa" }}>{INTEGRATIONS.filter((i) => i.status === "disconnected").length}</div>
          <div style={{ fontSize: 12, color: "#8888aa" }}>לא מחוברים</div>
        </div>
      </div>

      {/* Integration cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        {INTEGRATIONS.map((intg) => {
          const status = STATUS_CONFIG[intg.status];
          return (
            <div key={intg.id} style={{ background: "#1a1a2e", border: `1px solid ${intg.status === "connected" ? `${intg.color}33` : "#2a2a4a"}`, borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, background: `${intg.color}22`, border: `1px solid ${intg.color}33` }}>
                    {intg.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{intg.name}</div>
                    {intg.accountName && <div style={{ fontSize: 12, color: "#8888aa" }}>{intg.accountName}</div>}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: status.color, fontWeight: 600, display: "flex", gap: 4 }}>
                  {status.icon} {status.label}
                </span>
              </div>

              {intg.lastSync && (
                <div style={{ fontSize: 12, color: "#8888aa", marginBottom: 12 }}>
                  סנכרון אחרון: {new Date(intg.lastSync).toLocaleString("he-IL")}
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                {intg.status === "connected" ? (
                  <>
                    <button
                      onClick={() => triggerSync(intg.id)}
                      disabled={syncing === intg.id}
                      style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1px solid #3a3a5a", background: "#13132a", color: "#e0e0ff", cursor: "pointer", fontSize: 12 }}
                    >
                      {syncing === intg.id ? "🔄 מסנכרן..." : "🔄 סנכרן עכשיו"}
                    </button>
                    <button style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #3a3a5a", background: "#13132a", color: "#8888aa", cursor: "pointer", fontSize: 12 }}>
                      ⚙️
                    </button>
                  </>
                ) : intg.status === "error" ? (
                  <button style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1px solid #ef4444", background: "#ef444411", color: "#ef4444", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    🔧 תקן חיבור
                  </button>
                ) : (
                  <button style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${intg.color}, ${intg.color}88)`, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    + חבר {intg.name}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
