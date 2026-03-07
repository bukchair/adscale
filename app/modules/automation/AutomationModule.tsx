"use client";
import { useState } from "react";
import type { Lang } from "../page";

interface Policy {
  id: string; name: string; nameEn: string; trigger: string; action: string;
  mode: "DRY_RUN" | "SUGGESTION" | "APPROVAL_REQUIRED" | "AUTOMATED";
  enabled: boolean; lastTriggered?: string; timesTriggered: number;
}

const MODE_COLORS = { DRY_RUN: "#8888aa", SUGGESTION: "#3b82f6", APPROVAL_REQUIRED: "#f59e0b", AUTOMATED: "#10b981" };
const MODE_HE = { DRY_RUN: "🔍 סימולציה", SUGGESTION: "💡 הצעה", APPROVAL_REQUIRED: "✅ דורש אישור", AUTOMATED: "⚡ אוטומטי" };
const MODE_EN = { DRY_RUN: "🔍 Dry Run", SUGGESTION: "💡 Suggestion", APPROVAL_REQUIRED: "✅ Approval Required", AUTOMATED: "⚡ Automated" };

const MOCK_POLICIES: Policy[] = [
  { id: "1", name: "חסום שאילתות מבזבזות", nameEn: "Block wasteful queries", trigger: "score < 20 AND spend > 50 AND conversions = 0", action: "ADD_NEGATIVE_KEYWORD", mode: "APPROVAL_REQUIRED", enabled: true, lastTriggered: new Date(Date.now() - 3600000).toISOString(), timesTriggered: 47 },
  { id: "2", name: "הגדל תקציב — קמפיין רווחי", nameEn: "Increase budget — profitable campaign", trigger: "poas > 1.5 AND pacing < 0.75", action: "RAISE_BUDGET", mode: "APPROVAL_REQUIRED", enabled: true, lastTriggered: new Date(Date.now() - 86400000).toISOString(), timesTriggered: 8 },
  { id: "3", name: "הפסק קמפיינים הפסדיים", nameEn: "Pause losing campaigns", trigger: "net_profit < -500 AND days >= 14", action: "PAUSE_CAMPAIGN", mode: "APPROVAL_REQUIRED", enabled: false, timesTriggered: 2 },
  { id: "4", name: "הפחת הצעות מחיר — מובייל", nameEn: "Reduce bids — mobile", trigger: "mobile_cvr < desktop_cvr * 0.4", action: "ADJUST_BID", mode: "SUGGESTION", enabled: true, lastTriggered: new Date(Date.now() - 172800000).toISOString(), timesTriggered: 12 },
  { id: "5", name: "התראת קריאייטיב ישן", nameEn: "Stale creative alert", trigger: "days_since_creative_refresh > 90", action: "SUGGEST_CREATIVE", mode: "AUTOMATED", enabled: true, timesTriggered: 0 },
];

