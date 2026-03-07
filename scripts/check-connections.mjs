#!/usr/bin/env node
/**
 * AdScale AI — Connection Diagnostic Script
 * Run: node scripts/check-connections.mjs
 * Reads from .env.local automatically
 */

import { readFileSync, existsSync } from "fs";
import { createSign } from "crypto";

// ── Load .env.local ──────────────────────────────────────────────────────────
const envPath = new URL("../.env.local", import.meta.url).pathname;
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key && val && !process.env[key]) process.env[key] = val;
  }
  console.log("📂  Loaded .env.local\n");
} else {
  console.log("⚠️   No .env.local found — using environment variables\n");
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const GREEN = "\x1b[32m✅";
const YELLOW = "\x1b[33m⚠️ ";
const RED = "\x1b[31m❌";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

function icon(status) {
  if (status === "connected") return GREEN;
  if (status === "partial") return YELLOW;
  return RED;
}

function print(name, status, message, detail) {
  const pad = name.padEnd(26);
  const msg = detail ? `${message} — ${detail}` : message;
  console.log(`  ${icon(status)} ${BOLD}${pad}${RESET} ${msg}${RESET}`);
}

async function timeout(promise, ms = 8000) {
  const t = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));
  return Promise.race([promise, t]);
}

async function fetchJSON(url, opts = {}) {
  const res = await timeout(fetch(url, opts));
  return { ok: res.ok, status: res.status, body: await res.json().catch(() => ({})) };
}

// ── Checks ───────────────────────────────────────────────────────────────────

async function checkWooCommerce() {
  const url = process.env.WOOCOMMERCE_URL;
  if (!url) return { status: "disconnected", message: "WOOCOMMERCE_URL לא מוגדר" };
  try {
    const res = await timeout(fetch(`${url}/wp-json/adscale/v1/summary`));
    if (res.ok) return { status: "connected", message: "מחובר", detail: url };
    return { status: "partial", message: `HTTP ${res.status} — בדוק שהפלאגין מותקן`, detail: url };
  } catch (e) {
    return { status: "partial", message: `שגיאת רשת: ${e.message}`, detail: url };
  }
}

async function getGoogleToken() {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error(d.error_description || d.error || "token_failed");
  return d.access_token;
}

async function checkGoogleAds() {
  const missing = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_ADS_REFRESH_TOKEN", "GOOGLE_ADS_CUSTOMER_ID", "GOOGLE_ADS_DEVELOPER_TOKEN"]
    .filter(k => !process.env[k]);
  if (missing.length === 5) return { status: "disconnected", message: "לא מוגדר" };
  if (missing.length > 0) return { status: "partial", message: "הגדרה חלקית", detail: `חסר: ${missing.join(", ")}` };
  try {
    const token = await getGoogleToken();
    const cid = process.env.GOOGLE_ADS_CUSTOMER_ID;
    const r = await timeout(fetch(`https://googleads.googleapis.com/v19/customers/${cid}/googleAds:search`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN, "login-customer-id": "2913379431", "Content-Type": "application/json" },
      body: JSON.stringify({ query: "SELECT customer.id FROM customer LIMIT 1" }),
    }));
    if (r.ok) return { status: "connected", message: "מחובר", detail: `Customer: ${cid}` };
    const err = await r.json().catch(() => ({}));
    return { status: "partial", message: `HTTP ${r.status}`, detail: (err?.error?.message || "").slice(0, 100) };
  } catch (e) {
    return { status: "partial", message: e.message.slice(0, 100) };
  }
}

async function checkMeta() {
  const token = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID;
  if (!token && !accountId) return { status: "disconnected", message: "לא מוגדר" };
  if (!token || !accountId) return { status: "partial", message: "הגדרה חלקית", detail: `חסר: ${!token ? "META_ACCESS_TOKEN" : "META_AD_ACCOUNT_ID"}` };
  try {
    const { ok, body } = await fetchJSON(`https://graph.facebook.com/v19.0/act_${accountId}?fields=id,name,account_status&access_token=${token}`);
    if (body.error) return { status: "partial", message: "שגיאת אימות", detail: body.error.message?.slice(0, 100) };
    const statusMap = { 1: "פעיל", 2: "מושבת", 3: "לא מאומת", 7: "מבוטל" };
    return { status: "connected", message: "מחובר", detail: `${body.name || accountId} · ${statusMap[body.account_status] || ""}` };
  } catch (e) {
    return { status: "partial", message: e.message.slice(0, 100) };
  }
}

async function checkMeta_Pixel() {
  const pixelId = process.env.META_PIXEL_ID;
  const token = process.env.META_ACCESS_TOKEN;
  if (!pixelId) return { status: "disconnected", message: "META_PIXEL_ID לא מוגדר" };
  if (!token) return { status: "partial", message: "META_ACCESS_TOKEN חסר" };
  try {
    const { body } = await fetchJSON(`https://graph.facebook.com/v19.0/${pixelId}?fields=id,name&access_token=${token}`);
    if (body.error) return { status: "partial", message: "שגיאה", detail: body.error.message?.slice(0, 100) };
    return { status: "connected", message: "מחובר", detail: body.name || pixelId };
  } catch (e) {
    return { status: "partial", message: e.message.slice(0, 100) };
  }
}

