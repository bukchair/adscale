import fs from "fs";
import path from "path";

export interface Settings {
  woocommerce?: { url: string };
  googleAds?: { clientId: string; clientSecret: string; refreshToken: string; customerId: string; developerToken: string; managerId: string };
  meta?: { accessToken: string; adAccountId: string };
  tiktok?: { advertiserId: string; accessToken: string };
  ga4?: { propertyId: string; clientEmail: string; privateKey: string };
  gmc?: { merchantId: string };
  gsc?: { siteUrl: string };
}

const FILE = path.join(process.cwd(), "data", "settings.json");

export function readSettings(): Settings {
  try {
    if (fs.existsSync(FILE)) return JSON.parse(fs.readFileSync(FILE, "utf-8"));
  } catch {}
  return {};
}

export function writeSettings(settings: Settings): void {
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(settings, null, 2));
}

// Resolve credential: provided value (non-masked) > file > env var
export function resolve(provided: string | undefined, fileVal: string | undefined, envKey: string): string {
  const MASK = "••••••••";
  if (provided && provided !== MASK) return provided;
  if (fileVal) return fileVal;
  return process.env[envKey] || "";
}
