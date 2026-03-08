import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data", "user-profiles");

function safeEmail(email: string) {
  return email.replace(/[^a-zA-Z0-9@._-]/g, "_").toLowerCase();
}

async function getFilePath(email: string) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  return path.join(DATA_DIR, `${safeEmail(email)}.json`);
}

export async function GET(req: NextRequest) {
  const email = req.headers.get("x-user-email");
  if (!email) return NextResponse.json(null, { status: 200 });
  try {
    const fp = await getFilePath(email);
    const raw = await fs.readFile(fp, "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json(null);
  }
}

export async function PUT(req: NextRequest) {
  const email = req.headers.get("x-user-email");
  if (!email) return NextResponse.json({ error: "x-user-email header required" }, { status: 400 });
  try {
    const body = await req.json();
    const fp = await getFilePath(email);
    await fs.writeFile(fp, JSON.stringify(body, null, 2), "utf-8");
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const email = req.headers.get("x-user-email");
  if (!email) return NextResponse.json({ ok: true });
  try {
    const fp = await getFilePath(email);
    await fs.unlink(fp).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
