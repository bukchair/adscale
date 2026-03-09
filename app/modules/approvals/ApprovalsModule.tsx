"use client";
import { useState } from "react";
import { C } from "../theme";
import type { Lang } from "../page";

interface ApprovalRequest {
  id: string; title: string; titleEn: string; reason: string; reasonEn: string;
  type: string; campaign: string; riskLevel: "low" | "medium" | "high" | "critical";
  expectedImpact: string; expectedImpactEn: string; confidence: number;
  payload: Record<string, any>; status: "PENDING" | "APPROVED" | "REJECTED";
  autoApproveAt?: string; createdAt: string;
}

interface AutomationRule {
  id: string; name: string; nameEn: string; trigger: string; triggerEn: string;
  action: string; actionEn: string; enabled: boolean; lastTriggered?: string;
  triggerCount: number; category: "budget" | "bid" | "keyword" | "campaign";
}

const RISK_COLORS = { low: "#10b981", medium: "#f59e0b", high: "#f97316", critical: "#ef4444" };
const RISK_HE = { low: "נמוך", medium: "בינוני", high: "גבוה", critical: "קריטי" };
const RISK_EN = { low: "Low", medium: "Medium", high: "High", critical: "Critical" };

const MOCK_APPROVALS: ApprovalRequest[] = [
  { id: "1", title: "הוסף 5 מילות מפתח שליליות", titleEn: "Add 5 negative keywords", reason: "זוהו שאילתות עם הוצאה של ₪890 ואפס המרות", reasonEn: "Queries identified with ₪890 spend and zero conversions", type: "ADD_NEGATIVE_KEYWORD", campaign: "Shopping - Best Sellers", riskLevel: "high", expectedImpact: "חיסכון ₪890/חודש", expectedImpactEn: "Save ₪890/month", confidence: 0.94, payload: { keywords: ["חינם", "תיקון", "diy", "מדריך", "עבודה"] }, status: "PENDING", createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "2", title: "הגדל תקציב ב-₪100/יום", titleEn: "Increase budget by ₪100/day", reason: "קמפיין מנצל 68% מהתקציב, POAS 2.8x — פוטנציאל צמיחה", reasonEn: "Campaign utilizing 68% of budget, POAS 2.8x — growth potential", type: "RAISE_BUDGET", campaign: "Shopping - Best Sellers", riskLevel: "low", expectedImpact: "+₪3,200 הכנסה שבועית", expectedImpactEn: "+₪3,200 weekly revenue", confidence: 0.87, payload: { from: 500, to: 600 }, status: "PENDING", autoApproveAt: new Date(Date.now() + 86400000).toISOString(), createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: "3", title: "הפסק קמפיין הפסדי", titleEn: "Pause losing campaign", reason: "הקמפיין הפסיד ₪652 ב-14 יום. POAS: -0.35x", reasonEn: "Campaign lost ₪652 over 14 days. POAS: -0.35x", type: "PAUSE_CAMPAIGN", campaign: "Google - Competitors", riskLevel: "critical", expectedImpact: "עצור הפסד ₪46/יום", expectedImpactEn: "Stop ₪46/day loss", confidence: 0.92, payload: { campaignId: "123" }, status: "PENDING", createdAt: new Date(Date.now() - 1800000).toISOString() },
  { id: "4", title: "שנה אסטרטגיית הצעת מחיר", titleEn: "Change bidding strategy", reason: "מעבר מ-Manual CPC ל-Target ROAS 5x על פי ביצועים", reasonEn: "Switch from Manual CPC to Target ROAS 5x based on performance", type: "ADJUST_BID", campaign: "Search - Brand", riskLevel: "medium", expectedImpact: "+18% המרות", expectedImpactEn: "+18% conversions", confidence: 0.74, payload: { strategy: "TARGET_ROAS", target: 5.0 }, status: "PENDING", autoApproveAt: new Date(Date.now() + 86400000).toISOString(), createdAt: new Date(Date.now() - 5400000).toISOString() },
];

