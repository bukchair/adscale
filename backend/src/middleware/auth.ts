import type { FastifyRequest, FastifyReply, FastifyInstance } from "fastify";
import { prisma } from "../db/client.js";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
    orgId:  string;
    orgRole: string;
  }
}

export async function authMiddleware(req: FastifyRequest, reply: FastifyReply) {
  try {
    // JWT verification is handled by @fastify/jwt — this validates and attaches payload
    await req.jwtVerify();
    const payload = req.user as { sub: string; orgId: string; orgRole: string };

    req.userId  = payload.sub;
    req.orgId   = payload.orgId;
    req.orgRole = payload.orgRole;

    // Verify membership still exists
    const member = await prisma.orgMember.findUnique({
      where: { userId_orgId: { userId: req.userId, orgId: req.orgId } },
    });
    if (!member) {
      return reply.code(403).send({ error: "Not a member of this organization" });
    }
  } catch (err) {
    return reply.code(401).send({ error: "Unauthorized" });
  }
}

export function requireRole(...roles: string[]) {
  return async function (req: FastifyRequest, reply: FastifyReply) {
    if (!roles.includes(req.orgRole)) {
      return reply.code(403).send({ error: "Insufficient permissions" });
    }
  };
}

export function registerAuth(app: FastifyInstance) {
  app.register(require("@fastify/jwt"), {
    secret: process.env.JWT_SECRET!,
    sign: { expiresIn: "7d" },
  });
}
