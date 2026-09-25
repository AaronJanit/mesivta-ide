import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listMessages, createMessage, deleteMessagesFrom } from "@/lib/db/chats";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sess = await getSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const messages = await listMessages(sess.userId, id);
    return NextResponse.json({ messages });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 404 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sess = await getSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { role, content } = await req.json().catch(() => ({}));
  if (!["user", "assistant", "system"].includes(role) || typeof content !== "string") {
    return NextResponse.json({ error: "role and content required" }, { status: 400 });
  }
  try {
    const message = await createMessage(sess.userId, id, role, content);
    return NextResponse.json({ message });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sess = await getSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { from } = await req.json().catch(() => ({}));
  if (typeof from !== "string" || from.length === 0) {
    return NextResponse.json({ error: "from timestamp required" }, { status: 400 });
  }
  try {
    await deleteMessagesFrom(sess.userId, id, from);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}