const MOCK_RULES: AutomationRule[] = [
  { id: "r1", name: "עצור קמפיין כשה-POAS נמוך מ-1x", nameEn: "Pause campaign when POAS < 1x", trigger: "POAS < 1.0 למשך 7 ימים רצופים", triggerEn: "POAS < 1.0 for 7 consecutive days", action: "השהה קמפיין + שלח התראה", actionEn: "Pause campaign + send alert", enabled: true, lastTriggered: new Date(Date.now() - 86400000 * 3).toISOString(), triggerCount: 2, category: "campaign" },
  { id: "r2", name: "הגדל תקציב אוטומטית", nameEn: "Auto-increase budget", trigger: "ניצול תקציב > 85% + POAS > 2.5x", triggerEn: "Budget utilization > 85% + POAS > 2.5x", action: "הגדל תקציב ב-20% (עד מקסימום ₪2,000/יום)", actionEn: "Increase budget by 20% (up to ₪2,000/day max)", enabled: true, lastTriggered: new Date(Date.now() - 86400000).toISOString(), triggerCount: 7, category: "budget" },
  { id: "r3", name: "הוסף מילות מפתח שליליות", nameEn: "Auto-add negative keywords", trigger: "הוצאה > ₪200 + 0 המרות על שאילתה", triggerEn: "Spend > ₪200 + 0 conversions on query", action: "הוסף לרשימה שלילית + צור בקשת אישור", actionEn: "Add to negative list + create approval request", enabled: true, triggerCount: 14, category: "keyword" },
  { id: "r4", name: "התאם הצעות מחיר לפי שעה", nameEn: "Adjust bids by hour", trigger: "שעות שיא: 08:00-12:00, 20:00-23:00", triggerEn: "Peak hours: 08:00-12:00, 20:00-23:00", action: "+15% הצעת מחיר בשעות שיא, -10% בשעות שפל", actionEn: "+15% bid during peak hours, -10% during off-peak", enabled: false, triggerCount: 0, category: "bid" },
  { id: "r5", name: "הפחת תקציב בביצועים נמוכים", nameEn: "Reduce budget on low performance", trigger: "POAS < 1.5x + הוצאה > ₪500/יום", triggerEn: "POAS < 1.5x + Spend > ₪500/day", action: "הפחת תקציב ב-30% + צור בקשת אישור", actionEn: "Reduce budget by 30% + create approval request", enabled: true, lastTriggered: new Date(Date.now() - 86400000 * 5).toISOString(), triggerCount: 3, category: "budget" },
];

const TYPE_ICONS: Record<string, string> = { ADD_NEGATIVE_KEYWORD: "🚫", RAISE_BUDGET: "📈", LOWER_BUDGET: "📉", PAUSE_CAMPAIGN: "⏸️", ADJUST_BID: "🎯", SUGGEST_CREATIVE: "✍️" };
const CATEGORY_ICONS: Record<string, string> = { budget: "📈", bid: "🎯", keyword: "🔍", campaign: "📊" };

