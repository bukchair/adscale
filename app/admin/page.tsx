"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getUser, isSuperAdmin, clearUser, type AuthUser } from "../lib/auth";
import {
  getTenants, saveTenant, deleteTenant, updateTenantStatus, updateTenantPlan,
  seedDemoTenants, setViewingAsTenant, clearViewingAs,
  type Tenant, type TenantPlan, type TenantStatus,
} from "../lib/tenant";

/* ── Theme (dark, standalone) ───────────────────────────────────── */
const D = {
  bg:         "#0a0a14",
  card:       "rgba(255,255,255,0.04)",
  cardHov:    "rgba(255,255,255,0.07)",
  border:     "rgba(255,255,255,0.09)",
  borderHov:  "rgba(255,255,255,0.18)",
  text:       "#f0f0f5",
  sub:        "rgba(255,255,255,0.6)",
  muted:      "rgba(255,255,255,0.35)",
  accent:     "#6366f1",
  accentL:    "rgba(99,102,241,0.15)",
  green:      "#10b981",
  greenL:     "rgba(16,185,129,0.15)",
  amber:      "#f59e0b",
  amberL:     "rgba(245,158,11,0.15)",
  red:        "#ef4444",
  redL:       "rgba(239,68,68,0.15)",
  purple:     "#8b5cf6",
  purpleL:    "rgba(139,92,246,0.15)",
  teal:       "#0d9488",
};

const PLAN_META: Record<TenantPlan, { label: string; color: string; bg: string; price: string }> = {
  trial:   { label: "Trial",   color: D.amber,  bg: D.amberL,  price: "חינם" },
  starter: { label: "Starter", color: D.accent, bg: D.accentL, price: "$49/חודש" },
  growth:  { label: "Growth",  color: D.green,  bg: D.greenL,  price: "$149/חודש" },
  scale:   { label: "Scale",   color: D.purple, bg: D.purpleL, price: "$349/חודש" },
};

const STATUS_META: Record<TenantStatus, { he: string; en: string; color: string; bg: string }> = {
  active:    { he: "פעיל",    en: "Active",    color: D.green,  bg: D.greenL  },
  trial:     { he: "ניסיון",  en: "Trial",     color: D.amber,  bg: D.amberL  },
  suspended: { he: "מושהה",   en: "Suspended", color: D.red,    bg: D.redL    },
  cancelled: { he: "מבוטל",   en: "Cancelled", color: D.muted,  bg: "rgba(255,255,255,0.05)" },
};

function daysLeft(isoDate?: string): number {
  if (!isoDate) return 0;
  return Math.max(0, Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86400000));
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/* ── Pill ───────────────────────────────────────────────────────── */
function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ background: bg, color, border: `1px solid ${color}33`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

