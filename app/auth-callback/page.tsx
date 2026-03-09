"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { createOrLoginGoogleUser, isOnboardingComplete, saveConnection } from "../lib/auth";

export default function AuthCallbackPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (status === "authenticated" && session?.user) {
      const { id, name, email, image } = session.user;
      const accessToken  = (session as any).accessToken  as string | undefined;
      const refreshToken = (session as any).refreshToken as string | undefined;
      const scope        = (session as any).scope        as string | undefined;

      // Create or load user record with first-user-admin logic
      createOrLoginGoogleUser(
        id ?? email ?? "unknown",
        name ?? "משתמש",
        email ?? "",
        image ?? undefined
      );

      // Auto-connect Google platforms if we have a token with the right scopes
      if (accessToken && email) {
        const baseFields = {
          access_token:  accessToken,
          refresh_token: refreshToken ?? "",
          email,
          connected_via: "google_oauth",
        };

        if (scope?.includes("adwords")) {
          saveConnection("google_ads", { ...baseFields, account_name: email });
        }
        if (scope?.includes("analytics")) {
          saveConnection("ga4", { ...baseFields, account_name: email });
        }
        if (scope?.includes("webmasters")) {
          saveConnection("gsc", { ...baseFields, account_name: email });
        }
        if (scope?.includes("gmail")) {
          saveConnection("gmail", { ...baseFields, sender_email: email, oauth: "connected" });
        }
      }

      // Always go directly to modules (skip onboarding for returning users)
      router.replace("/modules");
    }
  }, [session, status, router]);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a14", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: "3px solid rgba(99,102,241,0.3)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 20px" }} />
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15 }}>מאמת חשבון ומחבר פלטפורמות...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
