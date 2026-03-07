"use client";
import { useState } from "react";
import type { Lang } from "../page";

interface CreativeVariant {
  id: string; headlines: string[]; descriptions: string[];
  angle: string; angleEn: string; hook: string; hookEn: string;
  cta: string; ctaEn: string; tone: string; strengthScore: number;
}

export default function CreativeLabModule({ lang }: { lang: Lang }) {
  const t = (he: string, en: string) => lang === "he" ? he : en;
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [usp, setUsp] = useState("");
  const [tone, setTone] = useState("professional");
  const [language, setLanguage] = useState("he");
  const [generating, setGenerating] = useState(false);
  const [variants, setVariants] = useState<CreativeVariant[]>([]);

  const generate = async () => {
    if (!productName) return;
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 2500));
    setVariants([
      { id: "1", angle: "מחיר + ערך", angleEn: "Price + Value", hook: "למה לשלם יותר?", hookEn: "Why pay more?",
        headlines: ["נעלי ריצה ₪299 בלבד", "משלוח חינם עד הבית", "800+ לקוחות מרוצים", "החזר כסף 30 יום", "איכות פרמיום - מחיר נגיש"],
        descriptions: ["נעלי ריצה איכותיות במחיר שמתאים לכולם. משלוח מהיר, החזר קל, שירות אישי.", "הרגש את ההבדל בכל צעד. טכנולוגיית ריצה מתקדמת - כאן, עכשיו."],
        cta: "הזמן עכשיו", ctaEn: "Order Now", tone: "urgent", strengthScore: 87 },
      { id: "2", angle: "ביצועים + מקצועיות", angleEn: "Performance + Pro", hook: "הטכנולוגיה שאלופים בוחרים", hookEn: "The tech champions choose",
        headlines: ["נעלי ריצה מקצועיות", "טכנולוגיית Carbon Fiber", "מאושר אלופי ישראל", "תמיכת קשת מתקדמת", "0-10 ק'מ בנוחות מושלמת"],
        descriptions: ["עוצב עם ספורטאים מקצועיים. כל תכונה תורמת לביצועים שלך ברמה הבאה.", "תמיכה מלאה, חומרים מהמוביל בתחום, גמישות אופטימלית."],
        cta: "גלה את ההבדל", ctaEn: "Discover the Difference", tone: "professional", strengthScore: 82 },
      { id: "3", angle: "דחיפות + רגש", angleEn: "Urgency + Emotion", hook: "הריצה שלך מתחילה עכשיו", hookEn: "Your run starts now",
        headlines: ["עצור לחלום - התחל לרוץ", "כל צעד מתחיל כאן", "הרגש חופשי - רוץ!", "הזמינו לפני שיגמר"],
        descriptions: ["נעלי ריצה שגורמות לך לרצות לצאת ולרוץ. קל, נוח, מהיר.", "הפעם תצא לאימון. נעלים שמרגישות כמו חלק מגופך."],
        cta: "צא לרוץ עכשיו", ctaEn: "Start Running Now", tone: "friendly", strengthScore: 79 },
    ]);
    setGenerating(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 12, padding: 24 }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 600 }}>✍️ {t("יצירת קריאייטיב חדש", "Create New Creative")}</h3>
        <div className="as-creative-form-grid">
          <div>
            <label style={{ fontSize: 12, color: "#8888aa", display: "block", marginBottom: 6 }}>{t("שם המוצר *", "Product Name *")}</label>
            <input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder={t("לדוגמה: נעלי ריצה ProRun X1", "e.g. ProRun X1 Running Shoes")}
              style={{ width: "100%", background: "#13132a", border: "1px solid #3a3a5a", color: "#e0e0ff", borderRadius: 8, padding: "10px 14px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#8888aa", display: "block", marginBottom: 6 }}>{t("טון הקריאייטיב", "Creative Tone")}</label>
            <select value={tone} onChange={(e) => setTone(e.target.value)} style={{ width: "100%", background: "#13132a", border: "1px solid #3a3a5a", color: "#e0e0ff", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
              <option value="professional">{t("מקצועי", "Professional")}</option>
              <option value="friendly">{t("ידידותי", "Friendly")}</option>
              <option value="urgent">{t("דחוף", "Urgent")}</option>
              <option value="luxury">{t("יוקרה", "Luxury")}</option>
              <option value="bold">{t("נועז", "Bold")}</option>
            </select>
          </div>
          <div className="as-col-span-2">
            <label style={{ fontSize: 12, color: "#8888aa", display: "block", marginBottom: 6 }}>{t("תיאור קצר + יתרונות", "Short Description + Benefits")}</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("תאר את המוצר, היתרונות הייחודיים, קהל יעד...", "Describe the product, unique benefits, target audience...")} rows={3}
              style={{ width: "100%", background: "#13132a", border: "1px solid #3a3a5a", color: "#e0e0ff", borderRadius: 8, padding: "10px 14px", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#8888aa", display: "block", marginBottom: 6 }}>{t("יתרונות ייחודיים (מופרד בפסיק)", "Unique Selling Points (comma separated)")}</label>
            <input value={usp} onChange={(e) => setUsp(e.target.value)} placeholder={t("משלוח חינם, אחריות 5 שנים, החזר 30 יום", "Free shipping, 5-year warranty, 30-day return")}
              style={{ width: "100%", background: "#13132a", border: "1px solid #3a3a5a", color: "#e0e0ff", borderRadius: 8, padding: "10px 14px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#8888aa", display: "block", marginBottom: 6 }}>{t("שפת הקריאייטיב", "Creative Language")}</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ width: "100%", background: "#13132a", border: "1px solid #3a3a5a", color: "#e0e0ff", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
              <option value="he">עברית 🇮🇱</option>
              <option value="en">English 🇺🇸</option>
            </select>
          </div>
        </div>
        <button onClick={generate} disabled={!productName || generating}
          style={{ marginTop: 20, padding: "10px 28px", borderRadius: 8, border: "none", background: generating || !productName ? "#3a3a5a" : "linear-gradient(135deg, #7c74ff, #00d4aa)", color: "#fff", cursor: generating || !productName ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600 }}>
          {generating ? t("🔄 יוצר קריאייטיב עם AI...", "🔄 Generating with AI...") : `✨ ${t("צור קריאייטיב", "Create Creative")}`}
        </button>
      </div>

      {variants.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {variants.map((v) => (
            <div key={v.id} style={{ background: "#1a1a2e", border: "1px solid #7c74ff33", borderRadius: 12, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{t("זווית", "Angle")}: {lang === "he" ? v.angle : v.angleEn}</span>
                  <span style={{ marginLeft: 12, fontSize: 13, color: "#a78bfa" }}>🎣 {lang === "he" ? v.hook : v.hookEn}</span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ fontSize: 13, color: "#10b981", fontWeight: 700 }}>💪 {v.strengthScore}/100</div>
                  <button style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #10b981", background: "#10b98111", color: "#10b981", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    📋 {t("העתק", "Copy")}
                  </button>
                  <button style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #7c74ff", background: "#7c74ff11", color: "#7c74ff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    🚀 {t("שלח לקמפיין", "Send to Campaign")}
                  </button>
                </div>
              </div>
              <div className="as-creative-form-grid">
                <div>
                  <div style={{ fontSize: 12, color: "#8888aa", marginBottom: 8, fontWeight: 600 }}>📌 {t("כותרות", "Headlines")} ({v.headlines.length})</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {v.headlines.map((h, j) => (
                      <div key={j} style={{ background: "#13132a", borderRadius: 6, padding: "7px 12px", fontSize: 13, color: "#e0e0ff", display: "flex", justifyContent: "space-between" }}>
                        <span>{h}</span>
                        <span style={{ fontSize: 11, color: h.length > 25 ? "#ef4444" : "#10b981" }}>{h.length}/30</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#8888aa", marginBottom: 8, fontWeight: 600 }}>📝 {t("תיאורים", "Descriptions")} ({v.descriptions.length})</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {v.descriptions.map((d, j) => (
                      <div key={j} style={{ background: "#13132a", borderRadius: 6, padding: "7px 12px", fontSize: 13, color: "#e0e0ff" }}>
                        <span>{d}</span>
                        <div style={{ fontSize: 11, color: d.length > 80 ? "#ef4444" : "#10b981", marginTop: 2 }}>{d.length}/90 {t("תווים", "chars")}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 12, background: "#7c74ff22", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
                    <span style={{ color: "#8888aa" }}>CTA: </span>
                    <strong style={{ color: "#7c74ff" }}>{lang === "he" ? v.cta : v.ctaEn}</strong>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
