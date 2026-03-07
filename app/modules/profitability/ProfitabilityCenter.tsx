"use client";
/**
 * Profitability Center Module
 * Shows net profit per campaign and per product with margin visualization.
 */
import { useApi } from "@/hooks/useApi";

interface CampaignProfit {
  campaignId:   string;
  campaignName: string;
  revenue:      number;
  adSpend:      number;
  cogs:         number;
  netProfit:    number;
  profitMargin: number;
  roas:         number;
  profitScore:  number;
}

interface Summary {
  totalSpend:   number;
  totalRevenue: number;
  netProfit:    number;
  roas:         number;
  profitMargin: number;
}

function MetricCard({ label, value, sub, color = "#1e293b" }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12,
      padding: "14px 16px", flex: 1,
    }}>
      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

export function ProfitabilityCenter({ lang, from, to }: {
  lang: "he" | "en"; from: string; to: string;
}) {
  const t = (he: string, en: string) => lang === "he" ? he : en;

  const { data: summary, loading: sLoading } = useApi<Summary>(
    "/profitability/summary", { from, to }
  );
  const { data: campaigns, loading: cLoading } = useApi<CampaignProfit[]>(
    "/profitability/campaigns", { from, to }
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Summary cards */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {sLoading ? (
          Array(5).fill(0).map((_, i) => (
            <div key={i} style={{
              flex: 1, minWidth: 120, height: 80, borderRadius: 12,
              background: "linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%)",
              backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
            }} />
          ))
        ) : summary ? (
          <>
            <MetricCard label={t("הכנסה כוללת","Total Revenue")} value={`₪${summary.totalRevenue.toLocaleString()}`} />
            <MetricCard label={t("הוצאה כוללת","Total Spend")}   value={`₪${summary.totalSpend.toLocaleString()}`}   color="#f5a623" />
            <MetricCard
              label={t("רווח נקי","Net Profit")}
              value={`₪${summary.netProfit.toLocaleString()}`}
              color={summary.netProfit >= 0 ? "#00d4aa" : "#ff4444"}
            />
            <MetricCard label="ROAS" value={`${summary.roas.toFixed(2)}x`} />
            <MetricCard
              label={t("מרג׳ין","Margin")}
              value={`${(summary.profitMargin * 100).toFixed(1)}%`}
              color={summary.profitMargin >= 0.1 ? "#00d4aa" : "#f5a623"}
            />
          </>
        ) : null}
      </div>

      {/* Campaigns table */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", fontWeight: 700, fontSize: 14 }}>
          {t("רווחיות לפי קמפיין", "Profit by Campaign")}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {[
                  t("קמפיין","Campaign"),
                  t("הכנסה","Revenue"),
                  t("הוצאה","Spend"),
                  "ROAS",
                  t("עלות סחורה","COGS"),
                  t("רווח נקי","Net Profit"),
                  t("מרג׳ין","Margin"),
                  t("ציון","Score"),
                ].map((h) => (
                  <th key={h} style={{
                    padding: "8px 12px", textAlign: "left",
                    fontSize: 11, fontWeight: 700, color: "#64748b",
                    borderBottom: "2px solid #e2e8f0",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cLoading
                ? Array(5).fill(0).map((_, i) => (
                    <tr key={i}>
                      {Array(8).fill(0).map((_, j) => (
                        <td key={j} style={{ padding: "8px 12px" }}>
                          <div style={{ height: 14, background: "#e2e8f0", borderRadius: 3 }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : campaigns?.map((c) => (
                    <tr key={c.campaignId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, maxWidth: 200 }}>
                        <span title={c.campaignName} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                          {c.campaignName}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 13 }}>₪{c.revenue.toLocaleString()}</td>
                      <td style={{ padding: "10px 12px", fontSize: 13, color: "#f5a623" }}>₪{c.adSpend.toLocaleString()}</td>
                      <td style={{ padding: "10px 12px", fontSize: 13 }}>{c.roas.toFixed(2)}x</td>
                      <td style={{ padding: "10px 12px", fontSize: 13, color: "#64748b" }}>₪{c.cogs.toLocaleString()}</td>
                      <td style={{ padding: "10px 12px", fontSize: 14, fontWeight: 800, color: c.netProfit >= 0 ? "#00d4aa" : "#ff4444" }}>
                        {c.netProfit >= 0 ? "+" : ""}₪{c.netProfit.toLocaleString()}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 13 }}>
                        {(c.profitMargin * 100).toFixed(1)}%
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <ProfitScorePill score={c.profitScore} />
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ProfitScorePill({ score }: { score: number }) {
  const color = score >= 70 ? "#00d4aa" : score >= 40 ? "#f5a623" : "#ff4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 36, height: 5, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color }}>{score}</span>
    </div>
  );
}
