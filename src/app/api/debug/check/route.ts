import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listFiles } from "@/lib/db/files";
import { scanProject, type ScanResult } from "@/lib/debug/syntaxCheck";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sess = await getSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  try {
    const tree = await listFiles(sess.userId, projectId);
    const result: ScanResult = scanProject(tree);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}