"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { createOrLoginGoogleUser, isOnboardingComplete } from "../lib/auth";

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
      // Create or load user record — no platform connections here.
      // Platform connections are done separately in the Integrations module.
      createOrLoginGoogleUser(
        id ?? email ?? "unknown",
        name ?? "משתמש",
        email ?? "",
        image ?? undefined
      );

      router.replace("/modules");
    }
  }, [session, status, router]);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a14", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: "3px solid rgba(99,102,241,0.3)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 20px" }} />
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15 }}>מאמת חשבון...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
