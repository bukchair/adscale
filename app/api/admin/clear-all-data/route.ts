import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_ROOT = path.join(process.cwd(), ".data");

async function deleteDir(dir: string) {
  try {
    const entries = await fs.readdir(dir);
    await Promise.all(
      entries.map(e => fs.unlink(path.join(dir, e)).catch(() => {}))
    );
  } catch { /* dir doesn't exist */ }
}

export async function DELETE() {
  await deleteDir(path.join(DATA_ROOT, "user-connections"));
  await deleteDir(path.join(DATA_ROOT, "user-profiles"));
  return NextResponse.json({ ok: true });
}
