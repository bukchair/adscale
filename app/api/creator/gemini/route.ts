import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const FILE = path.join(process.cwd(), ".data", "creator-gemini.json");
const CREATOR_EMAIL = "asher205@gmail.com";

async function ensureDir() {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
}

export async function GET() {
  try {
    await ensureDir();
    const raw = await fs.readFile(FILE, "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ api_key: null });
  }
}

export async function PUT(req: NextRequest) {
  const email = req.headers.get("x-user-email");
  if (email && email !== CREATOR_EMAIL) {
    return NextResponse.json({ error: "Only the system creator can set the shared Gemini key" }, { status: 403 });
  }
  try {
    const body = await req.json();
    await ensureDir();
    await fs.writeFile(FILE, JSON.stringify({ api_key: body.api_key }, null, 2), "utf-8");
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
