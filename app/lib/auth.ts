import {
  isPlatformOwnerRegistered, setPlatformOwnerId,
  createTenant, getTenantByOwnerId,
  tenantConnectionsKey, tenantUsersKey,
  getActiveTenantId,
} from "./tenant";

/* ═══════════════════════════════════════════════════════════════════
   auth.ts — Authentication & Authorization
   platformRole: "super_admin" (first user) | "tenant_owner" | "tenant_member"
   role:         within-tenant RBAC role
═══════════════════════════════════════════════════════════════════ */

/** Within-tenant RBAC roles */
export type Role         = "admin" | "manager" | "editor" | "viewer";
/** Platform-level roles: System Owner > Agency Manager > Client User > Member */
export type PlatformRole = "super_admin" | "tenant_owner" | "agency_manager" | "client_user" | "tenant_member";

export interface AuthUser {
  id:            string;
  name:          string;
  email:         string;
  avatar?:       string;
  role:          Role;           // within-tenant role
  platformRole:  PlatformRole;   // platform-level role
  tenantId?:     string;         // undefined for super_admin
  company?:      string;
  createdAt:     string;
  googleId?:     string;
}

export interface BusinessProfile {
  storeName:    string;
  websiteUrl:   string;
  ownerName:    string;
  phone:        string;
  businessType: string;
  industry:     string;
  country:      string;
  currency:     string;
}

export interface Connection {
  connected:    boolean;
  connectedAt?: string;
  fields:       Record<string, string>;
}

const KEY_USER       = "bscale_user";
const KEY_ONBOARDING = "bscale_onboarding_done";  // legacy — prefer tenant-scoped
const KEY_BUSINESS   = "bscale_business";          // legacy — prefer tenant-scoped
const KEY_FIRST_DONE = "bscale_first_user_done";   // kept for backwards-compat check
const KEY_ALL_USERS  = "bscale_all_users";          // legacy global list

/** System creator — always gets super_admin regardless of registration order */
export const CREATOR_EMAIL = "asher205@gmail.com";

export const ROLES: Record<Role, { he: string; en: string; color: string; bg: string; desc: string; descEn: string }> = {
  admin:   { he: "מנהל",        en: "Admin",   color: "#6366f1", bg: "#eef2ff", desc: "גישה מלאה לכל המודולים, ניהול משתמשים והגדרות", descEn: "Full access to all modules, user management and settings" },
  manager: { he: "מנהל ביניים", en: "Manager", color: "#10b981", bg: "#d1fae5", desc: "גישה לכל המודולים מלבד ניהול משתמשים",              descEn: "Access to all modules except user management" },
  editor:  { he: "עורך",        en: "Editor",  color: "#f59e0b", bg: "#fef3c7", desc: "יצירה ועריכה של קמפיינים, creative ו-SEO",          descEn: "Create and edit campaigns, creative and SEO" },
  viewer:  { he: "צופה",        en: "Viewer",  color: "#94a3b8", bg: "#f1f5f9", desc: "קריאה בלבד — ללא יכולת שינוי",                     descEn: "Read-only — no editing capabilities" },
};

/** Platform roles (displayed in Users module) */
export const PLATFORM_ROLES: Record<string, { en: string; he: string; desc: string; descEn: string; color: string; bg: string; icon: string }> = {
  super_admin:    { en: "System Owner",    he: "בעל המערכת",   desc: "גישה מלאה. ניהול מנויים, סוכנויות וכל ההרשאות", descEn: "Full access. Subscription management, agency management, all permissions", color: "#6366f1", bg: "#eef2ff", icon: "👑" },
  agency_manager: { en: "Agency Manager",  he: "מנהל סוכנות",  desc: "ניהול דשבורדים עבור לקוחות שלו",                  descEn: "Manage dashboards for their clients",              color: "#8b5cf6", bg: "#f5f3ff", icon: "🏢" },
  client_user:    { en: "Client User",     he: "לקוח / בעל אתר", desc: "צפייה באנליטיקס, אישור המלצות, ניהול משתמשים מוגבל", descEn: "View analytics, approve AI recommendations, manage limited users", color: "#10b981", bg: "#d1fae5", icon: "👤" },
  tenant_owner:   { en: "Account Owner",   he: "בעל חשבון",    desc: "גישה מלאה לחשבון שלהם",                           descEn: "Full access to their own account",                color: "#3b82f6", bg: "#dbeafe", icon: "🏠" },
  tenant_member:  { en: "Team Member",     he: "חבר צוות",     desc: "גישה לפי הרשאות שהוגדרו",                         descEn: "Access based on assigned permissions",             color: "#94a3b8", bg: "#f1f5f9", icon: "👥" },
};

