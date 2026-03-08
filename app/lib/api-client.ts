// ============================================================
// BScale Backend API Client
// ============================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

class ApiClient {
  private token: string | null = null;
  private orgId: string | null = null;

  setAuth(token: string, orgId: string) {
    this.token = token;
    this.orgId = orgId;
    if (typeof window !== "undefined") {
      localStorage.setItem("bscale_token", token);
      localStorage.setItem("bscale_org", orgId);
    }
  }

  loadAuth() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("bscale_token");
      this.orgId = localStorage.getItem("bscale_org");
    }
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.token) h["Authorization"] = `Bearer ${this.token}`;
    return h;
  }

  private addOrgId(params: Record<string, string> = {}): Record<string, string> {
    if (this.orgId) params["orgId"] = this.orgId;
    return params;
  }

  async get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const qs = new URLSearchParams(this.addOrgId(params));
    const res = await fetch(`${API_BASE}${path}?${qs}`, { headers: this.headers() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async post<T>(path: string, body: unknown = {}): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ ...((body as any) || {}), orgId: this.orgId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
}

export const api = new ApiClient();
