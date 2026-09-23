import { NextResponse } from "next/server";
import { setSession } from "@/lib/auth/session";
import { getUserByCode } from "@/lib/db/users";
import { allowIp, clearCodeFailures, isCodeLocked, recordCodeFailure } from "@/lib/auth/rateLimit";

export const runtime = "nodejs";

// Sign-in is a single 4-digit code (created by the admin in Supabase).
// There are only 10,000 possible codes, so throttle guessing: limited
// attempts per IP, and a code locks after repeated failures.
function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: Request) {
  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const code = body.code?.trim() ?? "";
  if (!/^\d{4}$/.test(code)) {
    return NextResponse.json({ error: "Enter your 4-digit code" }, { status: 400 });
  }
  if (!allowIp(clientIp(req))) {
    return NextResponse.json(
      { error: "Too many attempts. Wait a minute and try again." },
      { status: 429 },
    );
  }
  if (isCodeLocked(code)) {
    return NextResponse.json(
      { error: "This code is locked after too many wrong tries. Try again in a few minutes." },
      { status: 429 },
    );
  }
  try {
    const user = await getUserByCode(code);
    if (!user) {
      recordCodeFailure(code);
      return NextResponse.json({ error: "Invalid code" }, { status: 401 });
    }
    clearCodeFailures(code);
    await setSession({ userId: user.id, username: user.username });
    return NextResponse.json({ user: { id: user.id, username: user.username } });
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json(
      { error: "Account storage is not configured. Add the Supabase settings to .env.local." },
      { status: 503 },
    );
  }
}