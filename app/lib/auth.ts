export type Role = "admin" | "manager" | "editor" | "viewer";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: Role;
  company?: string;
  createdAt: string;
  googleId?: string;
}

export interface BusinessProfile {
  storeName: string;
  websiteUrl: string;
  ownerName: string;
  phone: string;
  businessType: string;
  industry: string;
  country: string;
  currency: string;
}

export interface Connection {
  connected: boolean;
  connectedAt?: string;
  fields: Record<string, string>;
}

const KEY_USER         = "bscale_user";
const KEY_ONBOARDING   = "bscale_onboarding_done";
const KEY_CONNECTIONS  = "bscale_connections";
const KEY_BUSINESS     = "bscale_business";
const KEY_FIRST_DONE   = "bscale_first_user_done";
const KEY_ALL_USERS    = "bscale_all_users";

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
  // Also update in all-users list
  const all = getAllUsers();
  const idx = all.findIndex(u => u.id === user.id);
  if (idx >= 0) all[idx] = user; else all.push(user);
  localStorage.setItem(KEY_ALL_USERS, JSON.stringify(all));
}
export function clearUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY_USER);
  localStorage.removeItem(KEY_ONBOARDING);
  localStorage.removeItem(KEY_CONNECTIONS);
}

/* ── First-user-admin logic ─────────────────────────────────────── */
export function isFirstUser(): boolean {
  if (typeof window === "undefined") return false;
  return !localStorage.getItem(KEY_FIRST_DONE);
}
export function markFirstUserDone(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_FIRST_DONE, "1");
}

/* ── All users (for admin management) ──────────────────────────── */
export function getAllUsers(): AuthUser[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY_ALL_USERS) ?? "[]"); } catch { return []; }
}
export function updateUserRole(userId: string, role: Role): void {
  if (typeof window === "undefined") return;
  const all = getAllUsers();
  const idx = all.findIndex(u => u.id === userId);
  if (idx >= 0) { all[idx].role = role; localStorage.setItem(KEY_ALL_USERS, JSON.stringify(all)); }
}
export function removeUserById(userId: string): void {
  if (typeof window === "undefined") return;
  const all = getAllUsers().filter(u => u.id !== userId);
  localStorage.setItem(KEY_ALL_USERS, JSON.stringify(all));
}

/* ── Business profile ───────────────────────────────────────────── */
export function getBusinessProfile(): BusinessProfile | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(KEY_BUSINESS) ?? "null"); } catch { return null; }
}
export function setBusinessProfile(profile: BusinessProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_BUSINESS, JSON.stringify(profile));
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
function notifyConnectionsChanged() {
  window.dispatchEvent(new CustomEvent("bscale:connections-changed"));
}

/** Persist current localStorage connections to the server (keyed by user email). */
async function syncToServer(all: Record<string, Connection>) {
  try {
    const user = getUser();
    if (!user?.email) return;
    await fetch("/api/user/connections", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-user-email": user.email },
      body: JSON.stringify(all),
    });
  } catch { /* silent — local still works */ }
}

/** Load connections from server and merge into localStorage (server wins on conflict).
 *  If local has connections that server doesn't know about, push them up too. */
export async function loadConnectionsFromServer(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const user = getUser();
    if (!user?.email) return;

    const res = await fetch("/api/user/connections", {
      headers: { "x-user-email": user.email },
    });
    if (!res.ok) return;

    const serverConns: Record<string, Connection> = await res.json();
    const local = getConnections();
    const serverHasData = serverConns && Object.keys(serverConns).length > 0;
    const localHasData  = Object.keys(local).length > 0;

    if (!serverHasData && !localHasData) return;

    if (!serverHasData && localHasData) {
      // Server file doesn't exist yet — push local connections up so mobile can see them
      await syncToServer(local);
      return; // localStorage already has the data; no need to write again
    }

    // Merge: server wins on conflicts (it's the cross-device source of truth)
    const merged = { ...local, ...serverConns };
    localStorage.setItem(KEY_CONNECTIONS, JSON.stringify(merged));

    // If local had keys the server didn't, push the merged set back up
    const mergedKeys = Object.keys(merged);
    const serverKeys = Object.keys(serverConns);
    if (mergedKeys.some(k => !serverKeys.includes(k))) {
      await syncToServer(merged);
    }

    notifyConnectionsChanged();
  } catch { /* silent */ }
}

export function saveConnection(id: string, fields: Record<string, string>): void {
  if (typeof window === "undefined") return;
  const all = getConnections();
  all[id] = { connected: true, connectedAt: new Date().toISOString(), fields };
  localStorage.setItem(KEY_CONNECTIONS, JSON.stringify(all));
  notifyConnectionsChanged();
  void syncToServer(all);
}
export function removeConnection(id: string): void {
  if (typeof window === "undefined") return;
  const all = getConnections();
  delete all[id];
  localStorage.setItem(KEY_CONNECTIONS, JSON.stringify(all));
  notifyConnectionsChanged();
  void syncToServer(all);
}
export function clearConnections(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY_CONNECTIONS);
  notifyConnectionsChanged();
  void syncToServer({});
}

export function canAccess(user: AuthUser | null, moduleId: string): boolean {
  if (!user) return false;
  const perms = MODULE_PERMISSIONS[user.role];
  return perms.includes("*") || perms.includes(moduleId);
}

/* ── Create user from Google OAuth data ─────────────────────────── */
export function createOrLoginGoogleUser(googleId: string, name: string, email: string, avatar?: string): AuthUser {
  const all = getAllUsers();
  // Check if user already exists
  const existing = all.find(u => u.googleId === googleId || u.email === email);
  if (existing) {
    setUser(existing);
    return existing;
  }
  // Determine role: first user = admin
  const role: Role = isFirstUser() ? "admin" : "viewer";
  if (isFirstUser()) markFirstUserDone();

  const newUser: AuthUser = {
    id: "g_" + googleId,
    name,
    email,
    avatar: avatar ?? "👤",
    role,
    googleId,
    createdAt: new Date().toISOString(),
  };
  setUser(newUser);
  return newUser;
}

/* ── Mock Auth (fallback when Google not configured) ────────────── */
export async function signInWithGoogle(): Promise<AuthUser> {
  await new Promise(r => setTimeout(r, 1200));
  const googleId = "mock_" + Math.random().toString(36).slice(2);
  return createOrLoginGoogleUser(googleId, "ישראל ישראלי", "israel@mystore.co.il", "🧑‍💼");
}
export async function signInWithEmail(email: string, _password: string): Promise<AuthUser> {
  await new Promise(r => setTimeout(r, 900));
  if (!email.includes("@")) throw new Error("invalid_email");
  const all = getAllUsers();
  const existing = all.find(u => u.email === email);
  if (existing) { setUser(existing); return existing; }
  const role: Role = isFirstUser() ? "admin" : "viewer";
  if (isFirstUser()) markFirstUserDone();
  const user: AuthUser = { id: "email_" + Date.now(), name: email.split("@")[0], email, avatar: "👤", role, createdAt: new Date().toISOString() };
  setUser(user);
  return user;
}
export async function signUpWithEmail(name: string, email: string, _password: string): Promise<AuthUser> {
  await new Promise(r => setTimeout(r, 1000));
  if (!email.includes("@")) throw new Error("invalid_email");
  const role: Role = isFirstUser() ? "admin" : "viewer";
  if (isFirstUser()) markFirstUserDone();
  const user: AuthUser = { id: "new_" + Date.now(), name, email, avatar: "👤", role, createdAt: new Date().toISOString() };
  setUser(user);
  return user;
}
