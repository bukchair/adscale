"use client";
import { useState } from "react";
import { C } from "../theme";
import type { Lang } from "../page";

/* ── Types ──────────────────────────────────────────────────────── */
type AudiencePlatform = "google" | "meta" | "tiktok";
type AudienceType = "remarketing" | "custom" | "lookalike" | "in_market" | "crm";

interface Audience {
  id: string;
  platform: AudiencePlatform;
  name: string; nameEn: string;
  type: AudienceType;
  size: number;
  status: "active" | "syncing" | "error" | "paused";
  lastSync: string;
  cpa?: number; roas?: number; convRate?: number;
}

/* ── Mock data ──────────────────────────────────────────────────── */
const AUDIENCES: Audience[] = [
  { id:"g1", platform:"google", name:"רימרקטינג — כל האתר",         nameEn:"Website Remarketing",      type:"remarketing", size:45200, status:"active",  lastSync:"לפני 2 שעות",     cpa:38,  roas:6.2, convRate:4.1 },
  { id:"g2", platform:"google", name:"רימרקטינג — עגלות נטושות",     nameEn:"Abandoned Cart Remarketing", type:"remarketing", size:8700,  status:"active",  lastSync:"לפני 2 שעות",     cpa:22,  roas:9.8, convRate:7.4 },
  { id:"g3", platform:"google", name:"Customer Match — רשימת לקוחות",nameEn:"Customer Match — CRM List",  type:"crm",         size:12400, status:"active",  lastSync:"לפני 1 יום",       cpa:29,  roas:7.1, convRate:5.9 },
  { id:"g4", platform:"google", name:"In-Market — נעלי ספורט",       nameEn:"In-Market — Sport Shoes",   type:"in_market",   size:340000,status:"active",  lastSync:"אוטומטי",          cpa:51,  roas:4.3, convRate:2.8 },
  { id:"m1", platform:"meta",   name:"Custom Audience — רוכשים",     nameEn:"Custom — Purchasers (180d)",type:"custom",      size:12800, status:"active",  lastSync:"לפני 3 שעות",     cpa:24,  roas:8.9, convRate:6.8 },
  { id:"m2", platform:"meta",   name:"Lookalike 1% (IL) — רוכשים",   nameEn:"Lookalike 1% IL — Buyers",  type:"lookalike",   size:380000,status:"active",  lastSync:"לפני 3 שעות",     cpa:44,  roas:5.1, convRate:3.2 },
  { id:"m3", platform:"meta",   name:"Lookalike 2-3% (IL)",          nameEn:"Lookalike 2-3% IL",         type:"lookalike",   size:740000,status:"active",  lastSync:"לפני 3 שעות",     cpa:58,  roas:3.8, convRate:2.1 },
  { id:"m4", platform:"meta",   name:"Custom — מבקרי דפי מוצרים",   nameEn:"Custom — Product Page Views",type:"custom",     size:28400, status:"active",  lastSync:"לפני 3 שעות",     cpa:31,  roas:7.4, convRate:5.1 },
  { id:"m5", platform:"meta",   name:"Custom — עגלות נטושות 14d",    nameEn:"Custom — Abandoned Cart 14d",type:"remarketing",size:6200,  status:"syncing", lastSync:"מסתנכרן...",       cpa:19,  roas:11.2,convRate:8.6 },
  { id:"t1", platform:"tiktok", name:"Website Visitors 30d",         nameEn:"Website Visitors 30d",      type:"remarketing", size:8400,  status:"active",  lastSync:"לפני 5 שעות",     cpa:41,  roas:4.9, convRate:3.4 },
  { id:"t2", platform:"tiktok", name:"Lookalike — Purchasers",       nameEn:"Lookalike — Purchasers",    type:"lookalike",   size:520000,status:"active",  lastSync:"לפני 5 שעות",     cpa:52,  roas:3.7, convRate:2.2 },
  { id:"t3", platform:"tiktok", name:"Engaged Users 90d",            nameEn:"Engaged Users 90d",         type:"custom",      size:31000, status:"paused",  lastSync:"לפני 2 ימים",     cpa:67,  roas:3.1, convRate:1.8 },
];

