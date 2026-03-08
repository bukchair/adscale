"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn as nextAuthSignIn } from "next-auth/react";
import { signInWithEmail, signUpWithEmail, setUser, getUser, isOnboardingComplete } from "../lib/auth";

const GOOGLE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  typeof window !== "undefined"
  // We always show Google button; it will use NextAuth
);

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">(
    searchParams.get("mode") === "signup" ? "signup" : "login"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState("");
  const [lang, setLang] = useState<"he" | "en">("he");
  const isHe = lang === "he";

  useEffect(() => {
    const u = getUser();
    if (u) router.replace(isOnboardingComplete() ? "/modules" : "/onboarding");
  }, [router]);

  const t = (he: string, en: string) => isHe ? he : en;

  function afterLogin() {
    router.replace(isOnboardingComplete() ? "/modules" : "/onboarding");
  }

  async function handleGoogle() {
    setLoading("google");
    setError("");
    try {
      // Real Google OAuth — NextAuth handles the redirect to Google
      await nextAuthSignIn("google", { callbackUrl: "/auth-callback" });
      // (page will redirect, so no code runs after this)
    } catch {
      setError(t("שגיאה בהתחברות עם Google", "Error signing in with Google"));
      setLoading(null);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading("email");
    setError("");
    try {
      const user =
        mode === "signup"
          ? await signUpWithEmail(name, email, password)
          : await signInWithEmail(email, password);
      setUser(user);
      afterLogin();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "error";
      setError(
        msg === "invalid_email"
          ? t("כתובת אימייל לא תקינה", "Invalid email address")
          : t("שגיאה בהתחברות", "Sign in error")
      );
      setLoading(null);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a14",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        direction: isHe ? "rtl" : "ltr",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "fixed",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 600,
          height: 400,
          background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ width: "100%", maxWidth: 440, position: "relative" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <button
            onClick={() => router.push("/")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              ⚡
            </div>
            <span
              style={{
                fontWeight: 800,
                fontSize: 22,
                background: "linear-gradient(90deg,#6366f1,#8b5cf6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              BScale AI
            </span>
          </button>
        </div>

        {/* Card */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 20,
            padding: "36px 32px",
            backdropFilter: "blur(10px)",
          }}
        >
          {/* Mode tabs */}
          <div
            style={{
              display: "flex",
              background: "rgba(255,255,255,0.05)",
              borderRadius: 12,
              padding: 4,
              marginBottom: 28,
            }}
          >
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 9,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  transition: "all 0.2s",
                  background: mode === m ? "rgba(99,102,241,0.8)" : "transparent",
                  color: mode === m ? "#fff" : "rgba(255,255,255,0.5)",
                }}
              >
                {m === "login" ? t("כניסה", "Login") : t("הרשמה", "Sign Up")}
              </button>
            ))}
          </div>

          <h1
            style={{
              color: "#fff",
              fontSize: 22,
              fontWeight: 800,
              marginBottom: 6,
              textAlign: "center",
            }}
          >
            {mode === "login"
              ? t("ברוך השב!", "Welcome back!")
              : t("צור חשבון חדש", "Create a new account")}
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: 14,
              textAlign: "center",
              marginBottom: 28,
            }}
          >
            {mode === "login"
              ? t("התחבר כדי לנהל את הקמפיינים שלך", "Sign in to manage your campaigns")
              : t("הצטרף ל-BScale AI היום", "Join BScale AI today")}
          </p>

          {/* Google button — REAL OAuth */}
          <button
            onClick={handleGoogle}
            disabled={!!loading}
            style={{
              width: "100%",
              background: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "13px 0",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: 15,
              fontWeight: 600,
              color: "#1e293b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginBottom: 20,
              opacity: loading ? 0.7 : 1,
              transition: "opacity 0.2s",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}
          >
            {loading === "google" ? (
              <span
                style={{
                  display: "inline-block",
                  width: 18,
                  height: 18,
                  border: "2px solid #6366f1",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite",
                }}
              />
            ) : (
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 29.8 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.8 20-21 0-1.4-.2-2.7-.5-4z" />
                <path fill="#34A853" d="M6.3 14.7l7 5.1C15.1 16 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 16.1 3 9.3 7.8 6.3 14.7z" />
                <path fill="#FBBC05" d="M24 45c5.5 0 10.5-1.8 14.4-4.9l-6.7-5.5C29.6 36.4 26.9 37 24 37c-5.7 0-10.6-3.1-11.7-7.5l-7 5.4C8.4 41.2 15.6 45 24 45z" />
                <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-1.1 3-3.4 5.5-6.3 7.1l6.7 5.5C40.5 38 45 32 45 24c0-1.4-.2-2.7-.5-4z" />
              </svg>
            )}
            {t("המשך עם Google", "Continue with Google")}
          </button>

          {/* Note about Google OAuth config */}
          <div
            style={{
              background: "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 20,
              fontSize: 12,
              color: "rgba(255,255,255,0.5)",
              lineHeight: 1.5,
            }}
          >
            🔑 {t(
              "נדרשות הגדרות Google OAuth — ראה .env.local.example",
              "Google OAuth credentials required — see .env.local.example"
            )}
          </div>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>
              {t("או", "or")}
            </span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
          </div>

          {/* Email form (demo/dev login) */}
          <form onSubmit={handleEmailSubmit}>
            {mode === "signup" && (
              <div style={{ marginBottom: 14 }}>
                <label
                  style={{
                    display: "block",
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 13,
                    marginBottom: 6,
                  }}
                >
                  {t("שם מלא", "Full name")}
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder={t("ישראל ישראלי", "John Smith")}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    padding: "11px 14px",
                    color: "#fff",
                    fontSize: 15,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: "block",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 13,
                  marginBottom: 6,
                }}
              >
                {t("אימייל", "Email")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10,
                  padding: "11px 14px",
                  color: "#fff",
                  fontSize: 15,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ marginBottom: 22 }}>
              <label
                style={{
                  display: "block",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 13,
                  marginBottom: 6,
                }}
              >
                {t("סיסמה", "Password")}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10,
                  padding: "11px 14px",
                  color: "#fff",
                  fontSize: 15,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            {error && (
              <div
                style={{
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  color: "#fca5a5",
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={!!loading}
              style={{
                width: "100%",
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                border: "none",
                borderRadius: 12,
                padding: "13px 0",
                color: "#fff",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: 16,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: loading ? 0.7 : 1,
                transition: "opacity 0.2s",
              }}
            >
              {loading === "email" ? (
                <span
                  style={{
                    display: "inline-block",
                    width: 18,
                    height: 18,
                    border: "2px solid rgba(255,255,255,0.5)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    animation: "spin 0.7s linear infinite",
                  }}
                />
              ) : null}
              {mode === "login" ? t("כניסה", "Sign In") : t("צור חשבון", "Create Account")}
            </button>
          </form>
        </div>

        {/* Language toggle */}
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button
            onClick={() => setLang((l) => (l === "he" ? "en" : "he"))}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              padding: "6px 14px",
              color: "rgba(255,255,255,0.5)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {isHe ? "Switch to English" : "עבור לעברית"}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0a0a14" }} />}>
      <LoginForm />
    </Suspense>
  );
}