/** New navigation tabs (financial-reports, negative-keywords, automation removed) */
export const MODULE_PERMISSIONS: Record<Role, string[]> = {
  admin:   ["*"],
  manager: ["overview","profitability","budget","recommendations","search-terms","seo","products","audiences","creative-lab","approvals","audit-log","integrations"],
  editor:  ["overview","recommendations","search-terms","seo","products","audiences","creative-lab","approvals"],
  viewer:  ["overview","profitability","budget","search-terms","seo","products","audiences","audit-log"],
};

/* ── Current user ───────────────────────────────────────────────── */
export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const u: AuthUser | null = JSON.parse(localStorage.getItem(KEY_USER) ?? "null");
    if (!u) return null;
    const clean = sanitizeName(u.name, u.email);
    if (clean !== u.name) {
      const fixed = { ...u, name: clean };
      localStorage.setItem(KEY_USER, JSON.stringify(fixed));
      return fixed;
    }
    return u;
  } catch { return null; }
}
export function setUser(user: AuthUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_USER, JSON.stringify(user));
  // Update in tenant-scoped users list
  if (user.tenantId) {
    const all = getAllUsers(user.tenantId);
    const idx = all.findIndex(u => u.id === user.id);
    if (idx >= 0) all[idx] = user; else all.push(user);
    localStorage.setItem(tenantUsersKey(user.tenantId), JSON.stringify(all));
  }
  // Also update legacy global list
  const legacy = _getLegacyAllUsers();
  const li = legacy.findIndex(u => u.id === user.id);
  if (li >= 0) legacy[li] = user; else legacy.push(user);
  localStorage.setItem(KEY_ALL_USERS, JSON.stringify(legacy));
  // Sync profile to server so other devices can load it
  void _syncProfileToServer(user);
}
export function clearUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY_USER);
  localStorage.removeItem(KEY_ONBOARDING);
}

/** Wipe all local-storage bscale_ keys + server-side data files */
export async function clearAllData(): Promise<void> {
  if (typeof window === "undefined") return;
  await fetch("/api/admin/clear-all-data", { method: "DELETE" }).catch(() => {});
  const keys = Object.keys(localStorage).filter(k => k.startsWith("bscale_"));
  keys.forEach(k => localStorage.removeItem(k));
}

async function _syncProfileToServer(user: AuthUser): Promise<void> {
  try {
    if (!user.email) return;
    await fetch("/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-user-email": user.email },
      body: JSON.stringify(user),
    });
  } catch { /* silent */ }
}

export async function loadProfileFromServer(): Promise<AuthUser | null> {
  if (typeof window === "undefined") return null;
  try {
    const user = getUser();
    if (!user?.email) return null;
    const res = await fetch("/api/user/profile", { headers: { "x-user-email": user.email } });
    if (!res.ok) return null;
    const profile: AuthUser | null = await res.json();
    if (!profile) return null;
    // Server name/avatar take priority (won't be the email-derived fallback)
    const merged = { ...user, name: sanitizeName(profile.name, user.email), avatar: profile.avatar ?? user.avatar };
    localStorage.setItem(KEY_USER, JSON.stringify(merged));
    return merged;
  } catch { return null; }
}

/* ── Platform-role helpers ──────────────────────────────────────── */
export function isSuperAdmin(user: AuthUser | null): boolean {
  return user?.platformRole === "super_admin";
}
export function isTenantOwner(user: AuthUser | null): boolean {
  return user?.platformRole === "tenant_owner";
}

/* ── Backwards-compat first-user flag ──────────────────────────── */
export function isFirstUser(): boolean {
  if (typeof window === "undefined") return false;
  return !isPlatformOwnerRegistered() && !localStorage.getItem(KEY_FIRST_DONE);
}
export function markFirstUserDone(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_FIRST_DONE, "1");
}

