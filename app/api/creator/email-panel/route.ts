import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const CREATOR_EMAIL = "asher205@gmail.com";
const USERS_LOG = path.join(process.cwd(), ".data", "registered-users.json");

async function getRegisteredUsers(): Promise<{ email: string; name: string; lang: string; createdAt: string }[]> {
  try {
    const raw = await fs.readFile(USERS_LOG, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** GET — list all registered users (creator only) */
export async function GET(req: NextRequest) {
  const email = req.headers.get("x-user-email");
  if (email !== CREATOR_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const users = await getRegisteredUsers();
  return NextResponse.json({ users });
}

/** POST — send a broadcast message to all users (creator only) */
export async function POST(req: NextRequest) {
  const email = req.headers.get("x-user-email");
  if (email !== CREATOR_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { subject, message, targetLang } = await req.json();
  if (!subject || !message) {
    return NextResponse.json({ error: "subject and message are required" }, { status: 400 });
  }

  const users = await getRegisteredUsers();
  const targets = targetLang ? users.filter(u => u.lang === targetLang) : users;

  // In production this would send via Gmail API / SMTP
  // For now we log the broadcast to a file
  const broadcastLog = path.join(process.cwd(), ".data", "broadcasts.json");
  let log: any[] = [];
  try { log = JSON.parse(await fs.readFile(broadcastLog, "utf-8")); } catch {}
  log.push({
    id: Date.now(),
    subject,
    message,
    targetLang: targetLang || "all",
    recipients: targets.map(u => u.email),
    sentAt: new Date().toISOString(),
  });
  await fs.mkdir(path.dirname(broadcastLog), { recursive: true });
  await fs.writeFile(broadcastLog, JSON.stringify(log, null, 2), "utf-8");

  return NextResponse.json({ ok: true, sent: targets.length });
}
