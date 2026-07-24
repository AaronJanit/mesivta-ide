import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listFiles } from "@/lib/db/files";
import type { FileNode } from "@/lib/db/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "https://ollama.com/api";
const MODEL = process.env.OLLAMA_MODEL ?? "glm-5.2:cloud";

// Only send these file types to the model (keep payload reasonable).
const ANALYZABLE_EXTS = new Set(["html", "htm", "css", "js", "mjs", "cjs", "json", "md", "txt", "xml", "svg"]);
const MAX_FILE_BYTES = 8000; // truncate very large files
const MAX_FILES = 20;
const MAX_TOTAL_CHARS = 24000; // rough token budget guard

function extOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function flatten(nodes: FileNode[], prefix: string, acc: { path: string; content: string }[]) {
  for (const n of nodes) {
    const p = prefix ? `${prefix}/${n.name}` : n.name;
    if (n.type === "file" && n.content != null && ANALYZABLE_EXTS.has(extOf(n.name))) {
      acc.push({ path: p, content: n.content });
    }
    if (n.children) flatten(n.children, p, acc);
  }
}

export async function POST(req: Request) {
  const sess = await getSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.OLLAMA_API_KEY ?? "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "OLLAMA_API_KEY is not set on the server — add it to .env.local" },
      { status: 500 },
    );
  }

  let body: { projectId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  // Gather all project files.
  let tree: FileNode[];
  try {
    tree = await listFiles(sess.userId, body.projectId);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const files: { path: string; content: string }[] = [];
  flatten(tree, "", files);

  // Build the file dump, respecting size limits.
  let totalChars = 0;
  const fileBlocks: string[] = [];
  for (const f of files.slice(0, MAX_FILES)) {
    const truncated = f.content.length > MAX_FILE_BYTES ? f.content.slice(0, MAX_FILE_BYTES) + "\n…(truncated)" : f.content;
    if (totalChars + truncated.length > MAX_TOTAL_CHARS) break;
    fileBlocks.push(`### ${f.path}\n\`\`\`\n${truncated}\n\`\`\``);
    totalChars += truncated.length;
  }

  const fileList = fileBlocks.length > 0 ? fileBlocks.join("\n\n") : "(no analyzable files found)";

  const systemPrompt = `You are an expert code reviewer and debugging assistant embedded in a browser IDE.
The user has run an "enhanced debug" because the basic syntax checker found no errors, but something still isn't working.
You are given ALL the project's files below. Your job is to deeply analyze them for:
- Logic errors (not syntax — the code is syntactically valid)
- Broken references (missing files, wrong paths, typos in selectors/IDs)
- Mismatched APIs (e.g. a function called with wrong arguments)
- HTML/CSS/JS integration issues (e.g. script tags referencing non-existent functions, CSS selectors that match nothing)
- Common gotchas (event listeners on elements that don't exist yet, case-sensitivity in file paths on servers, etc.)
- Accessibility or semantic issues that could cause unexpected behavior

Be specific: cite the file and line/section. If you find problems, list each one clearly with a heading.
If everything looks fine, say so honestly — don't invent problems.
Use Markdown. Keep it focused and actionable.`;

  const userPrompt = `Here are all the files in my project. Please review them deeply for any errors, bugs, or issues that could cause something not to work — beyond simple syntax errors.

${fileList}

Analyze each file and the interactions between them. Report any problems you find, or confirm everything looks correct.`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const upstreamRes = await fetch(`${OLLAMA_BASE_URL}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: MODEL,
            stream: true,
            options: { temperature: 0.2 },
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
        });

        if (!upstreamRes.ok || !upstreamRes.body) {
          const errText = await upstreamRes.text().catch(() => "");
          throw new Error(
            `Ollama Cloud responded ${upstreamRes.status} ${upstreamRes.statusText}: ${errText.slice(0, 300)}`,
          );
        }

        const reader = upstreamRes.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line) continue;
            try {
              const obj = JSON.parse(line) as {
                message?: { content?: string };
                done?: boolean;
                error?: string;
              };
              if (obj.error) throw new Error(obj.error);
              const delta = obj.message?.content;
              if (delta) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
              }
            } catch (e) {
              if (e instanceof Error && e.message && !e.message.includes("JSON")) {
                throw e;
              }
            }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        const msg = (err as Error).message ?? "Enhanced debug stream error";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}