import { NextResponse } from "next/server";
import { hashPassword, setSession } from "@/lib/auth/session";
import { createUser, getUserByUsername } from "@/lib/db/users";

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
  if (username.length < 3 || username.length > 32) {
    return NextResponse.json({ error: "Username must be 3–32 characters" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }
  try {
    const existing = await getUserByUsername(username);
    if (existing) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }
    const hash = await hashPassword(password);
    const user = await createUser(username, hash);
    await setSession({ userId: user.id, username: user.username });
    return NextResponse.json({ user: { id: user.id, username: user.username } });
  } catch (error) {
    console.error("Registration failed", error);
    return NextResponse.json(
      { error: "Account storage is not configured. Add the Supabase settings to .env.local." },
      { status: 503 },
    );
  }
}