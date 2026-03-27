import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("authrator_token");
  response.cookies.delete("authrator_oauth_session");
  return response;
}
