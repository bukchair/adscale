"use client";
/**
 * Search Terms Intelligence Module
 * Table with intent badges, scores, cost, and classify action.
 */
import { useState } from "react";
import { useApi, apiPost } from "@/hooks/useApi";

interface Term {
  id:          string;
  query:       string;
  intent:      string;
  intentScore: number | null;
  queryScore:  number | null;
  clicks:      number;
  cost:        string;
  conversions: number;
  cpa:         string | null;
  roas:        number | null;
  riskLevel:   string | null;
}

const INTENT_COLOR: Record<string, string> = {
  BUYER:       "#00d4aa",
  RESEARCH:    "#7c74ff",
  COMPETITOR:  "#f5a623",
  SUPPORT:     "#64748b",
  IRRELEVANT:  "#ff4444",
  LOW_INTENT:  "#94a3b8",
  UNKNOWN:     "#e2e8f0",
};

export function SearchTermsTable({
  lang,
  campaignId,
  from,
  to,
}: {
  lang:       "he" | "en";
  campaignId?: string;
  from:       string;
  to:         string;
}) {
  const t = (he: string, en: string) => lang === "he" ? he : en;
  const [page, setPage] = useState(1);
  const [intentFilter, setIntent] = useState<string | undefined>();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [classifying, setClassifying] = useState(false);

  const { data, loading, refetch } = useApi<{ data: Term[]; total: number; pages: number }>(
    "/search-terms",
    { from, to, campaignId, intent: intentFilter, page, limit: 50 }
  );

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function classifySelected() {
    if (!selected.size) return;
    setClassifying(true);
    try {
      await apiPost("/search-terms/classify", { ids: Array.from(selected) });
      setSelected(new Set());
      refetch();
    } finally {
      setClassifying(false);
    }
  }

  const INTENTS = ["BUYER", "RESEARCH", "COMPETITOR", "SUPPORT", "IRRELEVANT", "LOW_INTENT"];

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setIntent(undefined)}
            style={filterBtn(!intentFilter)}
          >
            {t("הכל", "All")}
          </button>
          {INTENTS.map((i) => (
            <button
              key={i}
              onClick={() => setIntent(intentFilter === i ? undefined : i)}
              style={filterBtn(intentFilter === i, INTENT_COLOR[i])}
            >
              {i}
            </button>
          ))}
        </div>

        {selected.size > 0 && (
          <button
            onClick={classifySelected}
            disabled={classifying}
            style={{
              marginLeft: "auto",
              padding: "6px 14px",
              borderRadius: 8, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg,#7c74ff,#5e55e8)",
              color: "#fff", fontSize: 12, fontWeight: 600,
            }}
          >
            {classifying ? "..." : `🤖 ${t("סווג", "Classify")} (${selected.size})`}
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={th()}><input type="checkbox" onChange={(e) => {
                if (e.target.checked) setSelected(new Set(data?.data.map((t) => t.id) ?? []));
                else setSelected(new Set());
              }} /></th>
              <th style={th()}>{t("שאילתה", "Query")}</th>
              <th style={th()}>{t("כוונה", "Intent")}</th>
              <th style={th()}>{t("ציון", "Score")}</th>
              <th style={th()}>{t("קליקים", "Clicks")}</th>
              <th style={th()}>{t("עלות", "Cost")}</th>
              <th style={th()}>{t("המרות", "Conv.")}</th>
              <th style={th()}>CPA</th>
              <th style={th()}>ROAS</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array(10).fill(0).map((_, i) => (
                  <tr key={i}>
                    {Array(9).fill(0).map((_, j) => (
                      <td key={j} style={td()}>
                        <div style={{ height: 16, background: "#e2e8f0", borderRadius: 4 }} />
                      </td>
                    ))}
                  </tr>
                ))
              : data?.data.map((row) => (
                  <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={td()}>
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleSelect(row.id)}
                      />
                    </td>
                    <td style={{ ...td(), fontFamily: "monospace", fontSize: 12, maxWidth: 220 }}>
                      <span title={row.query} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                        {row.query}
                      </span>
                    </td>
                    <td style={td()}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6,
                        background: (INTENT_COLOR[row.intent] ?? "#e2e8f0") + "22",
                        color:      INTENT_COLOR[row.intent] ?? "#64748b",
                      }}>
                        {row.intent}
                      </span>
                    </td>
                    <td style={td()}>
                      <ScoreBar score={row.queryScore} />
                    </td>
                    <td style={{ ...td(), textAlign: "right" }}>{row.clicks.toLocaleString()}</td>
                    <td style={{ ...td(), textAlign: "right" }}>₪{Number(row.cost).toFixed(2)}</td>
                    <td style={{ ...td(), textAlign: "right" }}>{row.conversions.toFixed(1)}</td>
                    <td style={{ ...td(), textAlign: "right" }}>
                      {row.cpa ? `₪${Number(row.cpa).toFixed(0)}` : "—"}
                    </td>
                    <td style={{ ...td(), textAlign: "right" }}>
                      {row.roas ? `${row.roas.toFixed(2)}x` : "—"}
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 14 }}>
          {Array.from({ length: data.pages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              style={{
                width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0",
                background: page === i + 1 ? "#7c74ff" : "#fff",
                color:      page === i + 1 ? "#fff" : "#64748b",
                cursor: "pointer", fontSize: 12, fontWeight: 600,
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ScoreBar({ score }: { score: number | null }) {
  if (score === null) return <span style={{ color: "#94a3b8", fontSize: 11 }}>—</span>;
  const color = score >= 60 ? "#00d4aa" : score >= 35 ? "#f5a623" : "#ff4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 40, height: 5, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color }}>{score}</span>
    </div>
  );
}

const th = () => ({
  padding: "8px 12px",
  textAlign: "left" as const,
  fontSize: 11,
  fontWeight: 700,
  color: "#64748b",
  borderBottom: "2px solid #e2e8f0",
  whiteSpace: "nowrap" as const,
});

const td = () => ({
  padding: "8px 12px",
  fontSize: 13,
  color: "#1e293b",
  verticalAlign: "middle" as const,
});

function filterBtn(active: boolean, color = "#7c74ff") {
  return {
    padding:    "4px 10px",
    borderRadius: 6,
    border:     active ? `1px solid ${color}` : "1px solid #e2e8f0",
    background: active ? color + "18" : "transparent",
    color:      active ? color : "#64748b",
    cursor:     "pointer",
    fontSize:   11,
    fontWeight: 600 as const,
  };
}
