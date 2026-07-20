import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listChats, createChat } from "@/lib/db/chats";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sess = await getSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const chats = await listChats(sess.userId, id);
    return NextResponse.json({ chats });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 404 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sess = await getSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { title } = await req.json().catch(() => ({}));
  try {
    const chat = await createChat(sess.userId, id, typeof title === "string" ? title : "New chat");
    return NextResponse.json({ chat });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}