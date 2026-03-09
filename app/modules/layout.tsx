"use client";

// Auth guard is handled inside ModulesPage itself (after mount, avoiding hydration mismatch)
export default function ModulesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
