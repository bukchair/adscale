import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/client.js";
import { logger } from "../utils/logger.js";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  orgId?: string;
  orgRole?: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return reply.status(401).send({ error: "Missing authorization header" });
    }

    const token = header.slice(7);
    const session = await db.userSession.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return reply.status(401).send({ error: "Invalid or expired token" });
    }

    // Extract org from query or body
    const orgId = (req.query as any)?.orgId || (req.body as any)?.orgId;
    let orgRole: string | undefined;

    if (orgId) {
      const member = await db.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: orgId, userId: session.userId } },
      });
      if (!member) {
        return reply.status(403).send({ error: "Not a member of this organization" });
      }
      orgRole = member.role;
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      orgId,
      orgRole,
    };
  } catch (err) {
    logger.error({ err }, "Auth middleware error");
    return reply.status(500).send({ error: "Internal server error" });
  }
}

export function requireOrgRole(...roles: string[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user?.orgRole || !roles.includes(req.user.orgRole)) {
      return reply.status(403).send({ error: "Insufficient permissions" });
    }
  };
}
