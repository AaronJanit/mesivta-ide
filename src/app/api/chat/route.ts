import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createMessage, renameChat } from "@/lib/db/chats";
import { listFiles } from "@/lib/db/files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Ollama Cloud — native /api/chat endpoint (NDJSON, not OpenAI SSE).
// See also: /api/debug/explain/route.ts and /api/debug/enhanced/route.ts
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "https://ollama.com/api";
const MODEL = process.env.OLLAMA_CHAT_MODEL ?? "gpt-oss:20b-cloud";

interface ActiveFileContext {
  name: string;
  path: string;
  language: string;
  content: string;
}

interface Body {
  chatId: string;
  projectId: string;
  content: string;
  history?: { role: "user" | "assistant" | "system"; content: string }[];
  activeFile?: ActiveFileContext | null;
  openTabs?: ActiveFileContext[];
}

export async function POST(req: Request) {
  const sess = await getSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.chatId || !body.projectId || typeof body.content !== "string") {
    return NextResponse.json({ error: "chatId, projectId, content required" }, { status: 400 });
  }

  // 1. Persist the user's message.
  await createMessage(sess.userId, body.chatId, "user", body.content).catch(() => {});

  // 2. Build project context: file tree paths + contents of the active file and open tabs.
  // The client sends the active file + open tabs (with content) it already has loaded —
  // we trust it because it came from an authenticated session and is the user's own project.
  let contextBlock = "";
  try {
    const tree = await listFiles(sess.userId, body.projectId);
    const paths: string[] = [];
    const walk = (nodes: typeof tree, prefix: string) => {
      for (const n of nodes) {
        const p = prefix ? `${prefix}/${n.name}` : n.name;
        paths.push(n.type === "folder" ? `${p}/` : p);
        if (n.children) walk(n.children, p);
      }
    };
    walk(tree, "");
    const treeBlock = paths.length
      ? `\n\n## Current project file tree\n\`\`\`\`\n${paths.join("\n")}\n\`\`\`\``
      : "\n\n## Current project\n(empty — no files yet)";

    const fileSections: string[] = [];
    const MAX_FILE_BYTES = 12_000; // per-file cap to keep prompt bounded
    const trim = (s: string) =>
      s.length > MAX_FILE_BYTES ? `${s.slice(0, MAX_FILE_BYTES)}\n\n/* …truncated (${s.length - MAX_FILE_BYTES} more bytes)… */` : s;

    const seenPaths = new Set<string>();
    const addFile = (f: ActiveFileContext, isActive: boolean) => {
      if (!f || !f.path || seenPaths.has(f.path)) return;
      seenPaths.add(f.path);
      const lang = f.language || "";
      const tag = isActive ? "ACTIVE FILE" : "OPEN TAB";
      fileSections.push(
        `\n\n## ${tag}: ${f.path}\n\`\`\`${lang}\n${trim(f.content ?? "")}\n\`\`\``,
      );
    };

    if (body.activeFile) addFile(body.activeFile, true);
    if (Array.isArray(body.openTabs)) {
      for (const t of body.openTabs) addFile(t, false);
    }

    contextBlock = `${treeBlock}${fileSections.join("")}`;
  } catch {
    contextBlock = "";
  }

  const systemPrompt = `You are a concise, helpful coding assistant embedded in a browser IDE.
Use Markdown for all responses: headings, **bold**, *italic*, bullet/numbered lists, tables, blockquotes, fenced code blocks with language tags, and inline \`code\`.
When you suggest code, ALWAYS put it in a fenced code block with the correct language tag (e.g. \`\`\`ts, \`\`\`python, \`\`\`css).
Do NOT attempt to edit files directly — you cannot. Provide code the user can read and copy manually.
Keep answers focused and skippable. No filler.

IMPORTANT: The user is editing files in this IDE. The context below includes the CURRENTLY ACTIVE FILE (the one the user is looking at) and any other OPEN TABS with their full contents. When the user asks about "this file", "my code", "the function", "why doesn't it work", etc., they are almost always referring to the ACTIVE FILE or one of the OPEN TABS. Read those contents before answering — ground your answer in the actual code shown. Quote relevant lines by line number or snippet when helpful.${contextBlock}`;

  // 3. Compose messages for Ollama Cloud: system + history (last ~20) + new user msg.
  const history = (body.history ?? []).slice(-20);
  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: body.content },
  ];

  // 4. Auto-title the chat from the first user prompt if still "New chat".
  const firstPrompt = body.content.trim().slice(0, 60);
  renameChat(sess.userId, body.chatId, firstPrompt || "New chat").catch(() => {});

  const apiKey = process.env.OLLAMA_API_KEY ?? "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "OLLAMA_API_KEY is not set on the server — add it to .env.local" },
      { status: 500 },
    );
  }

  // 5. Stream from Ollama Cloud (gpt-oss:20b-cloud), proxy SSE to the client.
  //    Ollama streams newline-delimited JSON objects (NDJSON), not OpenAI SSE.
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let assistantContent = "";
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
            messages,
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
          // Ollama delimits objects with newlines; process all complete lines.
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
                assistantContent += delta;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
              }
            } catch (e) {
              // Ignore malformed partial lines mid-stream; real errors throw above.
              if (e instanceof Error && e.message && !e.message.includes("JSON")) {
                throw e;
              }
            }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));

        // 6. Persist the assistant message after streaming completes.
        await createMessage(sess.userId, body.chatId, "assistant", assistantContent).catch(() => {});
      } catch (err) {
        const msg = (err as Error).message ?? "Stream error";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        // Persist whatever we got + an error note if nothing.
        const finalContent = assistantContent || `⚠️ Error: ${msg}`;
        await createMessage(sess.userId, body.chatId, "assistant", finalContent).catch(() => {});
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