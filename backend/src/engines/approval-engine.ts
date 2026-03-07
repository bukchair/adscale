/**
 * Approval Engine
 * Routes recommendations through the correct approval workflow.
 *
 * LOW risk    → auto execute (AUTOMATED mode)
 * MEDIUM risk → create approval request
 * HIGH risk   → manual approval required, block auto-execution
 */
import { prisma } from "../db/client.js";
import type { Recommendation } from "./recommendation-engine.js";
import type { ExecutionMode } from "@prisma/client";

const RISK_MATRIX: Record<string, "LOW" | "MEDIUM" | "HIGH"> = {
  ADD_NEGATIVE_KEYWORD: "LOW",
  FLAG_ISSUE:           "LOW",
  RAISE_BUDGET:         "MEDIUM",
  LOWER_BUDGET:         "MEDIUM",
  INCREASE_BID:         "MEDIUM",
  DECREASE_BID:         "MEDIUM",
  PAUSE_KEYWORD:        "MEDIUM",
  SUGGEST_CREATIVE:     "LOW",
  PAUSE_CAMPAIGN:       "HIGH",
  PROMOTE_PRODUCT:      "HIGH",
};

export function getRiskLevel(type: string): "LOW" | "MEDIUM" | "HIGH" {
  return RISK_MATRIX[type] ?? "MEDIUM";
}

export async function routeRecommendation(
  rec: Recommendation,
  execMode: ExecutionMode
): Promise<"queued" | "approval_required" | "blocked"> {
  const risk = getRiskLevel(rec.type);

  // Create the DB record first
  const created = await prisma.aiRecommendation.create({
    data: {
      type:           rec.type,
      title:          rec.title,
      reason:         rec.reason,
      confidence:     rec.confidence,
      severity:       rec.severity,
      expectedImpact: rec.expectedImpact ?? null,
      payload:        rec.payload as any,
      campaignId:     rec.campaignId ?? null,
      status:         "PENDING",
    },
  });

  // Determine routing based on exec mode + risk
  if (execMode === "DRY_RUN" || execMode === "SUGGEST") {
    // Never execute — just surface the recommendation
    return "blocked";
  }

  if (execMode === "AUTOMATED" && risk === "LOW") {
    // Auto-execute immediately
    return "queued";
  }

  if (execMode === "AUTOMATED" && risk === "MEDIUM") {
    // Still require approval for medium risk even in automated mode
    await createApprovalRequest(created.id, rec, risk);
    return "approval_required";
  }

  // APPROVAL_REQUIRED or HIGH risk
  await createApprovalRequest(created.id, rec, risk);
  return risk === "HIGH" ? "blocked" : "approval_required";
}

async function createApprovalRequest(
  recommendationId: string,
  rec: Recommendation,
  risk: "LOW" | "MEDIUM" | "HIGH"
) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + (risk === "HIGH" ? 48 : 24));

  await prisma.approvalRequest.create({
    data: {
      riskLevel:       risk,
      title:           rec.title,
      description:     rec.reason,
      payload:         rec.payload as any,
      status:          "PENDING",
      expiresAt,
      recommendationId,
    },
  });
}
