import { NextRequest, NextResponse } from "next/server";

// These are the scopes needed for Google platform integrations.
// They are requested separately from login so that basic sign-in
// (which uses only openid/email/profile) is never blocked by Google's
// verification requirement for restricted scopes.
const PLATFORM_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/adwords",
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/gmail.send",
].join(" ");

export async function GET(req: NextRequest) {
  const baseUrl = req.nextUrl.origin;
  const returnTo = req.nextUrl.searchParams.get("returnTo") ?? "/modules?tab=integrations";
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.redirect(
      `${baseUrl}/modules?tab=integrations&google_error=missing_client_id`
    );
  }

  const redirectUri = `${baseUrl}/api/auth/google-connect/callback`;

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", PLATFORM_SCOPES);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", encodeURIComponent(returnTo));

  return NextResponse.redirect(authUrl.toString());
}
