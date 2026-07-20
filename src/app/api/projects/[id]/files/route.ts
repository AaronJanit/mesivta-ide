import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listFiles, createFile } from "@/lib/db/files";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sess = await getSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const tree = await listFiles(sess.userId, id);
    return NextResponse.json({ tree });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 404 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sess = await getSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body.name || !body.type) {
    return NextResponse.json({ error: "name and type required" }, { status: 400 });
  }
  try {
    const node = await createFile(sess.userId, {
      project_id: id,
      parent_folder_id: body.parent_folder_id ?? null,
      name: body.name,
      type: body.type,
      content: body.content ?? null,
    });
    return NextResponse.json({ node });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}