/* ── Per-tenant all-users list ─────────────────────────────────── */
export function getAllUsers(tenantId?: string): AuthUser[] {
  if (typeof window === "undefined") return [];
  try {
    const key = tenantId ? tenantUsersKey(tenantId) : KEY_ALL_USERS;
    return JSON.parse(localStorage.getItem(key) ?? "[]");
  } catch { return []; }
}
function _getLegacyAllUsers(): AuthUser[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY_ALL_USERS) ?? "[]"); } catch { return []; }
}
export function updateUserRole(userId: string, role: Role, tenantId?: string): void {
  if (typeof window === "undefined") return;
  const key = tenantId ? tenantUsersKey(tenantId) : KEY_ALL_USERS;
  const all = getAllUsers(tenantId);
  const idx = all.findIndex(u => u.id === userId);
  if (idx >= 0) { all[idx].role = role; localStorage.setItem(key, JSON.stringify(all)); }
}
export function removeUserById(userId: string, tenantId?: string): void {
  if (typeof window === "undefined") return;
  const key = tenantId ? tenantUsersKey(tenantId) : KEY_ALL_USERS;
  localStorage.setItem(key, JSON.stringify(getAllUsers(tenantId).filter(u => u.id !== userId)));
}

/* ── Business profile ───────────────────────────────────────────── */
export function getBusinessProfile(tenantId?: string): BusinessProfile | null {
  if (typeof window === "undefined") return null;
  const key = tenantId ? `bscale_business_${tenantId}` : KEY_BUSINESS;
  try { return JSON.parse(localStorage.getItem(key) ?? "null"); } catch { return null; }
}
export function setBusinessProfile(profile: BusinessProfile, tenantId?: string): void {
  if (typeof window === "undefined") return;
  const key = tenantId ? `bscale_business_${tenantId}` : KEY_BUSINESS;
  localStorage.setItem(key, JSON.stringify(profile));
}

/* ── Onboarding ─────────────────────────────────────────────────── */
export function isOnboardingComplete(tenantId?: string): boolean {
  if (typeof window === "undefined") return false;
  const key = tenantId ? `bscale_onboarding_${tenantId}` : KEY_ONBOARDING;
  return localStorage.getItem(key) === "1";
}
export function completeOnboarding(tenantId?: string): void {
  if (typeof window === "undefined") return;
  const key = tenantId ? `bscale_onboarding_${tenantId}` : KEY_ONBOARDING;
  localStorage.setItem(key, "1");
  // Also set legacy key
  localStorage.setItem(KEY_ONBOARDING, "1");
}

/* ── Plan selection ─────────────────────────────────────────────── */
const KEY_PLAN = "bscale_selected_plan";
export function saveSelectedPlan(planId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_PLAN, planId);
}
export function getSelectedPlan(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY_PLAN);
}

/* ── Connections — TENANT SCOPED ───────────────────────────────── */
function _connKey(user?: AuthUser | null): string {
  const u = user ?? getUser();
  const activeTid = getActiveTenantId(u?.tenantId);
  return activeTid ? tenantConnectionsKey(activeTid) : "bscale_connections";
}

export function getConnections(user?: AuthUser | null): Record<string, Connection> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(_connKey(user)) ?? "{}"); } catch { return {}; }
}

function notifyConnectionsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("bscale:connections-changed"));
  }
}

async function syncToServer(all: Record<string, Connection>, user?: AuthUser | null) {
  try {
    const u = user ?? getUser();
    if (!u?.email) return;
    await fetch("/api/user/connections", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-user-email": u.email },
      body: JSON.stringify(all),
    });
  } catch { /* silent */ }
}

