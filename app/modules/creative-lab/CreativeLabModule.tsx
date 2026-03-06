"use client";
import { useState } from "react";

interface CreativeVariant {
  id: string;
  headlines: string[];
  descriptions: string[];
  angle: string;
  hook: string;
  cta: string;
  tone: string;
  strengthScore: number;
}

export default function CreativeLabModule() {
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

    // Mock generated variants
    setVariants([
      {
        id: "1", angle: "מחיר + ערך", hook: "למה לשלם יותר?",
        headlines: ["נעלי ריצה ₪299 בלבד", "משלוח חינם עד הבית", "800+ לקוחות מרוצים", "החזר כסף 30 יום", "איכות פרמיום - מחיר נגיש", "הזמן עכשיו - כמות מוגבלת"],
        descriptions: ["נעלי ריצה איכותיות במחיר שמתאים לכולם. משלוח מהיר, החזר קל, שירות אישי.", "הרגש את ההבדל בכל צעד. טכנולוגיית ריצה מתקדמת - כאן, עכשיו."],
        cta: "הזמן עכשיו", tone: "urgent", strengthScore: 87,
      },
      {
        id: "2", angle: "ביצועים + מקצועיות", hook: "הטכנולוגיה שאלופים בוחרים",
        headlines: ["נעלי ריצה מקצועיות", "טכנולוגיית Carbon Fiber", "מאושר אלופי ישראל", "תמיכת קשת מתקדמת", "0-10 ק'מ בנוחות מושלמת"],
        descriptions: ["עוצב עם ספורטאים מקצועיים. כל תכונה תורמת לביצועים שלך ברמה הבאה.", "תמיכה מלאה, חומרים מהמוביל בתחום, גמישות אופטימלית."],
        cta: "גלה את ההבדל", tone: "professional", strengthScore: 82,
      },
      {
        id: "3", angle: "דחיפות + סיפוק רגשי", hook: "הריצה שלך מתחילה עכשיו",
        headlines: ["עצור לחלום - התחל לרוץ", "כל צעד מתחיל כאן", "מה מחכה לך בחוץ?", "הרגש חופשי - רוץ!", "הזמינו לפני שיגמר"],
        descriptions: ["נעלי ריצה שגורמות לך לרצות לצאת ולרוץ. קל, נוח, מהיר.", "הפעם תצא לאימון. נעלים שמרגישות כמו חלק מגופך."],
        cta: "צא לרוץ עכשיו", tone: "friendly", strengthScore: 79,
      },
    ]);
    setGenerating(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Input form */}
      <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 12, padding: 24 }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 600 }}>✍️ יצירת קריאייטיב חדש</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: "#8888aa", display: "block", marginBottom: 6 }}>שם המוצר *</label>
            <input value={productName} onChange={(e) => setProductName(e.target.value)}
              placeholder="לדוגמה: נעלי ריצה ProRun X1"
              style={{ width: "100%", background: "#13132a", border: "1px solid #3a3a5a", color: "#e0e0ff", borderRadius: 8, padding: "10px 14px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#8888aa", display: "block", marginBottom: 6 }}>טון הקריאייטיב</label>
            <select value={tone} onChange={(e) => setTone(e.target.value)}
              style={{ width: "100%", background: "#13132a", border: "1px solid #3a3a5a", color: "#e0e0ff", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
              <option value="professional">מקצועי</option>
              <option value="friendly">ידידותי</option>
              <option value="urgent">דחוף</option>
              <option value="luxury">יוקרה</option>
              <option value="bold">נועז</option>
            </select>
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label style={{ fontSize: 12, color: "#8888aa", display: "block", marginBottom: 6 }}>תיאור קצר + יתרונות</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="תאר את המוצר, היתרונות הייחודיים, קהל יעד..."
              rows={3}
              style={{ width: "100%", background: "#13132a", border: "1px solid #3a3a5a", color: "#e0e0ff", borderRadius: 8, padding: "10px 14px", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#8888aa", display: "block", marginBottom: 6 }}>יתרונות ייחודיים (מופרד בפסיק)</label>
            <input value={usp} onChange={(e) => setUsp(e.target.value)}
              placeholder="משלוח חינם, ייצוא 5 שנים, החזר 30 יום"
              style={{ width: "100%", background: "#13132a", border: "1px solid #3a3a5a", color: "#e0e0ff", borderRadius: 8, padding: "10px 14px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#8888aa", display: "block", marginBottom: 6 }}>שפה</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}
              style={{ width: "100%", background: "#13132a", border: "1px solid #3a3a5a", color: "#e0e0ff", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
              <option value="he">עברית 🇮🇱</option>
              <option value="en">English 🇺🇸</option>
            </select>
          </div>
        </div>
        <button
          onClick={generate}
          disabled={!productName || generating}
          style={{ marginTop: 20, padding: "10px 28px", borderRadius: 8, border: "none", background: generating || !productName ? "#3a3a5a" : "linear-gradient(135deg, #7c74ff, #00d4aa)", color: "#fff", cursor: generating || !productName ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600 }}
        >
          {generating ? "🔄 יוצר קריאייטיב עם AI..." : "✨ צור קריאייטיב"}
        </button>
      </div>

      {/* Generated variants */}
      {variants.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {variants.map((v) => (
            <div key={v.id} style={{ background: "#1a1a2e", border: "1px solid #7c74ff33", borderRadius: 12, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>זווית: {v.angle}</span>
                  <span style={{ marginLeft: 12, fontSize: 13, color: "#a78bfa" }}>🎣 {v.hook}</span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ fontSize: 13, color: "#10b981", fontWeight: 700 }}>💪 {v.strengthScore}/100</div>
                  <button style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #10b981", background: "#10b98111", color: "#10b981", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    📋 העתק
                  </button>
                  <button style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #7c74ff", background: "#7c74ff11", color: "#7c74ff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    🚀 שלח לקמפיין
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#8888aa", marginBottom: 8, fontWeight: 600 }}>📌 כותרות ({v.headlines.length})</div>
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
                  <div style={{ fontSize: 12, color: "#8888aa", marginBottom: 8, fontWeight: 600 }}>📝 תיאורים ({v.descriptions.length})</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {v.descriptions.map((d, j) => (
                      <div key={j} style={{ background: "#13132a", borderRadius: 6, padding: "7px 12px", fontSize: 13, color: "#e0e0ff" }}>
                        <span>{d}</span>
                        <div style={{ fontSize: 11, color: d.length > 80 ? "#ef4444" : "#10b981", marginTop: 2 }}>{d.length}/90 תווים</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 12, background: "#7c74ff22", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
                    <span style={{ color: "#8888aa" }}>CTA: </span>
                    <strong style={{ color: "#7c74ff" }}>{v.cta}</strong>
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
