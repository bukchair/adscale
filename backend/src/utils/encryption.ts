/**
 * AES-256-GCM encryption for sensitive fields (access/refresh tokens).
 * Format:  iv_hex:authTag_hex:ciphertext_hex
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    // Safe dev fallback — never acceptable in production
    return Buffer.alloc(32, "bscale-dev-key-000000000000000");
  }
  return scryptSync(raw, "bscale-v1-salt", 32);
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv  = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid ciphertext format");
  const [ivHex, tagHex, encHex] = parts;
  const key     = getKey();
  const iv      = Buffer.from(ivHex, "hex");
  const tag     = Buffer.from(tagHex, "hex");
  const enc     = Buffer.from(encHex, "hex");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

/** Returns plaintext if value looks like a legacy plaintext token (not encrypted). */
export function safeDecrypt(value: string | null): string {
  if (!value) return "";
  if (!value.includes(":")) return value; // legacy / plaintext
  try {
    return decrypt(value);
  } catch {
    return value; // graceful fallback
  }
}