export default function AutomationModule({ lang }: { lang: Lang }) {
  const t = (he: string, en: string) => lang === "he" ? he : en;
  const [policies, setPolicies] = useState(MOCK_POLICIES);
  const [globalMode, setGlobalMode] = useState<Policy["mode"]>("APPROVAL_REQUIRED");

  const MODE_LABELS = lang === "he" ? MODE_HE : MODE_EN;
  const togglePolicy = (id: string) => setPolicies((prev) => prev.map((p) => p.id === id ? { ...p, enabled: !p.enabled } : p));
  const updateMode = (id: string, mode: Policy["mode"]) => setPolicies((prev) => prev.map((p) => p.id === id ? { ...p, mode } : p));

  const globalDesc = {
    DRY_RUN: t("מצב סימולציה: כל הפעולות יירשמו ב-audit log ללא ביצוע בפועל", "Dry Run: all actions are logged in the audit log without actual execution"),
    SUGGESTION: t("מצב הצעות: המערכת מציגה המלצות בלבד, ללא ביצוע כלל", "Suggestion mode: system shows recommendations only, no execution"),
    APPROVAL_REQUIRED: t("מצב אישור: כל פעולה ממתינה לאישור ידני לפני ביצוע", "Approval mode: every action awaits manual approval before execution"),
    AUTOMATED: t("מצב אוטומטי מלא: פעולות ברמת סיכון נמוכה מבוצעות אוטומטית", "Full automation: low-risk actions execute automatically"),
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 12, padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>⚙️ {t("מצב הפעלה גלובלי", "Global Execution Mode")}</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {(Object.keys(MODE_LABELS) as Policy["mode"][]).map((mode) => (
            <button key={mode} onClick={() => setGlobalMode(mode)} style={{ padding: "10px 20px", borderRadius: 10, border: `2px solid ${globalMode === mode ? MODE_COLORS[mode] : "#3a3a5a"}`, background: globalMode === mode ? `${MODE_COLORS[mode]}22` : "#13132a", color: globalMode === mode ? MODE_COLORS[mode] : "#8888aa", cursor: "pointer", fontSize: 13, fontWeight: globalMode === mode ? 700 : 400 }}>
              {MODE_LABELS[mode]}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "#8888aa", marginTop: 12 }}>{globalDesc[globalMode]}</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {policies.map((policy) => (
          <div key={policy.id} style={{ background: "#1a1a2e", border: `1px solid ${policy.enabled ? "#2a2a4a" : "#1a1a2a"}`, borderRadius: 12, padding: 20, opacity: policy.enabled ? 1 : 0.6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: policy.enabled ? "#fff" : "#8888aa" }}>{lang === "he" ? policy.name : policy.nameEn}</span>
                  <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, background: `${MODE_COLORS[policy.mode]}22`, color: MODE_COLORS[policy.mode], fontWeight: 600 }}>{MODE_LABELS[policy.mode]}</span>
                  {policy.enabled && <span style={{ fontSize: 11, color: "#10b981" }}>● {t("פעיל", "Active")}</span>}
                </div>
                <div style={{ fontSize: 12, color: "#6666aa", fontFamily: "monospace", background: "#13132a", padding: "6px 12px", borderRadius: 6, marginBottom: 8 }}>
                  <span style={{ color: "#8888aa" }}>TRIGGER: </span>
                  <span style={{ color: "#a78bfa" }}>{policy.trigger}</span>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#8888aa" }}>
                  <span>🎯 {t("פעולה", "Action")}: <strong style={{ color: "#e0e0ff" }}>{policy.action}</strong></span>
                  <span>🔢 {t("הופעל", "Triggered")}: <strong style={{ color: "#e0e0ff" }}>{policy.timesTriggered}x</strong></span>
                  {policy.lastTriggered && <span>⏰ {t("אחרון", "Last")}: <strong style={{ color: "#e0e0ff" }}>{lang === "he" ? `לפני ${Math.floor((Date.now() - new Date(policy.lastTriggered).getTime()) / 3600000)} שעות` : `${Math.floor((Date.now() - new Date(policy.lastTriggered).getTime()) / 3600000)}h ago`}</strong></span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                <select value={policy.mode} onChange={(e) => updateMode(policy.id, e.target.value as Policy["mode"])} style={{ background: "#13132a", border: "1px solid #3a3a5a", color: "#e0e0ff", borderRadius: 8, padding: "6px 10px", fontSize: 12 }}>
                  {(Object.keys(MODE_LABELS) as Policy["mode"][]).map((m) => <option key={m} value={m}>{MODE_LABELS[m]}</option>)}
                </select>
                <div onClick={() => togglePolicy(policy.id)} style={{ width: 44, height: 24, borderRadius: 12, cursor: "pointer", background: policy.enabled ? "#10b981" : "#3a3a5a", position: "relative", transition: "background 0.2s" }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: policy.enabled ? 23 : 3, transition: "left 0.2s" }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button style={{ padding: "12px", borderRadius: 12, border: "2px dashed #3a3a5a", background: "transparent", color: "#8888aa", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
        + {t("הוסף מדיניות אוטומציה חדשה", "Add New Automation Policy")}
      </button>
    </div>
  );
}
