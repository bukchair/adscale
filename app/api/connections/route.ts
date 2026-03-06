import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// Store connections in a JSON file in the .data directory (outside of public/src)
const DATA_DIR = join(process.cwd(), ".data");
const FILE_PATH = join(DATA_DIR, "connections.json");

function readConnections(): Record<string, Record<string, string>> {
  try {
    return JSON.parse(readFileSync(FILE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function writeConnections(data: Record<string, Record<string, string>>) {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write connections:", err);
  }
}

export async function GET() {
  const connections = readConnections();
  return NextResponse.json(connections);
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
