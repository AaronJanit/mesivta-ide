import { NextResponse } from "next/server";
import { verifyPassword, setSession } from "@/lib/auth/session";
import { getUserByUsername } from "@/lib/db/users";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const username = body.username?.trim();
  const password = body.password;
  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }
  try {
    const user = await getUserByUsername(username);
    if (!user) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }
    const ok = await verifyPassword(password, user.password);
    if (!ok) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }
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