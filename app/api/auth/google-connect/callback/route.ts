import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data", "google-tokens");

async function saveTokens(email: string, tokens: Record<string, string>) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const safe = email.replace(/[^a-zA-Z0-9@._-]/g, "_").toLowerCase();
  await fs.writeFile(
    path.join(DATA_DIR, `${safe}.json`),
    JSON.stringify({ ...tokens, updatedAt: new Date().toISOString() }, null, 2),
    "utf-8"
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const baseUrl = req.nextUrl.origin;
  const returnTo = state ? decodeURIComponent(state) : "/modules?tab=integrations";

  if (error || !code) {
    return NextResponse.redirect(`${baseUrl}${returnTo}&google_error=${error || "no_code"}`);
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${baseUrl}${returnTo}&google_error=missing_credentials`);
  }

  const redirectUri = `${baseUrl}/api/auth/google-connect/callback`;

  try {
    // Exchange auth code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("Token exchange failed:", err);
      return NextResponse.redirect(`${baseUrl}${returnTo}&google_error=token_exchange_failed`);
    }

    const tokens = await tokenRes.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope: string;
      token_type: string;
      id_token?: string;
    };

    // Get user info to identify the account
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = userRes.ok ? await userRes.json() as { email?: string; name?: string } : {};
    const email = userInfo.email ?? "";

    // Store tokens server-side
    if (email) {
      await saveTokens(email, {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? "",
        scope: tokens.scope,
        email,
        name: userInfo.name ?? "",
      });
    }

    // Build connection fields that will be stored in localStorage via the callback page
    const connectionData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? "",
      scope: tokens.scope,
      email,
      name: userInfo.name ?? "",
      connected_at: new Date().toISOString(),
    };

    // Encode connection data to pass to client-side callback page
    const encoded = encodeURIComponent(JSON.stringify(connectionData));

    // Redirect to a client-side page that stores the tokens in localStorage
    return NextResponse.redirect(
      `${baseUrl}/google-connect-success?data=${encoded}&returnTo=${encodeURIComponent(returnTo)}`
    );
  } catch (e: unknown) {
    console.error("Google connect callback error:", e);
    return NextResponse.redirect(`${baseUrl}${returnTo}&google_error=callback_error`);
  }
}
