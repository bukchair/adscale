import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// /tmp is writable on Vercel serverless; .data is fallback for local dev
const TMP_PATH = join("/tmp", "adscale_connections.json");
const LOCAL_PATH = join(process.cwd(), ".data", "connections.json");

// Global in-memory store — survives across requests on the same warm instance
// (most reliable cross-device sync we can do without an external database)
let memStore: Record<string, Record<string, string>> | null = null;

function readConnections(): Record<string, Record<string, string>> {
  if (memStore !== null) return memStore;
  // Try /tmp first (Vercel), then local .data dir
  for (const path of [TMP_PATH, LOCAL_PATH]) {
    try {
      const parsed = JSON.parse(readFileSync(path, "utf8")) as Record<string, Record<string, string>>;
      if (parsed && typeof parsed === "object") {
        memStore = parsed;
        return memStore as Record<string, Record<string, string>>;
      }
    } catch { /* try next */ }
  }
  memStore = {};
  return memStore;
}

function writeConnections(data: Record<string, Record<string, string>>) {
  memStore = data;
  // Try writing to both locations; ignore errors
  for (const [path, dir] of [[TMP_PATH, "/tmp"], [LOCAL_PATH, join(process.cwd(), ".data")]]) {
    try {
      mkdirSync(dir as string, { recursive: true });
      writeFileSync(path as string, JSON.stringify(data, null, 2), "utf8");
    } catch { /* ignore — at least memStore is updated */ }
  }
}

export async function GET() {
  return NextResponse.json(readConnections());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    writeConnections(body);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
