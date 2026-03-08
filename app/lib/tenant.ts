/* ═══════════════════════════════════════════════════════════════════
   tenant.ts — Multi-tenant platform management
   - First user who registers = super_admin (platform owner)
   - Every subsequent registration creates a new Tenant workspace
   - Each tenant's data is isolated by tenantId key prefix
═══════════════════════════════════════════════════════════════════ */

export type TenantPlan   = "trial" | "starter" | "growth" | "scale";
export type TenantStatus = "active" | "trial" | "suspended" | "cancelled";

export interface Tenant {
  id:           string;
  name:         string;   // company / business name
  ownerName:    string;
  ownerEmail:   string;
  ownerId:      string;   // AuthUser.id of the tenant_owner
  plan:         TenantPlan;
  status:       TenantStatus;
  createdAt:    string;
  trialEndsAt:  string;
  userCount:    number;
  monthlySpend?: number;  // aggregated ad spend for dashboard
}

/* ── Storage keys ─────────────────────────────────────────────────── */
const KEY_TENANTS          = "bscale_tenants";
const KEY_PLATFORM_OWNER   = "bscale_platform_owner_id";
const KEY_VIEWING_AS       = "bscale_viewing_as_tenant";  // sessionStorage

/* ── Platform owner (super_admin) ────────────────────────────────── */
export function getPlatformOwnerId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY_PLATFORM_OWNER);
}
export function setPlatformOwnerId(userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_PLATFORM_OWNER, userId);
}
export function isPlatformOwnerRegistered(): boolean {
  return !!getPlatformOwnerId();
}
export function isCurrentUserPlatformOwner(userId: string): boolean {
  return getPlatformOwnerId() === userId;
}

/* ── Tenants CRUD ─────────────────────────────────────────────────── */
export function getTenants(): Tenant[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY_TENANTS) ?? "[]"); } catch { return []; }
}

export function saveTenant(tenant: Tenant): void {
  if (typeof window === "undefined") return;
  const all = getTenants();
  const idx = all.findIndex(t => t.id === tenant.id);
  if (idx >= 0) all[idx] = tenant; else all.push(tenant);
  localStorage.setItem(KEY_TENANTS, JSON.stringify(all));
}

export function getTenantById(id: string): Tenant | undefined {
  return getTenants().find(t => t.id === id);
}

export function getTenantByOwnerId(ownerId: string): Tenant | undefined {
  return getTenants().find(t => t.ownerId === ownerId);
}

export function updateTenantStatus(id: string, status: TenantStatus): void {
  const t = getTenantById(id);
  if (t) saveTenant({ ...t, status });
}

export function updateTenantPlan(id: string, plan: TenantPlan): void {
  const t = getTenantById(id);
  if (t) saveTenant({ ...t, plan });
}

export function deleteTenant(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_TENANTS, JSON.stringify(getTenants().filter(t => t.id !== id)));
  // Clear all tenant-scoped data
  localStorage.removeItem(`bscale_connections_${id}`);
  localStorage.removeItem(`bscale_all_users_${id}`);
  localStorage.removeItem(`bscale_onboarding_${id}`);
  localStorage.removeItem(`bscale_business_${id}`);
}

/** Create a new tenant for a freshly registered user */
export function createTenant(ownerId: string, ownerName: string, ownerEmail: string): Tenant {
  const id = "t_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);
  const tenant: Tenant = {
    id,
    name:        ownerName + "'s Business",
    ownerName,
    ownerEmail,
    ownerId,
    plan:        "trial",
    status:      "trial",
    createdAt:   new Date().toISOString(),
    trialEndsAt: trialEnd.toISOString(),
    userCount:   1,
    monthlySpend: 0,
  };
  saveTenant(tenant);
  return tenant;
}

/* ── Per-tenant data scoping ──────────────────────────────────────── */

/** Returns the active tenantId (respects viewing-as for super_admin) */
export function getActiveTenantId(userTenantId: string | undefined): string | null {
  const viewingAs = getViewingAsTenantId();
  return viewingAs ?? userTenantId ?? null;
}

export function tenantConnectionsKey(tenantId: string): string {
  return `bscale_connections_${tenantId}`;
}
export function tenantUsersKey(tenantId: string): string {
  return `bscale_all_users_${tenantId}`;
}
export function tenantOnboardingKey(tenantId: string): string {
  return `bscale_onboarding_${tenantId}`;
}
export function tenantBusinessKey(tenantId: string): string {
  return `bscale_business_${tenantId}`;
}

/* ── Super admin impersonation (view-as) ─────────────────────────── */
export function getViewingAsTenantId(): string | null {
  if (typeof window === "undefined") return null;
  try { return sessionStorage.getItem(KEY_VIEWING_AS); } catch { return null; }
}
export function setViewingAsTenant(tenantId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY_VIEWING_AS, tenantId);
}
export function clearViewingAs(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY_VIEWING_AS);
}

/* ── Seed demo tenants for development ───────────────────────────── */
export function seedDemoTenants(): void {
  if (getTenants().length > 0) return; // already seeded
  const demos: Omit<Tenant, "id">[] = [
    { name: "נעלי יעל בע\"מ",   ownerName: "יעל כהן",    ownerEmail: "yael@shoes.co.il",    ownerId: "demo_1", plan: "growth",  status: "active",    createdAt: new Date(Date.now()-86400000*30).toISOString(), trialEndsAt: "", userCount: 4, monthlySpend: 18400 },
    { name: "אופנה ישראל",       ownerName: "רון לוי",    ownerEmail: "ron@fashion.co.il",   ownerId: "demo_2", plan: "starter", status: "active",    createdAt: new Date(Date.now()-86400000*14).toISOString(), trialEndsAt: "", userCount: 2, monthlySpend: 6200 },
    { name: "טכנו גדג'טים",     ownerName: "אבי גולד",   ownerEmail: "avi@tech-gadgets.com",ownerId: "demo_3", plan: "scale",   status: "active",    createdAt: new Date(Date.now()-86400000*60).toISOString(), trialEndsAt: "", userCount: 8, monthlySpend: 54000 },
    { name: "ספא הים",           ownerName: "מיכל אדם",   ownerEmail: "michal@spa-sea.co.il",ownerId: "demo_4", plan: "trial",   status: "trial",     createdAt: new Date(Date.now()-86400000*5).toISOString(),  trialEndsAt: new Date(Date.now()+86400000*9).toISOString(),  userCount: 1, monthlySpend: 0 },
    { name: "ירקות ממשק",        ownerName: "דני פרץ",    ownerEmail: "dani@fresh-veg.com",  ownerId: "demo_5", plan: "starter", status: "suspended", createdAt: new Date(Date.now()-86400000*45).toISOString(), trialEndsAt: "", userCount: 1, monthlySpend: 0 },
    { name: "Digital Boost Ltd", ownerName: "Sarah Chen",  ownerEmail: "sarah@dboost.io",     ownerId: "demo_6", plan: "growth",  status: "active",    createdAt: new Date(Date.now()-86400000*20).toISOString(), trialEndsAt: "", userCount: 3, monthlySpend: 22100 },
  ];
  demos.forEach(d => {
    const id = "t_demo_" + d.ownerId;
    saveTenant({ ...d, id });
  });
}
