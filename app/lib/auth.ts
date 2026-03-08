export type Role = "admin" | "manager" | "editor" | "viewer";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: Role;
  company?: string;
  createdAt: string;
}

export interface Connection {
  connected: boolean;
  connectedAt?: string;
  fields: Record<string, string>;
}

const KEY_USER        = "adscale_user";
const KEY_ONBOARDING  = "adscale_onboarding_done";
const KEY_CONNECTIONS = "adscale_connections";

export const ROLES: Record<Role, { he: string; en: string; color: string; bg: string; desc: string; descEn: string }> = {
  admin:   { he: "מנהל מערכת", en: "Admin",   color: "#6366f1", bg: "#eef2ff", desc: "גישה מלאה לכל המודולים, ניהול משתמשים והגדרות", descEn: "Full access to all modules, user management and settings" },
  manager: { he: "מנהל",       en: "Manager", color: "#10b981", bg: "#d1fae5", desc: "גישה לכל המודולים מלבד ניהול משתמשים",              descEn: "Access to all modules except user management" },
  editor:  { he: "עורך",       en: "Editor",  color: "#f59e0b", bg: "#fef3c7", desc: "יצירה ועריכה של קמפיינים, creative ו-SEO",          descEn: "Create and edit campaigns, creative and SEO" },
  viewer:  { he: "צופה",       en: "Viewer",  color: "#94a3b8", bg: "#f1f5f9", desc: "קריאה בלבד — ללא יכולת שינוי",                     descEn: "Read-only — no editing capabilities" },
};

export const MODULE_PERMISSIONS: Record<Role, string[]> = {
  admin:   ["*"],
  manager: ["overview","profitability","budget","recommendations","search-terms","negative-keywords","seo","products","audiences","creative-lab","approvals","automation","audit-log","integrations"],
  editor:  ["overview","recommendations","search-terms","negative-keywords","seo","products","audiences","creative-lab","approvals"],
  viewer:  ["overview","profitability","budget","search-terms","seo","products","audiences","audit-log"],
};

/* ── User ───────────────────────────────────────────────────────── */
export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(KEY_USER) ?? "null"); } catch { return null; }
}
export function setUser(user: AuthUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_USER, JSON.stringify(user));
}
export function clearUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY_USER);
  localStorage.removeItem(KEY_ONBOARDING);
  localStorage.removeItem(KEY_CONNECTIONS);
}

/* ── Onboarding ─────────────────────────────────────────────────── */
export function isOnboardingComplete(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY_ONBOARDING) === "1";
}
export function completeOnboarding(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_ONBOARDING, "1");
}

/* ── Connections ────────────────────────────────────────────────── */
export function getConnections(): Record<string, Connection> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY_CONNECTIONS) ?? "{}"); } catch { return {}; }
}
export function saveConnection(id: string, fields: Record<string, string>): void {
  if (typeof window === "undefined") return;
  const all = getConnections();
  all[id] = { connected: true, connectedAt: new Date().toISOString(), fields };
  localStorage.setItem(KEY_CONNECTIONS, JSON.stringify(all));
}
export function removeConnection(id: string): void {
  if (typeof window === "undefined") return;
  const all = getConnections();
  delete all[id];
  localStorage.setItem(KEY_CONNECTIONS, JSON.stringify(all));
}
export function clearConnections(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY_CONNECTIONS);
}

export function canAccess(user: AuthUser | null, moduleId: string): boolean {
  if (!user) return false;
  const perms = MODULE_PERMISSIONS[user.role];
  return perms.includes("*") || perms.includes(moduleId);
}

/* ── Mock Auth ──────────────────────────────────────────────────── */
export async function signInWithGoogle(): Promise<AuthUser> {
  await new Promise(r => setTimeout(r, 1200));
  return {
    id: "google_" + Math.random().toString(36).slice(2),
    name: "ישראל ישראלי",
    email: "israel@mystore.co.il",
    avatar: "🧑‍💼",
    role: "admin",
    company: "MyStore",
    createdAt: new Date().toISOString(),
  };
}
export async function signInWithEmail(email: string, _password: string): Promise<AuthUser> {
  await new Promise(r => setTimeout(r, 900));
  if (!email.includes("@")) throw new Error("invalid_email");
  return {
    id: "email_" + Math.random().toString(36).slice(2),
    name: email.split("@")[0],
    email,
    avatar: "👤",
    role: "admin",
    createdAt: new Date().toISOString(),
  };
}
export async function signUpWithEmail(name: string, email: string, _password: string): Promise<AuthUser> {
  await new Promise(r => setTimeout(r, 1000));
  if (!email.includes("@")) throw new Error("invalid_email");
  return {
    id: "new_" + Math.random().toString(36).slice(2),
    name,
    email,
    avatar: "👤",
    role: "admin",
    createdAt: new Date().toISOString(),
  };
}