async function checkGA4() {
  const email = process.env.GA4_CLIENT_EMAIL;
  const key = process.env.GA4_PRIVATE_KEY;
  const prop = process.env.GA4_PROPERTY_ID;
  const missing = [!email && "GA4_CLIENT_EMAIL", !key && "GA4_PRIVATE_KEY", !prop && "GA4_PROPERTY_ID"].filter(Boolean);
  if (missing.length === 3) return { status: "disconnected", message: "לא מוגדר" };
  if (missing.length > 0) return { status: "partial", message: "הגדרה חלקית", detail: `חסר: ${missing.join(", ")}` };
  try {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ iss: email, scope: "https://www.googleapis.com/auth/analytics.readonly", aud: "https://oauth2.googleapis.com/token", exp: now + 3600, iat: now })).toString("base64url");
    const sign = createSign("RSA-SHA256");
    sign.update(`${header}.${payload}`);
    const sig = sign.sign(key.replace(/\\n/g, "\n"), "base64url");
    const jwt = `${header}.${payload}.${sig}`;
    const tr = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }) });
    const td = await tr.json();
    if (!td.access_token) return { status: "partial", message: "שגיאת JWT", detail: td.error_description || td.error };
    const gr = await timeout(fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${prop}:getMetadata`, { headers: { Authorization: `Bearer ${td.access_token}` } }));
    if (gr.ok) return { status: "connected", message: "מחובר", detail: `Property: ${prop}` };
    return { status: "partial", message: `HTTP ${gr.status} — בדוק הרשאות` };
  } catch (e) {
    return { status: "partial", message: e.message.slice(0, 100) };
  }
}

async function checkSearchConsole() {
  const siteUrl = process.env.GSC_SITE_URL;
  if (!siteUrl) return { status: "disconnected", message: "GSC_SITE_URL לא מוגדר" };
  const hasGA4 = process.env.GA4_CLIENT_EMAIL && process.env.GA4_PRIVATE_KEY;
  if (!hasGA4) return { status: "partial", message: "Service account חסר", detail: "דורש GA4_CLIENT_EMAIL + GA4_PRIVATE_KEY" };
  return { status: "connected", message: "מוגדר", detail: siteUrl };
}

async function checkMerchant() {
  const merchantId = process.env.GMC_MERCHANT_ID;
  if (!merchantId) return { status: "disconnected", message: "GMC_MERCHANT_ID לא מוגדר" };
  const hasOAuth = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_ADS_REFRESH_TOKEN;
  if (!hasOAuth) return { status: "partial", message: "Google OAuth חסר", detail: `Merchant: ${merchantId}` };
  try {
    const token = await getGoogleToken();
    const r = await timeout(fetch(`https://shoppingcontent.googleapis.com/content/v2.1/${merchantId}/accounts/${merchantId}`, { headers: { Authorization: `Bearer ${token}` } }));
    if (r.ok) { const d = await r.json(); return { status: "connected", message: "מחובר", detail: d.name || `Merchant: ${merchantId}` }; }
    return { status: "partial", message: `HTTP ${r.status}`, detail: `Merchant: ${merchantId}` };
  } catch (e) {
    return { status: "partial", message: e.message.slice(0, 100) };
  }
}

async function checkTikTok() {
  const advertiserId = process.env.TIKTOK_ADVERTISER_ID;
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
  if (!advertiserId && !accessToken) return { status: "disconnected", message: "לא מוגדר" };
  if (!advertiserId || !accessToken) return { status: "partial", message: "הגדרה חלקית", detail: `חסר: ${!advertiserId ? "TIKTOK_ADVERTISER_ID" : "TIKTOK_ACCESS_TOKEN"}` };
  try {
    const { body } = await fetchJSON(
      `https://business-api.tiktok.com/open_api/v1.3/advertiser/info/?advertiser_ids=["${advertiserId}"]`,
      { headers: { "Access-Token": accessToken } }
    );
    if (body.code === 0 && body.data?.list?.length > 0) {
      return { status: "connected", message: "מחובר", detail: body.data.list[0]?.advertiser_name || advertiserId };
    }
    return { status: "partial", message: body.message || "שגיאת אימות", detail: advertiserId };
  } catch (e) {
    return { status: "partial", message: e.message.slice(0, 100) };
  }
}

// ── Run all checks ────────────────────────────────────────────────────────────
const checks = [
  ["WooCommerce",          checkWooCommerce],
  ["Google Ads",           checkGoogleAds],
  ["Meta Ads",             checkMeta],
  ["Meta Pixel",           checkMeta_Pixel],
  ["Google Analytics 4",   checkGA4],
  ["Search Console",       checkSearchConsole],
  ["Merchant Center",      checkMerchant],
  ["TikTok Ads",           checkTikTok],
];

console.log(`${BOLD}AdScale AI — בדיקת חיבורים${RESET}`);
console.log("─".repeat(60));

const results = await Promise.all(
  checks.map(async ([name, fn]) => {
    try {
      const r = await fn();
      return { name, ...r };
    } catch (e) {
      return { name, status: "disconnected", message: String(e).slice(0, 100) };
    }
  })
);

for (const r of results) {
  print(r.name, r.status, r.message, r.detail);
}

const connected = results.filter(r => r.status === "connected").length;
const partial = results.filter(r => r.status === "partial").length;
const disconnected = results.filter(r => r.status === "disconnected").length;

console.log("─".repeat(60));
console.log(`\n${BOLD}תוצאה:${RESET} ${GREEN} ${connected} מחוברים${RESET}  ${YELLOW} ${partial} חלקיים${RESET}  ${RED} ${disconnected} לא מחוברים${RESET}\n`);

if (disconnected > 0 || partial > 0) {
  const broken = results.filter(r => r.status !== "connected");
  console.log(`${BOLD}נדרשת פעולה:${RESET}`);
  for (const r of broken) {
    console.log(`  • ${r.name}: ${r.message}${r.detail ? ` (${r.detail})` : ""}`);
  }
  console.log();
}