export async function loadConnectionsFromServer(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const user = getUser();
    if (!user?.email) return;

    // Load profile + connections in parallel
    const [connRes, profileRes] = await Promise.all([
      fetch("/api/user/connections", { headers: { "x-user-email": user.email } }),
      fetch("/api/user/profile",     { headers: { "x-user-email": user.email } }),
    ]);

    // Restore profile name/avatar if current session has email-derived name
    if (profileRes.ok) {
      const profile: AuthUser | null = await profileRes.json();
      const serverName = profile?.name ? sanitizeName(profile.name, user.email) : null;
      const localName  = sanitizeName(user.name, user.email);
      if (serverName && serverName !== user.name) {
        const fixed = { ...user, name: serverName, avatar: profile!.avatar ?? user.avatar };
        localStorage.setItem(KEY_USER, JSON.stringify(fixed));
        // Update lists silently (don't call setUser to avoid re-sync loop)
        if (fixed.tenantId) {
          const all = getAllUsers(fixed.tenantId);
          const idx = all.findIndex(u => u.id === fixed.id);
          if (idx >= 0) { all[idx] = fixed; localStorage.setItem(tenantUsersKey(fixed.tenantId!), JSON.stringify(all)); }
        }
      }
      // If server has a real profile (user has been here before), restore onboarding status
      if (profile?.id && profile?.email) {
        completeOnboarding(user.tenantId);
      }
    }

    if (!connRes.ok) return;
    const serverConns: Record<string, Connection> = await connRes.json();
    const local = getConnections(user);
    const serverHasData = Object.keys(serverConns).length > 0;
    const localHasData  = Object.keys(local).length > 0;
    if (!serverHasData && !localHasData) return;
    if (!serverHasData && localHasData) { await syncToServer(local, user); return; }
    const merged = { ...local, ...serverConns };
    localStorage.setItem(_connKey(user), JSON.stringify(merged));
    const mergedKeys = Object.keys(merged);
    const serverKeys = Object.keys(serverConns);
    if (mergedKeys.some(k => !serverKeys.includes(k))) await syncToServer(merged, user);
    notifyConnectionsChanged();
  } catch { /* silent */ }
}

export function saveConnection(id: string, fields: Record<string, string>): void {
  if (typeof window === "undefined") return;
  const user = getUser();
  const all = getConnections(user);
  all[id] = { connected: true, connectedAt: new Date().toISOString(), fields };
  localStorage.setItem(_connKey(user), JSON.stringify(all));
  notifyConnectionsChanged();
  void syncToServer(all, user);
}
export function removeConnection(id: string): void {
  if (typeof window === "undefined") return;
  const user = getUser();
  const all = getConnections(user);
  delete all[id];
  localStorage.setItem(_connKey(user), JSON.stringify(all));
  notifyConnectionsChanged();
  void syncToServer(all, user);
}
export function clearConnections(): void {
  if (typeof window === "undefined") return;
  const user = getUser();
  localStorage.removeItem(_connKey(user));
  notifyConnectionsChanged();
  void syncToServer({}, user);
}

export function canAccess(user: AuthUser | null, moduleId: string): boolean {
  if (!user) return false;
  if (user.platformRole === "super_admin") return true;
  const perms = MODULE_PERMISSIONS[user.role];
  return perms.includes("*") || perms.includes(moduleId);
}

/* ── Name sanitization ──────────────────────────────────────────── */
function sanitizeName(name: string | null | undefined, email: string): string {
  if (!name || name.startsWith("http://") || name.startsWith("https://") || name.startsWith("//") || /^[\w.-]+\.[a-z]{2,}\//.test(name)) {
    // Fallback: first part of email, capitalize first letter
    const base = email.split("@")[0].replace(/[._]/g, " ");
    return base.charAt(0).toUpperCase() + base.slice(1);
  }
  return name;
}

/* ── Core registration logic ────────────────────────────────────── */
function registerUser(id: string, rawName: string, email: string, avatar?: string, googleId?: string): AuthUser {
  const name = sanitizeName(rawName, email);
  const allLegacy = _getLegacyAllUsers();
  const existing = allLegacy.find(u => (googleId && u.googleId === googleId) || u.email === email);
  if (existing) {
    // Fix bad name in existing record too
    const fixed = { ...existing, name: sanitizeName(existing.name, existing.email) };
    setUser(fixed);
    return fixed;
  }

  let user: AuthUser;

  // Creator email always gets super_admin, regardless of registration order
  const isCreator = email === CREATOR_EMAIL;

  if (isCreator || !isPlatformOwnerRegistered()) {
    // ── Creator / first user: becomes super_admin ─────────────────
    user = {
      id, name, email,
      avatar: avatar ?? "👑",
      role:         "admin",
      platformRole: "super_admin",
      tenantId:     undefined,  // super_admin has no tenant
      createdAt:    new Date().toISOString(),
      ...(googleId ? { googleId } : {}),
    };
    if (!isPlatformOwnerRegistered() || isCreator) {
      setPlatformOwnerId(id);
      markFirstUserDone();
    }
    if (!isCreator) {
      // Seed demo tenants so the admin panel looks populated
      import("./tenant").then(m => m.seedDemoTenants());
    }
  } else {
    // ── Subsequent user: becomes tenant_owner ────────────────────
    const tenant = createTenant(id, name, email);
    user = {
      id, name, email,
      avatar:       avatar ?? "👤",
      role:         "admin",      // full access within their own tenant
      platformRole: "tenant_owner",
      tenantId:     tenant.id,
      createdAt:    new Date().toISOString(),
      ...(googleId ? { googleId } : {}),
    };
  }

  setUser(user);

  // Send welcome email to new users (non-creator)
  if (!isCreator && typeof window !== "undefined") {
    const lang = localStorage.getItem("bscale_lang") || "en";
    void fetch("/api/email/welcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, lang, systemUrl: window.location.origin }),
    }).catch(() => {});
  }

  return user;
}

