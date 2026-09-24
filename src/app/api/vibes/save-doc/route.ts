import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listProjects } from "@/lib/db/projects";
import { createFile, listFiles, updateFile } from "@/lib/db/files";
import { VIBES_DOC_SPECS } from "@/lib/vibes/docs";

export const runtime = "nodejs";

function buildMarkdown(stage: string, value: string): string {
  const spec = VIBES_DOC_SPECS.find((s) => s.stage === stage)!;
  const lines: string[] = [];
  lines.push(`# ${spec.title}`);
  lines.push("");
  switch (stage) {
    case "part-1":
      lines.push("**Vibes Part 1:** prompt an AI to code a website about the topic of your choice.");
      lines.push("");
      lines.push("## My prompt");
      lines.push("");
      lines.push(value.trim() || "_(not recorded)_");
      lines.push("");
      lines.push("## Next step");
      lines.push("");
      lines.push("Give this prompt to an AI (e.g. ChatGPT), then continue to Part 2 to edit the code yourself.");
      break;
    case "part-2":
      lines.push("**Vibes Part 2:** edit the code yourself to change the styling and content.");
      lines.push("");
      lines.push("## My changes");
      lines.push("");
      lines.push(value.trim() || "_(not recorded)_");
      break;
    case "part-3":
      lines.push("**Vibes Part 3:** add new features to improve your website and make it your own.");
      lines.push("");
      lines.push("## New features I added");
      lines.push("");
      lines.push(value.trim() || "_(not recorded)_");
      lines.push("");
      lines.push("## Finish");
      lines.push("");
      lines.push("Vibes complete — the club celebrates with a pizza party 🍕");
      break;
  }
  return lines.join("\n");
}

export async function POST(req: Request) {
  const sess = await getSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    stage?: string;
    fields?: Record<string, string>;
  };
  const spec = VIBES_DOC_SPECS.find((s) => s.stage === body.stage);
  if (!spec) return NextResponse.json({ error: "Invalid stage" }, { status: 400 });

  const value = body.fields?.[spec.fieldKey] ?? "";
  if (typeof value !== "string" || value.length > 20_000) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    // Target the user's first project; create a "Vibes" one if they have none.
    const projects = await listProjects(sess.userId);
    const project = projects[0];
    if (!project) {
      return NextResponse.json(
        { error: "Create a project in the IDE first (it will hold your Vibes notes)." },
        { status: 400 },
      );
    }

    const tree = await listFiles(sess.userId, project.id);
    let folder = tree.find((n) => n.type === "folder" && n.name === "vibes");
    if (!folder) {
      folder = await createFile(sess.userId, {
        project_id: project.id,
        parent_folder_id: null,
        name: "vibes",
        type: "folder",
      });
    }

    const content = buildMarkdown(spec.stage, value);
    const existing = folder.children?.find((n) => n.type === "file" && n.name === spec.fileName);
    if (existing) {
      await updateFile(sess.userId, existing.id, { content });
    } else {
      await createFile(sess.userId, {
        project_id: project.id,
        parent_folder_id: folder.id,
        name: spec.fileName,
        type: "file",
        content,
      });
    }

    return NextResponse.json({ ok: true, fileName: spec.fileName, projectName: project.name });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}