function ApprovalsTab({ lang }: { lang: Lang }) {
  const t = (he: string, en: string) => lang === "he" ? he : en;
  const [requests, setRequests] = useState(MOCK_APPROVALS);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  const RISK_LABELS = lang === "he" ? RISK_HE : RISK_EN;
  const pending = requests.filter((r) => r.status === "PENDING");
  const approve = (id: string) => setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "APPROVED" } : r));
  const reject = (id: string) => setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "REJECTED" } : r));
  const approveAll = () => setRequests((prev) => prev.map((r) => r.riskLevel !== "critical" ? { ...r, status: "APPROVED" } : r));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 12 }}>
          {(["critical", "high", "medium", "low"] as const).map((r) => (
            <div key={r} style={{ background: `${RISK_COLORS[r]}11`, border: `1px solid ${RISK_COLORS[r]}33`, borderRadius: 8, padding: "8px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: RISK_COLORS[r] }}>{pending.filter((req) => req.riskLevel === r).length}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>{RISK_LABELS[r]}</div>
            </div>
          ))}
        </div>
        {pending.length > 0 && (
          <button onClick={approveAll} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #10b981", background: "#10b98111", color: "#10b981", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            ✅ {t("אשר כל הנמוך/בינוני", "Approve Low/Medium Risk")}
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {requests.map((req) => (
          <div key={req.id} style={{ background: C.card, border: `1px solid ${RISK_COLORS[req.riskLevel]}33`, borderRight: `4px solid ${RISK_COLORS[req.riskLevel]}`, borderRadius: 12, padding: 20, opacity: req.status !== "PENDING" ? 0.6 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>{TYPE_ICONS[req.type] || "🎯"}</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{lang === "he" ? req.title : req.titleEn}</span>
                  <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, background: `${RISK_COLORS[req.riskLevel]}22`, color: RISK_COLORS[req.riskLevel], fontWeight: 600 }}>
                    {RISK_LABELS[req.riskLevel]}
                  </span>
                  {req.status !== "PENDING" && (
                    <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, background: req.status === "APPROVED" ? "#10b98122" : "#ef444422", color: req.status === "APPROVED" ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                      {req.status === "APPROVED" ? `✅ ${t("אושר", "Approved")}` : `❌ ${t("נדחה", "Rejected")}`}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 8 }}>{lang === "he" ? req.reason : req.reasonEn}</div>
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: C.textMuted }}>
                  <span>📊 {req.campaign}</span>
                  <span style={{ color: "#10b981" }}>⚡ {lang === "he" ? req.expectedImpact : req.expectedImpactEn}</span>
                  <span>{t("ביטחון", "Confidence")}: {Math.round(req.confidence * 100)}%</span>
                  {req.autoApproveAt && <span style={{ color: "#f59e0b" }}>⏳ {t("אוטו-אישור ב-24 שעות", "Auto-approve in 24h")}</span>}
                </div>
              </div>
              {req.status === "PENDING" && (
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => setExpanded(expanded === req.id ? null : req.id)} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.textMuted, cursor: "pointer", fontSize: 12 }}>
                    👁️ {t("פרטים", "Details")}
                  </button>
                  <button onClick={() => reject(req.id)} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #ef4444", background: "#ef444411", color: "#ef4444", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    ❌ {t("דחה", "Reject")}
                  </button>
                  <button onClick={() => approve(req.id)} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    ✅ {t("אשר", "Approve")}
                  </button>
                </div>
              )}
            </div>
            {expanded === req.id && (
              <div style={{ marginTop: 16, padding: 16, background: C.pageBg, borderRadius: 8 }}>
                <pre style={{ fontSize: 12, color: C.textMuted, margin: 0, overflow: "auto" }}>{JSON.stringify(req.payload, null, 2)}</pre>
                <div style={{ marginTop: 12 }}>
                  <input value={notes[req.id] || ""} onChange={(e) => setNotes((prev) => ({ ...prev, [req.id]: e.target.value }))} placeholder={t("הוסף הערה (אופציונלי)...", "Add a note (optional)...")}
                    style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AutomationsTab({ lang }: { lang: Lang }) {
  const t = (he: string, en: string) => lang === "he" ? he : en;
  const [rules, setRules] = useState(MOCK_RULES);
  const [showEditor, setShowEditor] = useState(false);
  const [newRule, setNewRule] = useState({ name: "", nameEn: "", trigger: "", action: "", category: "budget" as AutomationRule["category"] });

  const toggleRule = (id: string) => setRules((prev) => prev.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r));
  const deleteRule = (id: string) => setRules((prev) => prev.filter((r) => r.id !== id));
  const activeCount = rules.filter((r) => r.enabled).length;
  const totalTriggers = rules.reduce((s, r) => s + r.triggerCount, 0);

  const addRule = () => {
    if (!newRule.name && !newRule.nameEn) return;
    const rule: AutomationRule = {
      id: `r${Date.now()}`, name: newRule.name || newRule.nameEn, nameEn: newRule.nameEn || newRule.name,
      trigger: newRule.trigger, triggerEn: newRule.trigger, action: newRule.action, actionEn: newRule.action,
      enabled: true, triggerCount: 0, category: newRule.category,
    };
    setRules((prev) => [rule, ...prev]);
    setNewRule({ name: "", nameEn: "", trigger: "", action: "", category: "budget" });
    setShowEditor(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Stats */}
      <div style={{ display: "flex", gap: 12 }}>
        {[
          { label: t("חוקים פעילים", "Active Rules"), value: activeCount, color: "#10b981" },
          { label: t("סה״כ חוקים", "Total Rules"), value: rules.length, color: "#6366f1" },
          { label: t("סה״כ הפעלות", "Total Triggers"), value: totalTriggers, color: "#f59e0b" },
        ].map((s) => (
          <div key={s.label} style={{ flex: 1, background: `${s.color}11`, border: `1px solid ${s.color}33`, borderRadius: 10, padding: "14px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
        <button onClick={() => setShowEditor(!showEditor)} style={{ padding: "0 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
          ➕ {t("חוק חדש", "New Rule")}
        </button>
      </div>

      {/* Rule Editor */}
      {showEditor && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 16 }}>
            ✏️ {t("יצירת חוק אוטומציה חדש", "Create New Automation Rule")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <input value={newRule.name} onChange={(e) => setNewRule((p) => ({ ...p, name: e.target.value }))}
              placeholder={t("שם החוק (עברית)", "Rule name (Hebrew)")}
              style={{ background: C.pageBg, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none" }} />
            <input value={newRule.nameEn} onChange={(e) => setNewRule((p) => ({ ...p, nameEn: e.target.value }))}
              placeholder="Rule name (English)"
              style={{ background: C.pageBg, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none" }} />
            <input value={newRule.trigger} onChange={(e) => setNewRule((p) => ({ ...p, trigger: e.target.value }))}
              placeholder={t("תנאי הפעלה (לדוג׳: POAS < 1.0)", "Trigger condition (e.g. POAS < 1.0)")}
              style={{ background: C.pageBg, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none" }} />
            <input value={newRule.action} onChange={(e) => setNewRule((p) => ({ ...p, action: e.target.value }))}
              placeholder={t("פעולה לביצוע", "Action to perform")}
              style={{ background: C.pageBg, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none" }} />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select value={newRule.category} onChange={(e) => setNewRule((p) => ({ ...p, category: e.target.value as AutomationRule["category"] }))}
              style={{ background: C.pageBg, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none" }}>
              <option value="budget">{t("תקציב", "Budget")}</option>
              <option value="bid">{t("הצעת מחיר", "Bid")}</option>
              <option value="keyword">{t("מילת מפתח", "Keyword")}</option>
              <option value="campaign">{t("קמפיין", "Campaign")}</option>
            </select>
            <button onClick={addRule} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              {t("שמור חוק", "Save Rule")}
            </button>
            <button onClick={() => setShowEditor(false)} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.textMuted, cursor: "pointer", fontSize: 13 }}>
              {t("ביטול", "Cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rules.map((rule) => (
          <div key={rule.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, opacity: rule.enabled ? 1 : 0.6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 18 }}>{CATEGORY_ICONS[rule.category]}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{lang === "he" ? rule.name : rule.nameEn}</span>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: rule.enabled ? "#10b98122" : "#94a3b822", color: rule.enabled ? "#10b981" : C.textMuted, fontWeight: 600 }}>
                    {rule.enabled ? t("פעיל", "Active") : t("מושבת", "Disabled")}
                  </span>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: `${C.border}`, color: C.textMuted }}>
                    {t("קטגוריה:", "Category:")} {CATEGORY_ICONS[rule.category]} {t(
                      rule.category === "budget" ? "תקציב" : rule.category === "bid" ? "הצעת מחיר" : rule.category === "keyword" ? "מילות מפתח" : "קמפיין",
                      rule.category === "budget" ? "Budget" : rule.category === "bid" ? "Bid" : rule.category === "keyword" ? "Keyword" : "Campaign"
                    )}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <div style={{ background: C.pageBg, borderRadius: 8, padding: "8px 12px" }}>
                    <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>⚡ {t("תנאי הפעלה", "Trigger")}</div>
                    <div style={{ fontSize: 12, color: C.text }}>{lang === "he" ? rule.trigger : rule.triggerEn}</div>
                  </div>
                  <div style={{ background: C.pageBg, borderRadius: 8, padding: "8px 12px" }}>
                    <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>🔧 {t("פעולה", "Action")}</div>
                    <div style={{ fontSize: 12, color: C.text }}>{lang === "he" ? rule.action : rule.actionEn}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 11, color: C.textMuted }}>
                  <span>🔁 {t("הופעל", "Triggered")} {rule.triggerCount} {t("פעמים", "times")}</span>
                  {rule.lastTriggered && (
                    <span>🕐 {t("אחרון:", "Last:")} {new Date(rule.lastTriggered).toLocaleDateString(lang === "he" ? "he-IL" : "en-US")}</span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                <button onClick={() => toggleRule(rule.id)} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${rule.enabled ? "#f59e0b" : "#10b981"}`, background: rule.enabled ? "#f59e0b11" : "#10b98111", color: rule.enabled ? "#f59e0b" : "#10b981", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                  {rule.enabled ? `⏸️ ${t("השבת", "Disable")}` : `▶️ ${t("הפעל", "Enable")}`}
                </button>
                <button onClick={() => deleteRule(rule.id)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #ef4444", background: "#ef444411", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ApprovalsModule({ lang }: { lang: Lang }) {
  const t = (he: string, en: string) => lang === "he" ? he : en;
  const [tab, setTab] = useState<"approvals" | "automations">("approvals");

  const TABS = [
    { key: "approvals" as const, label: t("אישורים", "Approvals"), icon: "✅" },
    { key: "automations" as const, label: t("אוטומציות", "Automations"), icon: "⚙️" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Tab Switcher */}
      <div style={{ display: "flex", gap: 4, background: C.pageBg, borderRadius: 10, padding: 4, width: "fit-content" }}>
        {TABS.map((tb) => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            style={{ padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.2s",
              background: tab === tb.key ? "linear-gradient(135deg, #6366f1, #4f46e5)" : "transparent",
              color: tab === tb.key ? "#fff" : C.textMuted }}>
            {tb.icon} {tb.label}
          </button>
        ))}
      </div>

      {tab === "approvals" && <ApprovalsTab lang={lang} />}
      {tab === "automations" && <AutomationsTab lang={lang} />}
    </div>
  );
}