/* ── Edit Tenant modal ──────────────────────────────────────────── */
function EditModal({ tenant, onClose, onSave }: { tenant: Tenant; onClose: () => void; onSave: (t: Tenant) => void }) {
  const [name, setName]     = useState(tenant.name);
  const [plan, setPlan]     = useState<TenantPlan>(tenant.plan);
  const [status, setStatus] = useState<TenantStatus>(tenant.status);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}>
      <div style={{ background: "#13131f", border: `1px solid ${D.border}`, borderRadius: 16, padding: 28, width: 440, maxWidth: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight: 800, fontSize: 17, color: D.text, marginBottom: 20 }}>✏️ עריכת לקוח — {tenant.name}</div>

        <label style={{ fontSize: 12, color: D.sub, display: "block", marginBottom: 4 }}>שם העסק</label>
        <input value={name} onChange={e => setName(e.target.value)}
          style={{ width: "100%", background: D.card, border: `1px solid ${D.border}`, borderRadius: 8, padding: "9px 12px", color: D.text, fontSize: 14, marginBottom: 14, boxSizing: "border-box", outline: "none" }} />

        <label style={{ fontSize: 12, color: D.sub, display: "block", marginBottom: 4 }}>תוכנית</label>
        <select value={plan} onChange={e => setPlan(e.target.value as TenantPlan)}
          style={{ width: "100%", background: "#1a1a2e", border: `1px solid ${D.border}`, borderRadius: 8, padding: "9px 12px", color: D.text, fontSize: 14, marginBottom: 14, boxSizing: "border-box" }}>
          {(["trial","starter","growth","scale"] as TenantPlan[]).map(p => (
            <option key={p} value={p}>{PLAN_META[p].label} — {PLAN_META[p].price}</option>
          ))}
        </select>

        <label style={{ fontSize: 12, color: D.sub, display: "block", marginBottom: 4 }}>סטטוס</label>
        <select value={status} onChange={e => setStatus(e.target.value as TenantStatus)}
          style={{ width: "100%", background: "#1a1a2e", border: `1px solid ${D.border}`, borderRadius: 8, padding: "9px 12px", color: D.text, fontSize: 14, marginBottom: 22, boxSizing: "border-box" }}>
          {(["active","trial","suspended","cancelled"] as TenantStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_META[s].he}</option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => onSave({ ...tenant, name, plan, status })}
            style={{ flex: 1, background: D.accent, border: "none", borderRadius: 10, padding: "11px 0", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            שמור שינויים
          </button>
          <button onClick={onClose}
            style={{ padding: "11px 18px", background: "transparent", border: `1px solid ${D.border}`, borderRadius: 10, color: D.sub, cursor: "pointer", fontSize: 14 }}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Admin Page ────────────────────────────────────────────── */
export default function AdminPage() {
  const router = useRouter();
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch]   = useState("");
  const [filterStatus, setFilterStatus] = useState<TenantStatus | "all">("all");
  const [filterPlan,   setFilterPlan]   = useState<TenantPlan | "all">("all");
  const [editTarget,   setEditTarget]   = useState<Tenant | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [lang, setLang] = useState<"he" | "en">("he");
  const [activeSection, setActiveSection] = useState<"tenants" | "analytics" | "settings">("tenants");

  const isHe = lang === "he";
  const t = (he: string, en: string) => isHe ? he : en;

  useEffect(() => {
    const u = getUser();
    if (!u || !isSuperAdmin(u)) {
      router.replace("/modules");
      return;
    }
    setUserState(u);
    seedDemoTenants();
    setTenants(getTenants());
  }, [router]);

  const reload = () => setTenants(getTenants());

  /* ── KPI stats ─────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const all    = tenants;
    const active = all.filter(t => t.status === "active").length;
    const trial  = all.filter(t => t.status === "trial").length;
    const susp   = all.filter(t => t.status === "suspended").length;
    const mrr    = all.filter(t => t.status === "active").reduce((s, t) => {
      const p = { trial:0, starter:49, growth:149, scale:349 }[t.plan];
      return s + p;
    }, 0);
    const totalSpend = all.reduce((s, t) => s + (t.monthlySpend ?? 0), 0);
    const users  = all.reduce((s, t) => s + t.userCount, 0);
    return { total: all.length, active, trial, susp, mrr, totalSpend, users };
  }, [tenants]);

  /* ── Filtered & sorted tenants ──────────────────────────────────── */
  const filtered = useMemo(() => {
    return tenants
      .filter(t => {
        if (filterStatus !== "all" && t.status !== filterStatus) return false;
        if (filterPlan   !== "all" && t.plan   !== filterPlan)   return false;
        if (search) {
          const q = search.toLowerCase();
          return t.name.toLowerCase().includes(q) || t.ownerEmail.toLowerCase().includes(q) || t.ownerName.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [tenants, search, filterStatus, filterPlan]);

  /* ── Actions ────────────────────────────────────────────────────── */
  function handleSaveEdit(updated: Tenant) {
    saveTenant(updated);
    reload();
    setEditTarget(null);
  }

  function handleDelete(id: string) {
    deleteTenant(id);
    reload();
    setConfirmDelete(null);
  }

  function handleViewAs(tenant: Tenant) {
    setViewingAsTenant(tenant.id);
    router.push("/modules");
  }

  function handleSuspend(id: string) {
    updateTenantStatus(id, "suspended");
    reload();
  }
  function handleActivate(id: string) {
    updateTenantStatus(id, "active");
    reload();
  }

  if (!user) return <div style={{ minHeight: "100vh", background: D.bg }} />;

  const MRR_PLANS: { plan: TenantPlan; monthly: number }[] = [
    { plan: "starter", monthly: 49 },
    { plan: "growth",  monthly: 149 },
    { plan: "scale",   monthly: 349 },
  ];

  return (
    <div style={{ minHeight: "100vh", background: D.bg, color: D.text, fontFamily: "'Segoe UI', Arial, sans-serif", direction: isHe ? "rtl" : "ltr" }}>

      {/* ── Top bar ───────────────────────────────────────────────── */}
      <header style={{ background: "rgba(10,10,20,0.95)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${D.border}`, padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: D.text }}>BScale AI</div>
            <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700 }}>👑 {t("פאנל בעלים", "Owner Panel")}</div>
          </div>
          <div style={{ width: 1, height: 28, background: D.border, margin: "0 6px" }} />
          <span style={{ fontSize: 13, color: D.muted }}>{user.name} — {user.email}</span>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => setLang(l => l === "he" ? "en" : "he")}
            style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 8, padding: "5px 11px", color: D.sub, cursor: "pointer", fontSize: 12 }}>
            {isHe ? "EN" : "עב"}
          </button>
          <button onClick={() => router.push("/modules")}
            style={{ background: D.accentL, border: `1px solid ${D.accent}44`, borderRadius: 8, padding: "6px 14px", color: D.accent, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            ← {t("חזור לממשק", "Back to App")}
          </button>
          <button onClick={() => { clearUser(); router.replace("/"); }}
            style={{ background: "transparent", border: `1px solid ${D.border}`, borderRadius: 8, padding: "6px 14px", color: D.muted, cursor: "pointer", fontSize: 13 }}>
            {t("יציאה", "Logout")}
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 20px" }}>

        {/* Page title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 6px", background: "linear-gradient(90deg,#6366f1,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {t("פאנל ניהול הפלטפורמה", "Platform Management Panel")}
          </h1>
          <p style={{ color: D.muted, fontSize: 14, margin: 0 }}>
            {t("ניהול לקוחות, מנויים ובקרת חשבון", "Manage customers, subscriptions and account control")}
          </p>
        </div>

        {/* ── KPI Cards ─────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 28 }}>
          {[
            { icon: "🏢", label: t("סה\"כ לקוחות","Total Tenants"),    val: stats.total,                             color: D.accent, bg: D.accentL },
            { icon: "✅", label: t("לקוחות פעילים","Active"),          val: stats.active,                            color: D.green,  bg: D.greenL  },
            { icon: "⏱️", label: t("בניסיון","In Trial"),              val: stats.trial,                             color: D.amber,  bg: D.amberL  },
            { icon: "⚠️", label: t("מושהים","Suspended"),              val: stats.susp,                              color: D.red,    bg: D.redL    },
            { icon: "💰", label: t("MRR חודשי","Monthly MRR"),         val: `$${stats.mrr.toLocaleString()}`,        color: D.green,  bg: D.greenL  },
            { icon: "👥", label: t("סה\"כ משתמשים","Total Users"),     val: stats.users,                             color: D.purple, bg: D.purpleL },
            { icon: "📊", label: t("הוצאות פרסום","Ad Spend"),         val: `₪${(stats.totalSpend/1000).toFixed(0)}K`, color: D.teal, bg: "rgba(13,148,136,0.12)" },
          ].map((k, i) => (
            <div key={i} style={{ background: k.bg, border: `1px solid ${k.color}22`, borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{k.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: D.text }}>{k.val}</div>
              <div style={{ fontSize: 11, color: k.color, fontWeight: 600, marginTop: 2 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* ── Section tabs ──────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 4, border: `1px solid ${D.border}`, marginBottom: 24, width: "fit-content" }}>
          {([
            ["tenants",   t("👥 לקוחות","👥 Tenants")],
            ["analytics", t("📊 הכנסות","📊 Revenue")],
            ["settings",  t("⚙️ הגדרות","⚙️ Settings")],
          ] as const).map(([id, label]) => (
            <button key={id} onClick={() => setActiveSection(id)}
              style={{ padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: activeSection === id ? 700 : 400, background: activeSection === id ? "#1e1e38" : "transparent", color: activeSection === id ? D.accent : D.sub, transition: "all 0.2s" }}>
              {label}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════
            SECTION: TENANTS
        ═══════════════════════════════════════════════════════════ */}
        {activeSection === "tenants" && (
          <>
            {/* Filter bar */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder={t("🔍 חפש לקוח, אימייל...","🔍 Search tenant, email...")}
                style={{ flex: 1, minWidth: 200, background: D.card, border: `1px solid ${D.border}`, borderRadius: 8, padding: "9px 14px", color: D.text, fontSize: 13, outline: "none" }}
              />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as TenantStatus | "all")}
                style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 8, padding: "9px 14px", color: D.text, fontSize: 13 }}>
                <option value="all">{t("כל הסטטוסים","All statuses")}</option>
                {(["active","trial","suspended","cancelled"] as TenantStatus[]).map(s => (
                  <option key={s} value={s}>{STATUS_META[s].he}</option>
                ))}
              </select>
              <select value={filterPlan} onChange={e => setFilterPlan(e.target.value as TenantPlan | "all")}
                style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 8, padding: "9px 14px", color: D.text, fontSize: 13 }}>
                <option value="all">{t("כל התוכניות","All plans")}</option>
                {(["trial","starter","growth","scale"] as TenantPlan[]).map(p => (
                  <option key={p} value={p}>{PLAN_META[p].label}</option>
                ))}
              </select>
              <span style={{ fontSize: 12, color: D.muted, whiteSpace: "nowrap" }}>
                {filtered.length} {t("לקוחות","tenants")}
              </span>
            </div>

            {/* Tenant cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.length === 0 && (
                <div style={{ textAlign: "center", padding: 48, color: D.muted, fontSize: 15 }}>
                  {t("אין לקוחות התואמים את הסינון","No tenants match your filters")}
                </div>
              )}
              {filtered.map(tenant => {
                const plan   = PLAN_META[tenant.plan];
                const status = STATUS_META[tenant.status];
                const days   = daysLeft(tenant.trialEndsAt);
                const isSusp = tenant.status === "suspended";
                return (
                  <div key={tenant.id} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: "16px 20px", transition: "border-color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = D.borderHov)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = D.border)}>

                    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                      {/* Avatar */}
                      <div style={{ width: 42, height: 42, borderRadius: 11, background: `${plan.color}22`, border: `1px solid ${plan.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                        🏢
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 15, color: D.text }}>{tenant.name}</span>
                          <Pill label={status.he} color={status.color} bg={status.bg} />
                          <Pill label={plan.label} color={plan.color} bg={plan.bg} />
                          {tenant.status === "trial" && days > 0 && (
                            <Pill label={t(`${days} ימים נותרו`,`${days} days left`)} color={D.amber} bg={D.amberL} />
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: D.muted, display: "flex", gap: 16, flexWrap: "wrap" }}>
                          <span>👤 {tenant.ownerName}</span>
                          <span>✉️ {tenant.ownerEmail}</span>
                          <span>👥 {tenant.userCount} {t("משתמשים","users")}</span>
                          <span>📅 {fmtDate(tenant.createdAt)}</span>
                          {tenant.monthlySpend ? <span>💸 ₪{tenant.monthlySpend.toLocaleString()}/חודש</span> : null}
                        </div>
                      </div>

                      {/* MRR */}
                      <div style={{ textAlign: isHe ? "left" : "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: plan.color }}>{plan.price}</div>
                        <div style={{ fontSize: 11, color: D.muted }}>{t("תוכנית","plan")}</div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flexShrink: 0 }}>
                        {/* View as */}
                        <button onClick={() => handleViewAs(tenant)}
                          title={t("צפה כלקוח","View as tenant")}
                          style={{ padding: "7px 12px", background: D.accentL, border: `1px solid ${D.accent}33`, borderRadius: 8, color: D.accent, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                          👁️ {t("צפה","View")}
                        </button>
                        {/* Edit */}
                        <button onClick={() => setEditTarget(tenant)}
                          style={{ padding: "7px 12px", background: "rgba(255,255,255,0.05)", border: `1px solid ${D.border}`, borderRadius: 8, color: D.sub, cursor: "pointer", fontSize: 12 }}>
                          ✏️ {t("ערוך","Edit")}
                        </button>
                        {/* Suspend / Activate */}
                        {!isSusp ? (
                          <button onClick={() => handleSuspend(tenant.id)}
                            style={{ padding: "7px 12px", background: D.redL, border: `1px solid ${D.red}33`, borderRadius: 8, color: D.red, cursor: "pointer", fontSize: 12 }}>
                            ⏸ {t("השהה","Suspend")}
                          </button>
                        ) : (
                          <button onClick={() => handleActivate(tenant.id)}
                            style={{ padding: "7px 12px", background: D.greenL, border: `1px solid ${D.green}33`, borderRadius: 8, color: D.green, cursor: "pointer", fontSize: 12 }}>
                            ▶ {t("הפעל","Activate")}
                          </button>
                        )}
                        {/* Delete */}
                        <button onClick={() => setConfirmDelete(tenant.id)}
                          style={{ padding: "7px 10px", background: "transparent", border: `1px solid ${D.border}`, borderRadius: 8, color: D.red, cursor: "pointer", fontSize: 12 }}>
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════
            SECTION: REVENUE ANALYTICS
        ═══════════════════════════════════════════════════════════ */}
        {activeSection === "analytics" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* MRR by plan */}
            <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20, color: D.text }}>
                💰 {t("MRR לפי תוכנית","MRR by Plan")}
              </div>
              {MRR_PLANS.map(({ plan, monthly }) => {
                const count = tenants.filter(t => t.plan === plan && t.status === "active").length;
                const total = count * monthly;
                const maxMrr = Math.max(...MRR_PLANS.map(p => tenants.filter(t => t.plan === p.plan && t.status === "active").length * p.monthly), 1);
                const meta  = PLAN_META[plan];
                return (
                  <div key={plan} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <Pill label={meta.label} color={meta.color} bg={meta.bg} />
                        <span style={{ fontSize: 13, color: D.sub }}>{count} {t("לקוחות","clients")}</span>
                      </div>
                      <span style={{ fontWeight: 800, color: meta.color, fontSize: 15 }}>${total.toLocaleString()}/mo</span>
                    </div>
                    <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${(total / maxMrr) * 100}%`, height: "100%", background: meta.color, borderRadius: 4, transition: "width 0.5s" }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${D.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: D.sub, fontSize: 14 }}>{t("סה\"כ MRR","Total MRR")}</span>
                <span style={{ fontSize: 22, fontWeight: 900, color: D.green }}>${stats.mrr.toLocaleString()}</span>
              </div>
            </div>

            {/* Growth metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
              {[
                { label: t("לקוחות חדשים (30 יום)","New tenants (30d)"), val: tenants.filter(t => new Date(t.createdAt) > new Date(Date.now()-30*86400000)).length, color: D.accent, icon: "📈" },
                { label: t("ARR שנתי","Annual ARR"),   val: `$${(stats.mrr*12).toLocaleString()}`, color: D.green,  icon: "💎" },
                { label: t("ARPU ממוצע","Avg ARPU"),    val: stats.active > 0 ? `$${(stats.mrr/Math.max(stats.active,1)).toFixed(0)}` : "$0", color: D.purple, icon: "🎯" },
                { label: t("Churn — מבוטל","Churned"),  val: tenants.filter(t => t.status === "cancelled").length, color: D.red,    icon: "⚠️" },
              ].map((m, i) => (
                <div key={i} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: "20px 18px" }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{m.icon}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: m.color }}>{m.val}</div>
                  <div style={{ fontSize: 12, color: D.muted, marginTop: 4 }}>{m.label}</div>
                </div>
              ))}
            </div>

            {/* Recent activity log */}
            <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: D.text }}>📋 {t("לקוחות אחרונים","Recent Tenants")}</div>
              {tenants
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 8)
                .map((tenant, i) => {
                  const meta = PLAN_META[tenant.plan];
                  const sm   = STATUS_META[tenant.status];
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 7 ? `1px solid ${D.border}` : "none" }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: `${meta.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🏢</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: D.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tenant.name}</div>
                        <div style={{ fontSize: 11, color: D.muted }}>{tenant.ownerEmail}</div>
                      </div>
                      <Pill label={meta.label} color={meta.color} bg={meta.bg} />
                      <Pill label={sm.he} color={sm.color} bg={sm.bg} />
                      <span style={{ fontSize: 11, color: D.muted, whiteSpace: "nowrap" }}>{fmtDate(tenant.createdAt)}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            SECTION: PLATFORM SETTINGS
        ═══════════════════════════════════════════════════════════ */}
        {activeSection === "settings" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 640 }}>
            {[
              { icon: "🏷️", title: t("שם הפלטפורמה","Platform Name"),      desc: t("BScale AI","BScale AI"),        action: t("ערוך","Edit") },
              { icon: "💳", title: t("הגדרות תשלום","Payment Settings"),    desc: t("Stripe מחובר","Stripe connected"), action: t("נהל","Manage") },
              { icon: "✉️", title: t("הגדרות אימייל","Email Settings"),     desc: t("Gmail מחובר","Gmail connected"),   action: t("הגדר","Configure") },
              { icon: "🔐", title: t("אבטחה ו-SSO","Security & SSO"),       desc: t("2FA מופעל","2FA enabled"),          action: t("הגדר","Configure") },
              { icon: "📋", title: t("תנאי שימוש","Terms of Service"),       desc: t("עדכון אחרון: 2025","Last update: 2025"), action: t("עדכן","Update") },
              { icon: "🗃️", title: t("גיבוי נתונים","Data Backup"),          desc: t("גיבוי יומי אוטומטי","Daily auto backup"), action: t("הגדר","Configure") },
            ].map((s, i) => (
              <div key={i} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 24 }}>{s.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: D.text }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: D.muted, marginTop: 2 }}>{s.desc}</div>
                </div>
                <button style={{ padding: "7px 14px", background: D.accentL, border: `1px solid ${D.accent}33`, borderRadius: 8, color: D.accent, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                  {s.action}
                </button>
              </div>
            ))}

            <div style={{ background: D.redL, border: `1px solid ${D.red}33`, borderRadius: 12, padding: "16px 20px", marginTop: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: D.red, marginBottom: 8 }}>⚠️ {t("אזור מסוכן","Danger Zone")}</div>
              <p style={{ fontSize: 13, color: D.sub, margin: "0 0 12px", lineHeight: 1.6 }}>
                {t("מחיקת הפלטפורמה תמחק את כל הנתונים לצמיתות. פעולה זו אינה הפיכה.", "Deleting the platform will permanently delete all data. This action is irreversible.")}
              </p>
              <button style={{ padding: "8px 16px", background: D.red, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                🗑 {t("מחק פלטפורמה","Delete Platform")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Edit modal ───────────────────────────────────────────── */}
      {editTarget && (
        <EditModal tenant={editTarget} onClose={() => setEditTarget(null)} onSave={handleSaveEdit} />
      )}

      {/* ── Delete confirm ───────────────────────────────────────── */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setConfirmDelete(null)}>
          <div style={{ background: "#13131f", border: `1px solid ${D.red}44`, borderRadius: 16, padding: 28, width: 380, maxWidth: "100%", textAlign: "center" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>⚠️</div>
            <div style={{ fontWeight: 800, fontSize: 17, color: D.text, marginBottom: 8 }}>{t("מחיקת לקוח","Delete Tenant")}</div>
            <p style={{ color: D.sub, fontSize: 14, marginBottom: 22, lineHeight: 1.6 }}>
              {t("פעולה זו תמחק את כל הנתונים של הלקוח לצמיתות. לא ניתן לשחזר.","This will permanently delete all tenant data. Cannot be undone.")}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)}
                style={{ flex: 1, padding: "11px 0", background: "transparent", border: `1px solid ${D.border}`, borderRadius: 10, color: D.sub, cursor: "pointer", fontSize: 14 }}>
                {t("ביטול","Cancel")}
              </button>
              <button onClick={() => handleDelete(confirmDelete)}
                style={{ flex: 1, padding: "11px 0", background: D.red, border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                {t("מחק","Delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