/* ── Auth methods ───────────────────────────────────────────────── */
export function createOrLoginGoogleUser(googleId: string, rawName: string, email: string, avatar?: string): AuthUser {
  return registerUser("g_" + googleId, sanitizeName(rawName, email), email, avatar, googleId);
}

export async function signInWithGoogle(): Promise<AuthUser> {
  await new Promise(r => setTimeout(r, 1200));
  const googleId = "mock_" + Math.random().toString(36).slice(2);
  return createOrLoginGoogleUser(googleId, "ישראל ישראלי", "israel@mystore.co.il", "🧑‍💼");
}

export async function signInWithEmail(email: string, _password: string): Promise<AuthUser> {
  await new Promise(r => setTimeout(r, 900));
  if (!email.includes("@")) throw new Error("invalid_email");
  // 1. Check local cache
  const all = _getLegacyAllUsers();
  const existing = all.find(u => u.email === email);
  if (existing) { setUser(existing); return existing; }
  // 2. Try server profile (so name is correct on new devices)
  try {
    const res = await fetch("/api/user/profile", { headers: { "x-user-email": email } });
    if (res.ok) {
      const profile: AuthUser | null = await res.json();
      if (profile?.name) { const p = { ...profile, name: sanitizeName(profile.name, email) }; setUser(p); return p; }
    }
  } catch { /* offline, fall through */ }
  // 3. Truly new user — register with email prefix as temporary name
  return registerUser("email_" + Date.now(), email.split("@")[0], email);
}

export async function signUpWithEmail(name: string, email: string, _password: string): Promise<AuthUser> {
  await new Promise(r => setTimeout(r, 1000));
  if (!email.includes("@")) throw new Error("invalid_email");
  return registerUser("new_" + Date.now(), name, email);
}

/* ── Shared Gemini key (creator-level, auto-fallback for all users) ── */

const KEY_CREATOR_GEMINI = "bscale_creator_gemini";

/** Save creator's Gemini key to server and local cache */
export async function saveCreatorGeminiKey(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_CREATOR_GEMINI, apiKey);
  try {
    await fetch("/api/creator/gemini", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey }),
    });
  } catch { /* silent */ }
}

/** Load creator's shared Gemini key (all users). Returns null if not set. */
export async function loadCreatorGeminiKey(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const cached = localStorage.getItem(KEY_CREATOR_GEMINI);
  if (cached) return cached;
  try {
    const res = await fetch("/api/creator/gemini");
    if (!res.ok) return null;
    const { api_key } = await res.json();
    if (api_key) { localStorage.setItem(KEY_CREATOR_GEMINI, api_key); return api_key; }
  } catch { /* offline */ }
  return null;
}

/**
 * Returns effective Gemini connection: user's own key takes priority,
 * falls back to creator's shared key (if available).
 */
export async function getEffectiveGeminiConnection(): Promise<Connection | null> {
  const conns = getConnections();
  if (conns.gemini?.connected && conns.gemini.fields?.api_key) return conns.gemini;
  const creatorKey = await loadCreatorGeminiKey();
  if (!creatorKey) return null;
  return { connected: true, fields: { api_key: creatorKey } };
}

/** Invite a team member into an existing tenant (called from UsersModule) */
export function inviteTenantMember(
  tenantId: string,
  name: string,
  email: string,
  role: Role
): AuthUser {
  const existing = getAllUsers(tenantId).find(u => u.email === email);
  if (existing) return existing;
  const user: AuthUser = {
    id:           "member_" + Date.now(),
    name, email,
    avatar:       "👤",
    role,
    platformRole: "tenant_member",
    tenantId,
    createdAt:    new Date().toISOString(),
  };
  // Add to tenant's user list (don't set as current user)
  const all = getAllUsers(tenantId);
  all.push(user);
  localStorage.setItem(tenantUsersKey(tenantId), JSON.stringify(all));
  return user;
}
