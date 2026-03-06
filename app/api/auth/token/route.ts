import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { code, client_id, client_secret, redirect_uri } = await req.json();
  if (!code || !client_id || !client_secret || !redirect_uri) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id, client_secret, redirect_uri, grant_type: "authorization_code" }),
  });
  const data = await res.json();
  return NextResponse.json(data);
}