const PLATFORM_META = {
  google: { label:"Google Ads", icon:"🔍", color:"#4285f4", bg:"#e8f0fe" },
  meta:   { label:"Meta Ads",   icon:"📘", color:"#1877f2", bg:"#e7f3ff" },
  tiktok: { label:"TikTok Ads", icon:"🎵", color:"#010101", bg:"#f0f0f0" },
};

const TYPE_LABELS = {
  he: { remarketing:"🔄 רימרקטינג", custom:"👥 קהל מותאם", lookalike:"🪞 דומה", in_market:"🛒 In-Market", crm:"📋 CRM" },
  en: { remarketing:"🔄 Remarketing", custom:"👥 Custom",    lookalike:"🪞 Lookalike", in_market:"🛒 In-Market", crm:"📋 CRM" },
};

const STATUS_COLORS: Record<string,string> = { active:"#10b981", syncing:"#f59e0b", error:"#ef4444", paused:"#94a3b8" };
const STATUS_BG:     Record<string,string> = { active:"#d1fae5", syncing:"#fef3c7", error:"#fee2e2", paused:"#f1f5f9" };

/* ── Stat card ───────────────────────────────────────────────────── */
function KpiCard({ icon, label, val, sub, color, bg }: { icon:string; label:string; val:string; sub?:string; color:string; bg:string }) {
  return (
    <div className="as-card" style={{ padding:"14px 16px", background:bg, border:`1px solid ${color}22` }}>
      <div style={{ fontSize:20, marginBottom:6 }}>{icon}</div>
      <div style={{ fontSize:20, fontWeight:700, color:C.text }}>{val}</div>
      <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color, fontWeight:600, marginTop:3 }}>{sub}</div>}
    </div>
  );
}

