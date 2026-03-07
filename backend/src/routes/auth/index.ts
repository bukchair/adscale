import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../db/client.js";
import { logger } from "../../logger/index.js";
import crypto from "crypto";

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
});

export default async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/login
  app.post("/login", async (req, reply) => {
    const body = LoginSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const user = await prisma.user.findUnique({ where: { email: body.data.email } });
    if (!user?.passwordHash) return reply.code(401).send({ error: "Invalid credentials" });

    const hash = crypto.createHash("sha256").update(body.data.password).digest("hex");
    if (hash !== user.passwordHash) return reply.code(401).send({ error: "Invalid credentials" });

    const memberships = await prisma.orgMember.findMany({
      where:   { userId: user.id },
      include: { org: true },
      take: 1,
    });

    if (!memberships.length) return reply.code(403).send({ error: "No organization found" });
    const { org, role } = memberships[0];

    const token = app.jwt.sign({
      sub:     user.id,
      orgId:   org.id,
      orgRole: role,
    });

    return { token, user: { id: user.id, email: user.email, name: user.name }, org };
  });

  // POST /api/auth/register (dev only)
  app.post("/register", async (req, reply) => {
    if (process.env.NODE_ENV === "production") {
      return reply.code(404).send({ error: "Not found" });
    }

    const body = LoginSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const hash = crypto.createHash("sha256").update(body.data.password).digest("hex");
    const user = await prisma.user.create({
      data: { email: body.data.email, passwordHash: hash },
    });

    const org = await prisma.organization.create({
      data: {
        name: `${body.data.email}'s Org`,
        slug: body.data.email.split("@")[0] + "-" + Date.now(),
      },
    });

    await prisma.orgMember.create({
      data: { userId: user.id, orgId: org.id, role: "OWNER" },
    });

    return { ok: true };
  });

  // GET /api/auth/me
  app.get("/me", { preHandler: [app.authenticate] }, async (req) => {
    const userId = (req.user as any).sub;
    const user   = await prisma.user.findUniqueOrThrow({
      where:   { id: userId },
      include: { memberships: { include: { org: true } } },
    });
    return user;
  });
}
