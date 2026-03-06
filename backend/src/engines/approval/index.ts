// ============================================================
// Approval Workflow Engine
// Routes actions through approval workflow based on risk
// ============================================================

import { db } from "../../db/client.js";
import { auditEngine } from "../audit/index.js";
import { logger } from "../../utils/logger.js";
import type { Severity } from "../optimization/index.js";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "AUTO_APPROVED";

export interface ApprovalRule {
  riskLevel: Severity;
  mode: "auto" | "require_approval" | "manual_only";
  autoApproveAfterHours?: number;
}

// Default approval rules
const DEFAULT_RULES: ApprovalRule[] = [
  { riskLevel: "low", mode: "auto" },
  { riskLevel: "medium", mode: "require_approval", autoApproveAfterHours: 24 },
  { riskLevel: "high", mode: "require_approval" },
  { riskLevel: "critical", mode: "manual_only" },
];

export class ApprovalEngine {
  private rules: ApprovalRule[];

  constructor(rules: ApprovalRule[] = DEFAULT_RULES) {
    this.rules = rules;
  }

  getRule(severity: Severity): ApprovalRule {
    return this.rules.find((r) => r.riskLevel === severity) || DEFAULT_RULES[1];
  }

  async createApprovalRequest(params: {
    optimizationActionId: string;
    severity: Severity;
    requestedBy?: string;
    orgId?: string;
  }): Promise<{ status: ApprovalStatus; requestId?: string }> {
    const rule = this.getRule(params.severity);

    // Auto-approve low risk
    if (rule.mode === "auto") {
      await db.optimizationAction.update({
        where: { id: params.optimizationActionId },
        data: { status: "APPROVED" },
      });

      await auditEngine.log({
        orgId: params.orgId,
        action: "APPROVAL_AUTO_APPROVED",
        entityType: "OptimizationAction",
        entityId: params.optimizationActionId,
        metadata: { severity: params.severity, rule: "auto" },
      });

      return { status: "AUTO_APPROVED" };
    }

    // Create approval request
    const autoApproveAt = rule.autoApproveAfterHours
      ? new Date(Date.now() + rule.autoApproveAfterHours * 3600 * 1000)
      : undefined;

    const request = await db.approvalRequest.create({
      data: {
        optimizationActionId: params.optimizationActionId,
        requestedBy: params.requestedBy,
        riskLevel: params.severity.toUpperCase() as any,
        autoApproveAt,
        status: "PENDING",
      },
    });

    await auditEngine.log({
      orgId: params.orgId,
      action: "APPROVAL_REQUESTED",
      entityType: "ApprovalRequest",
      entityId: request.id,
      metadata: { severity: params.severity, autoApproveAt },
    });

    return { status: "PENDING", requestId: request.id };
  }

  async review(params: {
    requestId: string;
    reviewerId: string;
    decision: "approve" | "reject";
    notes?: string;
    orgId?: string;
  }): Promise<void> {
    const request = await db.approvalRequest.findUnique({
      where: { id: params.requestId },
      include: { action: true },
    });

    if (!request) throw new Error("Approval request not found");
    if (request.status !== "PENDING") throw new Error("Request is no longer pending");

    const newStatus = params.decision === "approve" ? "APPROVED" : "REJECTED";
    const actionStatus = params.decision === "approve" ? "APPROVED" : "REJECTED";

    await db.$transaction([
      db.approvalRequest.update({
        where: { id: params.requestId },
        data: {
          status: newStatus,
          reviewerId: params.reviewerId,
          reviewedAt: new Date(),
          notes: params.notes,
        },
      }),
      ...(request.optimizationActionId
        ? [db.optimizationAction.update({
            where: { id: request.optimizationActionId },
            data: { status: actionStatus },
          })]
        : []),
    ]);

    await auditEngine.log({
      userId: params.reviewerId,
      orgId: params.orgId,
      action: `APPROVAL_${newStatus}`,
      entityType: "ApprovalRequest",
      entityId: params.requestId,
      metadata: { decision: params.decision, notes: params.notes },
    });
  }

  // Process expired auto-approvals
  async processExpiredAutoApprovals(): Promise<number> {
    const expired = await db.approvalRequest.findMany({
      where: {
        status: "PENDING",
        autoApproveAt: { lte: new Date() },
      },
      include: { action: true },
    });

    let processed = 0;
    for (const req of expired) {
      try {
        await db.$transaction([
          db.approvalRequest.update({
            where: { id: req.id },
            data: { status: "AUTO_APPROVED", reviewedAt: new Date() },
          }),
          ...(req.optimizationActionId
            ? [db.optimizationAction.update({
                where: { id: req.optimizationActionId },
                data: { status: "APPROVED" },
              })]
            : []),
        ]);

        await auditEngine.log({
          action: "APPROVAL_AUTO_APPROVED_BY_TIMEOUT",
          entityType: "ApprovalRequest",
          entityId: req.id,
        });
        processed++;
      } catch (err) {
        logger.error({ err, reqId: req.id }, "Failed to auto-approve expired request");
      }
    }

    return processed;
  }
}
