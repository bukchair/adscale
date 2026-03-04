import { NextRequest, NextResponse } from "next/server";
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const client_id = searchParams.get("client_id");
  const client_secret = searchParams.get("client_secret");
  const redirect_uri = searchParams.get("redirect_uri");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code: code!, client_id: client_id!, client_secret: client_secret!, redirect_uri: redirect_uri!, grant_type: "authorization_code" })
  });
  const data = await res.json();
  return NextResponse.json(data);
}
