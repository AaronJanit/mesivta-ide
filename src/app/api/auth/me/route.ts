import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUserById } from "@/lib/db/users";

export const runtime = "nodejs";

export async function GET() {
  const sess = await getSession();
  if (!sess) return NextResponse.json({ user: null }, { status: 200 });
  const user = await getUserById(sess.userId).catch(() => null);
  return NextResponse.json({ user });
}