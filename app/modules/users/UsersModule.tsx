"use client";
import { useState } from "react";
import { C } from "../theme";
import { ROLES, MODULE_PERMISSIONS, getAllUsers, updateUserRole, removeUserById, setUser, getConnections, type Role, type AuthUser } from "../../lib/auth";

function displayName(user: AuthUser): string {
  if (!user.name || user.name.startsWith("http://") || user.name.startsWith("https://")) {
    const base = user.email.split("@")[0].replace(/[._]/g, " ");
    return base.charAt(0).toUpperCase() + base.slice(1);
  }
  return user.name;
}

const ALL_MODULES = [
  { id: "overview",          he: "סקירה כללית",       en: "Overview" },
  { id: "financial-reports", he: "דוחות כספיים",       en: "Financial Reports" },
  { id: "profitability",     he: "רווחיות",            en: "Profitability" },
  { id: "budget",            he: "תקציב",              en: "Budget" },
  { id: "recommendations",   he: "המלצות",             en: "Recommendations" },
  { id: "search-terms",      he: "מילות חיפוש",        en: "Search Terms" },
  { id: "negative-keywords", he: "מילים שליליות",      en: "Negative Keywords" },
  { id: "seo",               he: "SEO & GEO",          en: "SEO & GEO" },
  { id: "products",          he: "מוצרים",             en: "Products" },
  { id: "audiences",         he: "קהלים",              en: "Audiences" },
  { id: "creative-lab",      he: "Creative Lab",        en: "Creative Lab" },
  { id: "approvals",         he: "אישורים",             en: "Approvals" },
  { id: "automation",        he: "אוטומציה",            en: "Automation" },
  { id: "audit-log",         he: "לוג פעילות",          en: "Audit Log" },
  { id: "integrations",      he: "חיבורים",             en: "Integrations" },
  { id: "users",             he: "משתמשים",             en: "Users" },
];


interface UsersModuleProps { lang: string; }

