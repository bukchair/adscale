// ============================================================
// Audit Log Engine
// Immutable audit trail for all system actions
// ============================================================

import { db } from "../../db/client.js";
import { logger } from "../../utils/logger.js";

export interface AuditEvent {
  userId?: string;
  orgId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export class AuditEngine {
  async log(event: AuditEvent): Promise<void> {
    try {
      await db.auditLog.create({
        data: {
          userId: event.userId,
          orgId: event.orgId,
          action: event.action,
          entityType: event.entityType,
          entityId: event.entityId,
          before: event.before,
          after: event.after,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          metadata: event.metadata,
        },
      });
    } catch (err) {
      // Audit failures should never break the main flow
      logger.error({ err, event }, "Failed to write audit log");
    }
  }

  async logBatch(events: AuditEvent[]): Promise<void> {
    try {
      await db.auditLog.createMany({
        data: events.map((e) => ({
          userId: e.userId,
          orgId: e.orgId,
          action: e.action,
          entityType: e.entityType,
          entityId: e.entityId,
          before: e.before,
          after: e.after,
          ipAddress: e.ipAddress,
          userAgent: e.userAgent,
          metadata: e.metadata,
        })),
      });
    } catch (err) {
      logger.error({ err }, "Failed to write audit log batch");
    }
  }

  async query(filters: {
    orgId?: string;
    userId?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: Record<string, unknown> = {};

    if (filters.orgId) where.orgId = filters.orgId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.action) where.action = { contains: filters.action };
    if (filters.from || filters.to) {
      where.createdAt = {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      };
    }

    const [total, logs] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.findMany({
        where,
        include: { user: { select: { id: true, email: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
    ]);

    return { total, logs };
  }
}

// Singleton
export const auditEngine = new AuditEngine();
