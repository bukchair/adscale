import { NextRequest, NextResponse } from "next/server";

// Redirect to NextAuth Google sign-in — uses already-registered /api/auth/callback/google URI
export async function GET(req: NextRequest) {
  const baseUrl = req.nextUrl.origin;
  return NextResponse.redirect(`${baseUrl}/api/auth/signin/google?callbackUrl=${encodeURIComponent("/auth-callback")}`);
}