/* ── Create audience form ────────────────────────────────────────── */
function CreateAudiencePanel({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const t = (he: string, en: string) => lang==="he" ? he : en;
  const [selectedPlatform, setSelectedPlatform] = useState<AudiencePlatform>("meta");
  const [type, setType] = useState<AudienceType>("remarketing");
  const [name, setName] = useState("");
  const [days, setDays] = useState("30");
  const [creating, setCreating] = useState(false);
  const [done, setDone] = useState(false);

  const create = async () => {
    setCreating(true);
    await new Promise(r => setTimeout(r, 1600));
    setCreating(false);
    setDone(true);
  };

  if (done) return (
    <div style={{ padding:32, textAlign:"center" }}>
      <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
      <div style={{ fontSize:16, fontWeight:700, color:C.green, marginBottom:6 }}>{t("הקהל נוצר בהצלחה!","Audience created successfully!")}</div>
      <div style={{ fontSize:13, color:C.textSub, marginBottom:20 }}>{t("הקהל מסתנכרן ויהיה זמין תוך 24-48 שעות","Audience is syncing and will be available in 24-48 hours")}</div>
      <button onClick={onClose} style={{ padding:"10px 24px", borderRadius:8, border:"none", background:C.accent, color:"#fff", cursor:"pointer", fontWeight:700 }}>{t("סגור","Close")}</button>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, padding:20 }}>
      {/* Platform */}
      <div>
        <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:8 }}>{t("פלטפורמה","Platform")}</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {(["google","meta","tiktok"] as const).map(pl => {
            const m = PLATFORM_META[pl];
            return (
              <button key={pl} onClick={()=>setSelectedPlatform(pl)} style={{ flex:1, minWidth:80, display:"flex", flexDirection:"column", alignItems:"center", gap:6, padding:"12px 8px", borderRadius:10, border:`2px solid ${selectedPlatform===pl?m.color:C.border}`, background:selectedPlatform===pl?m.bg:C.card, cursor:"pointer", fontSize:12, fontWeight:700, color:selectedPlatform===pl?m.color:C.textSub, transition:"all 0.15s" }}>
                <span style={{ fontSize:20 }}>{m.icon}</span>{m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Type */}
      <div>
        <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:8 }}>{t("סוג קהל","Audience Type")}</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {(["remarketing","custom","lookalike","crm"] as const).map(tp => (
            <button key={tp} onClick={()=>setType(tp)} style={{ padding:"7px 14px", borderRadius:20, border:`1px solid ${type===tp?C.accent:C.border}`, background:type===tp?C.accentLight:C.card, color:type===tp?C.accent:C.textSub, cursor:"pointer", fontSize:12, fontWeight:600 }}>
              {lang==="he" ? TYPE_LABELS.he[tp] : TYPE_LABELS.en[tp]}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div>
        <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:8 }}>{t("שם הקהל","Audience Name")}</div>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder={t("לדוגמה: רוכשים 30 יום","e.g. Purchasers 30d")} style={{ width:"100%", padding:"9px 12px", border:`1px solid ${C.border}`, borderRadius:8, background:C.inputBg, color:C.text, fontSize:13, boxSizing:"border-box" }} />
      </div>

      {/* Days */}
      {(type==="remarketing"||type==="custom") && (
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:8 }}>{t("חלון זמן (ימים)","Lookback Window (days)")}</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {["7","14","30","60","90","180"].map(d => (
              <button key={d} onClick={()=>setDays(d)} style={{ padding:"7px 14px", borderRadius:20, border:`1px solid ${days===d?C.accent:C.border}`, background:days===d?C.accentLight:C.card, color:days===d?C.accent:C.textSub, cursor:"pointer", fontSize:12, fontWeight:600 }}>{d}d</button>
            ))}
          </div>
        </div>
      )}

      {/* Source if lookalike */}
      {type==="lookalike" && (
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:8 }}>{t("מקור","Source Audience")}</div>
          <select style={{ width:"100%", padding:"9px 12px", border:`1px solid ${C.border}`, borderRadius:8, background:C.inputBg, color:C.text, fontSize:13 }}>
            <option>{t("רוכשים — 180 יום","Purchasers — 180d")}</option>
            <option>{t("מבקרי אתר — 30 יום","Website Visitors — 30d")}</option>
            <option>{t("רשימת CRM","CRM List")}</option>
          </select>
          <div style={{ fontSize:12, fontWeight:700, color:C.text, marginTop:12, marginBottom:6 }}>{t("אחוז דמיון","Similarity %")}</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {["1%","2%","3%","5%","10%"].map(pct => (
              <button key={pct} style={{ padding:"7px 14px", borderRadius:20, border:`1px solid ${C.border}`, background:C.card, color:C.textSub, cursor:"pointer", fontSize:12, fontWeight:600 }}>{pct}</button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display:"flex", gap:10 }}>
        <button onClick={onClose} style={{ padding:"10px 18px", borderRadius:8, border:`1px solid ${C.border}`, background:C.card, color:C.textSub, cursor:"pointer", fontWeight:600 }}>{t("ביטול","Cancel")}</button>
        <button onClick={create} disabled={creating||!name} style={{ flex:1, padding:"10px 18px", borderRadius:8, border:"none", background:creating||!name?C.border:C.accent, color:"#fff", cursor:creating||!name?"not-allowed":"pointer", fontWeight:700, fontSize:14 }}>
          {creating ? `⏳ ${t("יוצר...","Creating...")}` : `+ ${t("צור קהל","Create Audience")}`}
        </button>
      </div>
    </div>
  );
}

