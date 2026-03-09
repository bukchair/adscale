import { NextRequest, NextResponse } from "next/server";

// Google OAuth scopes for platform connections
const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/adwords",
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/gmail.send",
].join(" ");

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GOOGLE_CLIENT_ID not configured" }, { status: 500 });
  }

  const baseUrl = req.nextUrl.origin;
  const redirectUri = `${baseUrl}/api/auth/google-connect/callback`;

  // Pass through any ?returnTo param so callback knows where to send user
  const returnTo = req.nextUrl.searchParams.get("returnTo") || "/modules?tab=integrations";

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: encodeURIComponent(returnTo),
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  return NextResponse.redirect(authUrl);
}