export default function UsersModule({ lang }: UsersModuleProps) {
  const isHe = lang === "he";
  const t = (he: string, en: string) => isHe ? he : en;
  const [users, setUsers] = useState<AuthUser[]>(() => getAllUsers());
  const [activeTab, setActiveTab] = useState<"users" | "roles">("users");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("editor");
  const [editUser, setEditUser] = useState<AuthUser | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [inviteSent, setInviteSent] = useState<string | null>(null);
  const gmailConn = getConnections()["gmail"];
  const gmailConnected = gmailConn?.connected && gmailConn?.fields?.oauth === "connected";

  function handleInvite() {
    if (!inviteName || !inviteEmail) return;
    const newUser: AuthUser = {
      id: "u_" + Date.now(),
      name: inviteName,
      email: inviteEmail,
      avatar: "👤",
      role: inviteRole,
      platformRole: "tenant_member",
      createdAt: new Date().toISOString(),
    };
    setUser(newUser); // persists to localStorage all-users list
    setUsers(getAllUsers());
    // Simulate sending email invitation via Gmail
    if (gmailConnected) {
      setInviteSent(inviteEmail);
      setTimeout(() => setInviteSent(null), 4000);
    }
    setInviteName(""); setInviteEmail(""); setInviteRole("editor"); setShowInvite(false);
  }

  function handleRoleChange(userId: string, role: Role) {
    updateUserRole(userId, role);
    setUsers(getAllUsers());
    setEditUser(null);
  }

  function handleDelete(userId: string) {
    removeUserById(userId);
    setUsers(getAllUsers());
    setConfirmDelete(null);
  }

  const canPerm = (role: Role, moduleId: string) => {
    const perms = MODULE_PERMISSIONS[role];
    return perms.includes("*") || perms.includes(moduleId);
  };

  return (
    <div style={{ padding: "0 0 40px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "0 0 4px" }}>{t("ניהול משתמשים והרשאות", "User & Permissions Management")}</h2>
        <p style={{ color: C.textSub, fontSize: 14, margin: 0 }}>{t("נהל משתמשים, תפקידים והרשאות גישה למודולים", "Manage users, roles, and module access permissions")}</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: C.cardAlt, borderRadius: 10, padding: 4, width: "fit-content", marginBottom: 24, border: `1px solid ${C.border}` }}>
        {([["users", t("משתמשים","Users")], ["roles", t("תפקידים והרשאות","Roles & Permissions")]] as [string,string][]).map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id as "users"|"roles")} style={{ padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: activeTab === id ? 700 : 400, background: activeTab === id ? "#fff" : "transparent", color: activeTab === id ? C.accent : C.textSub, boxShadow: activeTab === id ? C.shadow : "none", transition: "all 0.2s" }}>{label}</button>
        ))}
      </div>

      {/* USERS TAB */}
      {activeTab === "users" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <div style={{ color: C.textSub, fontSize: 14 }}>{users.length} {t("משתמשים","users")}</div>
            <button onClick={() => setShowInvite(true)} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              ➕ {t("הזמן משתמש","Invite User")}
            </button>
          </div>

          {/* Email invitation success toast */}
          {inviteSent && (
            <div style={{ background: "#d1fae5", border: "1px solid #10b98133", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#065f46", fontWeight: 600 }}>
              ✉️ {t(`הזמנה נשלחה ל-${inviteSent} דרך Gmail`, `Invitation sent to ${inviteSent} via Gmail`)}
            </div>
          )}

          {/* Gmail not connected notice */}
          {showInvite && !gmailConnected && (
            <div style={{ background: "#fef3c7", border: "1px solid #f59e0b33", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#92400e" }}>
              💡 {t("חבר Gmail בלשונית 'חיבורים' לשליחת הזמנות באימייל אוטומטית", "Connect Gmail in the 'Integrations' tab to send email invitations automatically")}
            </div>
          )}

          {/* Invite form */}
          {showInvite && (
            <div style={{ background: C.accentLight, border: `1px solid ${C.accent}40`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: C.accent, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                {t("הזמן משתמש חדש","Invite New User")}
                {gmailConnected && <span style={{ fontSize: 11, background: "#fce8e6", color: "#c5221f", borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>✉️ Gmail</span>}
              </div>
              <div className="as-invite-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 160px auto", gap: 12, alignItems: "end" }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: C.textSub, marginBottom: 4 }}>{t("שם","Name")}</label>
                  <input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder={t("שם מלא","Full name")} style={{ width: "100%", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 14, color: C.text, boxSizing: "border-box", outline: "none" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: C.textSub, marginBottom: 4 }}>{t("אימייל","Email")}</label>
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@example.com" style={{ width: "100%", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 14, color: C.text, boxSizing: "border-box", outline: "none" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: C.textSub, marginBottom: 4 }}>{t("תפקיד","Role")}</label>
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value as Role)} style={{ width: "100%", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 14, color: C.text, outline: "none" }}>
                    {(Object.keys(ROLES) as Role[]).map(r => <option key={r} value={r}>{isHe ? ROLES[r].he : ROLES[r].en}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={handleInvite} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", cursor: "pointer", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" }}>
                    {gmailConnected ? `✉️ ${t("שלח הזמנה","Send Invite")}` : t("הוסף","Add")}
                  </button>
                  <button onClick={() => setShowInvite(false)} style={{ background: C.cardAlt, color: C.textSub, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", cursor: "pointer", fontSize: 14 }}>✕</button>
                </div>
              </div>
            </div>
          )}

          {/* Users list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {users.map(u => (
              <div key={u.id} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: ROLES[u.role].bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{u.avatar || "👤"}</div>
                  <div>
                    <div style={{ fontWeight: 700, color: C.text, fontSize: 15 }}>{displayName(u)}</div>
                    <div style={{ color: C.textSub, fontSize: 13 }}>{u.email}</div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{t("הצטרף","Joined")} {new Date(u.createdAt).toLocaleDateString(isHe ? "he-IL" : "en-US")}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {editUser?.id === u.id ? (
                    <select defaultValue={u.role} onChange={e => handleRoleChange(u.id, e.target.value as Role)} style={{ background: "#fff", border: `1px solid ${C.accent}`, borderRadius: 8, padding: "7px 12px", fontSize: 14, color: C.text, outline: "none" }}>
                      {(Object.keys(ROLES) as Role[]).map(r => <option key={r} value={r}>{isHe ? ROLES[r].he : ROLES[r].en}</option>)}
                    </select>
                  ) : (
                    <span style={{ background: ROLES[u.role].bg, color: ROLES[u.role].color, borderRadius: 20, padding: "4px 14px", fontSize: 13, fontWeight: 600 }}>{isHe ? ROLES[u.role].he : ROLES[u.role].en}</span>
                  )}
                  <button onClick={() => setEditUser(editUser?.id === u.id ? null : u)} style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontSize: 13, color: C.textSub }}>
                    {editUser?.id === u.id ? t("בטל","Cancel") : "✏️"}
                  </button>
                  {confirmDelete === u.id ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => handleDelete(u.id)} style={{ background: C.red, color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontSize: 13 }}>{t("מחק","Delete")}</button>
                      <button onClick={() => setConfirmDelete(null)} style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", cursor: "pointer", fontSize: 13 }}>✕</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(u.id)} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", cursor: "pointer", fontSize: 13, color: C.red }}>🗑️</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ROLES TAB */}
      {activeTab === "roles" && (
        <div>
          {/* Role cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 32 }}>
            {(Object.keys(ROLES) as Role[]).map(role => (
              <div key={role} style={{ background: ROLES[role].bg, border: `2px solid ${ROLES[role].color}30`, borderRadius: 14, padding: "20px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontWeight: 800, fontSize: 16, color: ROLES[role].color }}>{isHe ? ROLES[role].he : ROLES[role].en}</span>
                  <span style={{ background: ROLES[role].color + "20", color: ROLES[role].color, borderRadius: 20, padding: "2px 10px", fontSize: 12 }}>{users.filter(u => u.role === role).length} {t("משתמשים","users")}</span>
                </div>
                <p style={{ fontSize: 13, color: C.textSub, margin: 0, lineHeight: 1.5 }}>{isHe ? ROLES[role].desc : ROLES[role].descEn}</p>
              </div>
            ))}
          </div>

          {/* Permissions matrix */}
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, color: C.text, fontSize: 15 }}>
              {t("מטריצת הרשאות","Permissions Matrix")}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.cardAlt }}>
                    <th style={{ padding: "12px 16px", textAlign: isHe ? "right" : "left", color: C.textSub, fontWeight: 600, borderBottom: `1px solid ${C.border}`, minWidth: 160 }}>{t("מודול","Module")}</th>
                    {(Object.keys(ROLES) as Role[]).map(role => (
                      <th key={role} style={{ padding: "12px 20px", textAlign: "center", color: ROLES[role].color, fontWeight: 700, borderBottom: `1px solid ${C.border}`, minWidth: 90 }}>
                        {isHe ? ROLES[role].he : ROLES[role].en}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ALL_MODULES.map((mod, i) => (
                    <tr key={mod.id} style={{ background: i % 2 === 0 ? "#fff" : C.cardAlt }}>
                      <td style={{ padding: "10px 16px", color: C.text, fontWeight: 500, borderBottom: `1px solid ${C.border}` }}>{isHe ? mod.he : mod.en}</td>
                      {(Object.keys(ROLES) as Role[]).map(role => {
                        const has = canPerm(role, mod.id);
                        return (
                          <td key={role} style={{ padding: "10px 20px", textAlign: "center", borderBottom: `1px solid ${C.border}` }}>
                            {has
                              ? <span style={{ color: C.green, fontSize: 17 }}>✓</span>
                              : <span style={{ color: C.border, fontSize: 17 }}>—</span>
                            }
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