/* ── Main module ────────────────────────────────────────────────── */
export default function AudiencesModule({ lang }: { lang: Lang }) {
  const t = (he: string, en: string) => lang==="he" ? he : en;
  const [tab, setTab] = useState<"overview"|"create"|"insights">("overview");
  const [platformFilter, setPlatformFilter] = useState<"all"|AudiencePlatform>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(t("לפני 5 דקות","5 minutes ago"));

  const filtered = platformFilter==="all" ? AUDIENCES : AUDIENCES.filter(a => a.platform===platformFilter);

  const totalAudiences = AUDIENCES.length;
  const totalReach = AUDIENCES.reduce((s,a)=>s+a.size,0);
  const activeCount = AUDIENCES.filter(a=>a.status==="active").length;
  const avgROAS = (AUDIENCES.filter(a=>a.roas).reduce((s,a)=>s+(a.roas||0),0) / AUDIENCES.filter(a=>a.roas).length).toFixed(1);

  const syncAll = async () => {
    setSyncing(true);
    await new Promise(r => setTimeout(r, 2000));
    setSyncing(false);
    setLastSync(t("עכשיו","Just now"));
  };

  const formatSize = (n: number) => n>=1000000 ? `${(n/1000000).toFixed(1)}M` : n>=1000 ? `${Math.round(n/1000)}K` : n.toString();

  return (
    <div>
      {/* Create panel overlay */}
      {showCreate && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.4)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div className="as-card" style={{ width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:16, fontWeight:700, color:C.text }}>👥 {t("צור קהל חדש","Create New Audience")}</div>
              <button onClick={()=>setShowCreate(false)} style={{ fontSize:20, color:C.textMuted, background:"none", border:"none", cursor:"pointer" }}>✕</button>
            </div>
            <CreateAudiencePanel lang={lang} onClose={()=>setShowCreate(false)} />
          </div>
        </div>
      )}

      {/* KPI row */}
      <div className="as-4col-grid" style={{ marginBottom:20 }}>
        <KpiCard icon="👥" label={t("סה\"כ קהלים","Total Audiences")}    val={totalAudiences.toString()} sub={`${activeCount} ${t("פעילים","active")}`} color={C.accent} bg={C.accentLight} />
        <KpiCard icon="🌍" label={t("כסוי כולל","Total Reach")}           val={formatSize(totalReach)} sub={t("משתמשים ייחודיים","unique users")} color={C.blue}   bg={C.blueLight}   />
        <KpiCard icon="🎯" label={t("ROAS ממוצע","Avg ROAS")}             val={`${avgROAS}x`}           sub={t("מכל הקהלים","across all audiences")} color={C.green}  bg={C.greenLight}  />
        <KpiCard icon="🔄" label={t("סנכרון אחרון","Last Sync")}         val={lastSync}                sub={syncing?t("מסתנכרן...","Syncing..."):"✅"} color={C.amber}  bg={C.amberLight}  />
      </div>

      {/* Tabs + controls */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:3, gap:2 }} className="as-tabs-scroll">
          {[{id:"overview",he:"📋 קהלים",en:"📋 Audiences"},{id:"create",he:"+ צור קהל",en:"+ Create"},{id:"insights",he:"📊 תובנות",en:"📊 Insights"}].map(tb => (
            <button key={tb.id} onClick={()=>{ if(tb.id==="create"){setShowCreate(true);}else setTab(tb.id as any); }} style={{ padding:"7px 16px", borderRadius:7, border:"none", cursor:"pointer", fontSize:13, fontWeight:600, background:tab===tb.id?C.accent:"transparent", color:tab===tb.id?"#fff":C.textSub, whiteSpace:"nowrap" }}>
              {lang==="he"?tb.he:tb.en}
            </button>
          ))}
        </div>
        <button onClick={syncAll} disabled={syncing} style={{ padding:"8px 16px", borderRadius:8, border:`1px solid ${C.border}`, background:C.card, color:C.textSub, cursor:syncing?"not-allowed":"pointer", fontSize:13, fontWeight:600 }}>
          {syncing ? `⏳ ${t("מסתנכרן...","Syncing...")}` : `🔄 ${t("סנכרן הכל","Sync All")}`}
        </button>
      </div>

      {/* Platform filter */}
      {tab==="overview" && (
        <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
          <button onClick={()=>setPlatformFilter("all")} style={{ padding:"6px 16px", borderRadius:20, border:`1px solid ${platformFilter==="all"?C.accent:C.border}`, background:platformFilter==="all"?C.accentLight:C.card, color:platformFilter==="all"?C.accent:C.textSub, cursor:"pointer", fontSize:13, fontWeight:600 }}>{t("הכל","All")} ({AUDIENCES.length})</button>
          {(["google","meta","tiktok"] as const).map(pl => {
            const m = PLATFORM_META[pl];
            const count = AUDIENCES.filter(a=>a.platform===pl).length;
            return (
              <button key={pl} onClick={()=>setPlatformFilter(pl)} style={{ padding:"6px 16px", borderRadius:20, border:`1px solid ${platformFilter===pl?m.color:C.border}`, background:platformFilter===pl?m.bg:C.card, color:platformFilter===pl?m.color:C.textSub, cursor:"pointer", fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
                <span>{m.icon}</span>{m.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Audience list */}
      {tab==="overview" && (
        <div className="as-card">
          <div className="as-table-container">
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ background:C.pageBg }}>
                  {[t("קהל","Audience"), t("גודל","Size"), t("ROAS","ROAS"), t("CPA","CPA"), t("המרה","Conv%"), t("סטטוס","Status"), t("פעולות","Actions")].map(h => (
                    <th key={h} style={{ padding:"10px 14px", textAlign:"start", color:C.textMuted, fontWeight:700, fontSize:11, textTransform:"uppercase", letterSpacing:"0.04em", borderBottom:`2px solid ${C.border}`, whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a,i) => {
                  const pm = PLATFORM_META[a.platform];
                  const statusColor = STATUS_COLORS[a.status];
                  const statusBg    = STATUS_BG[a.status];
                  const typeLabel   = lang==="he" ? TYPE_LABELS.he[a.type] : TYPE_LABELS.en[a.type];
                  return (
                    <tr key={a.id} style={{ borderBottom:`1px solid ${C.border}`, background:i%2===0?C.card:C.pageBg }}>
                      <td style={{ padding:"13px 14px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:32, height:32, borderRadius:8, background:pm.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{pm.icon}</div>
                          <div style={{ minWidth:0 }}>
                            <div style={{ fontWeight:700, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:180 }}>{lang==="he"?a.name:a.nameEn}</div>
                            <div style={{ fontSize:11, color:C.textMuted, display:"flex", gap:6 }}>
                              <span style={{ color:pm.color, fontWeight:600 }}>{pm.label}</span>
                              <span>·</span>
                              <span>{typeLabel}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:"13px 14px", fontWeight:700, color:C.text }}>{formatSize(a.size)}</td>
                      <td style={{ padding:"13px 14px" }}>
                        {a.roas && <span style={{ background:a.roas>=6?C.greenLight:a.roas>=4?C.amberLight:C.redLight, color:a.roas>=6?C.greenText:a.roas>=4?C.amberText:C.redText, fontSize:12, fontWeight:700, padding:"2px 8px", borderRadius:6 }}>{a.roas}x</span>}
                      </td>
                      <td style={{ padding:"13px 14px", color:C.textSub }}>{a.cpa ? `₪${a.cpa}` : "—"}</td>
                      <td style={{ padding:"13px 14px", color:C.textSub }}>{a.convRate ? `${a.convRate}%` : "—"}</td>
                      <td style={{ padding:"13px 14px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <span style={{ width:7, height:7, borderRadius:"50%", background:statusColor, display:"inline-block" }} />
                          <span style={{ fontSize:12, fontWeight:600, color:statusColor, background:statusBg, padding:"2px 8px", borderRadius:6 }}>
                            {a.status==="active"  ? t("פעיל","Active")   :
                             a.status==="syncing" ? t("מסתנכרן","Syncing"):
                             a.status==="paused"  ? t("מושהה","Paused")  : t("שגיאה","Error")}
                          </span>
                        </div>
                        <div style={{ fontSize:10, color:C.textMuted, marginTop:2 }}>{a.lastSync}</div>
                      </td>
                      <td style={{ padding:"13px 14px" }}>
                        <div style={{ display:"flex", gap:6 }}>
                          <button style={{ padding:"5px 10px", borderRadius:6, border:`1px solid ${C.border}`, background:C.card, color:C.textSub, cursor:"pointer", fontSize:11, fontWeight:600 }}>📊</button>
                          <button style={{ padding:"5px 10px", borderRadius:6, border:`1px solid ${C.border}`, background:C.card, color:C.textSub, cursor:"pointer", fontSize:11, fontWeight:600 }}>✏️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding:"10px 14px", borderTop:`1px solid ${C.border}`, fontSize:12, color:C.textMuted }}>
            {t(`מציג ${filtered.length} מתוך ${AUDIENCES.length} קהלים`,`Showing ${filtered.length} of ${AUDIENCES.length} audiences`)}
          </div>
        </div>
      )}

      {/* Insights tab */}
      {tab==="insights" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Overlap insight */}
          <div className="as-card" style={{ padding:20 }}>
            <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:16 }}>🔄 {t("חפיפה בין קהלים","Audience Overlap")}</div>
            {[
              { a:"Custom — רוכשים (Meta)",     b:"Lookalike 1% (Meta)",      overlap:18, risk:"high" },
              { a:"רימרקטינג אתר (Google)",     b:"Website Visitors (TikTok)", overlap:72, risk:"low" },
              { a:"Customer Match (Google)",     b:"Custom — רוכשים (Meta)",   overlap:85, risk:"high" },
            ].map((row,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", flexWrap:"wrap", gap:10, padding:"10px 0", borderBottom:i<2?`1px solid ${C.border}`:"none" }}>
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ fontSize:12, color:C.textSub }}>{row.a} ↔ {row.b}</div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:100, height:6, background:C.border, borderRadius:4 }}>
                    <div style={{ width:`${row.overlap}%`, height:"100%", borderRadius:4, background:row.overlap>70?C.green:row.overlap>30?C.amber:C.red }} />
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color:row.overlap>70?C.green:row.overlap>30?C.amberText:C.red }}>{row.overlap}%</span>
                  {row.risk==="high" && row.overlap<30 && <span style={{ fontSize:10, background:C.redLight, color:C.red, padding:"1px 6px", borderRadius:4, fontWeight:600 }}>⚠️ {t("חפיפה נמוכה","Low overlap")}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Top performing */}
          <div className="as-card" style={{ padding:20 }}>
            <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:16 }}>🏆 {t("קהלים עם ביצועים גבוהים","Top Performing Audiences")}</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[...AUDIENCES].filter(a=>a.roas).sort((a,b)=>(b.roas||0)-(a.roas||0)).slice(0,5).map((a,i) => {
                const pm = PLATFORM_META[a.platform];
                return (
                  <div key={a.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 0", borderBottom:i<4?`1px solid ${C.border}`:"none" }}>
                    <div style={{ width:24, height:24, borderRadius:6, background:i===0?C.amber:C.pageBg, color:i===0?C.amberText:C.textMuted, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, flexShrink:0 }}>{i+1}</div>
                    <div style={{ fontSize:14 }}>{pm.icon}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{lang==="he"?a.name:a.nameEn}</div>
                      <div style={{ fontSize:11, color:C.textMuted }}>{pm.label} · {formatSize(a.size)}</div>
                    </div>
                    <div style={{ display:"flex", gap:12, flexShrink:0 }}>
                      <div style={{ textAlign:"center" }}><div style={{ fontSize:14, fontWeight:700, color:C.green }}>{a.roas}x</div><div style={{ fontSize:10, color:C.textMuted }}>ROAS</div></div>
                      <div style={{ textAlign:"center" }}><div style={{ fontSize:14, fontWeight:700, color:C.text }}>₪{a.cpa}</div><div style={{ fontSize:10, color:C.textMuted }}>CPA</div></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI recommendation */}
          <div className="as-card" style={{ padding:20, background:C.accentLight, border:`1px solid ${C.accentA}` }}>
            <div style={{ fontSize:15, fontWeight:700, color:C.accent, marginBottom:12 }}>🤖 {t("המלצות AI לקהלים","AI Audience Recommendations")}</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {[
                { he:"צור Lookalike 1% מ'עגלות נטושות 14d' — פוטנציאל חיסכון של 30% בCPA", en:"Create Lookalike 1% from 'Abandoned Cart 14d' — potential 30% CPA reduction" },
                { he:"קהל 'Engaged Users 90d' (TikTok) בהשהיה — שקול להפעיל מחדש עם תקציב נמוך לטסט", en:"'Engaged Users 90d' (TikTok) is paused — consider reactivating with low test budget" },
                { he:"הוסף Lookalike 3-5% ב-Meta כדי להרחיב קהלים עם CPA גבוה", en:"Add Meta Lookalike 3-5% to scale beyond current high-ROAS audiences" },
              ].map((rec,i) => (
                <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                  <span style={{ color:C.accent, fontWeight:700, flexShrink:0 }}>•</span>
                  <div style={{ fontSize:13, color:C.accentHover }}>{lang==="he"?rec.he:rec.en}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
