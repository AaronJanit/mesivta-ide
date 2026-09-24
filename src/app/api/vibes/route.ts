import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listProjects } from "@/lib/db/projects";
import { listFiles } from "@/lib/db/files";
import { VIBES_DOC_SPECS } from "@/lib/vibes/docs";
import type { VibesStageState } from "@/lib/vibes/docs";

export const runtime = "nodejs";

export async function GET() {
  const sess = await getSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const projects = await listProjects(sess.userId);
    const project = projects[0];
    if (!project) return NextResponse.json({ stages: {} as Record<string, VibesStageState> });

    const tree = await listFiles(sess.userId, project.id);
    const vibesFolder = tree.find((n) => n.type === "folder" && n.name === "vibes");
    if (!vibesFolder) return NextResponse.json({ stages: {} as Record<string, VibesStageState> });

    const stages: Record<string, VibesStageState> = {};
    for (const spec of VIBES_DOC_SPECS) {
      const file = vibesFolder.children?.find((n) => n.type === "file" && n.name === spec.fileName);
      if (file) {
        stages[spec.stage] = {
          done: true,
          fileId: file.id,
          updatedAt: file.updated_at,
          fileName: spec.fileName,
          projectName: project.name,
        };
      }
    }
    return NextResponse.json({ stages });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}