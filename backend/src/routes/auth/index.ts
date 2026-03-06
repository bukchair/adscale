// ============================================================
// Auth Routes — Register, Login, Logout
// ============================================================

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../../db/client.js";
import { auditEngine } from "../../engines/audit/index.js";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + process.env.JWT_SECRET).digest("hex");
}

function generateToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/register
  app.post("/register", async (req, reply) => {
    const schema = z.object({
      email: z.string().email(),
      name: z.string().min(1),
      password: z.string().min(8),
      orgName: z.string().min(1),
    });

    const body = schema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.issues });

    const { email, name, password, orgName } = body.data;

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return reply.status(409).send({ error: "Email already registered" });

    const user = await db.user.create({
      data: {
        email,
        name,
        passwordHash: hashPassword(password),
        role: "OWNER",
      },
    });

    const org = await db.organization.create({
      data: {
        name: orgName,
        slug: orgName.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Date.now(),
        members: {
          create: { userId: user.id, role: "ADMIN" },
        },
      },
    });

    const token = generateToken();
    await db.userSession.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 30 * 86400000), // 30 days
      },
    });

    await auditEngine.log({ userId: user.id, orgId: org.id, action: "USER_REGISTERED" });

    return { token, user: { id: user.id, email: user.email, name: user.name }, orgId: org.id };
  });

  // POST /auth/login
  app.post("/login", async (req, reply) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string(),
    });

    const body = schema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: "Invalid input" });

    const { email, password } = body.data;

    const user = await db.user.findUnique({ where: { email } });
    if (!user || user.passwordHash !== hashPassword(password)) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const token = generateToken();
    await db.userSession.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + 30 * 86400000) },
    });

    const memberships = await db.organizationMember.findMany({
      where: { userId: user.id },
      include: { organization: { select: { id: true, name: true, slug: true } } },
    });

    await auditEngine.log({
      userId: user.id,
      action: "USER_LOGIN",
      ipAddress: req.ip,
    });

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name },
      organizations: memberships.map((m) => ({ ...m.organization, role: m.role })),
    };
  });

  // POST /auth/logout
  app.post("/logout", async (req, reply) => {
    const token = req.headers.authorization?.slice(7);
    if (token) await db.userSession.deleteMany({ where: { token } });
    return { success: true };
  });
}
