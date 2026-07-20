import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listProjects, createProject } from "@/lib/db/projects";

export const runtime = "nodejs";

export async function GET() {
  const sess = await getSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const projects = await listProjects(sess.userId);
  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  const sess = await getSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name } = await req.json().catch(() => ({}));
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  const project = await createProject(sess.userId, name.trim().slice(0, 100));
  return NextResponse.json({ project });
}