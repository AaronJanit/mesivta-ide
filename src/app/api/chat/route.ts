import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getSession } from "@/lib/auth/session";
import { createMessage, renameChat } from "@/lib/db/chats";
import { listFiles } from "@/lib/db/files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cerebras = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY!,
  baseURL: "https://api.cerebras.ai/v1",
});

interface Body {
  chatId: string;
  projectId: string;
  content: string;
  history?: { role: "user" | "assistant" | "system"; content: string }[];
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

  // 2. Build project context: file tree paths (no contents — cheap) + active file content.
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
    contextBlock = paths.length
      ? `\n\n## Current project file tree\n\`\`\`\n${paths.join("\n")}\n\`\`\``
      : "\n\n## Current project\n(empty — no files yet)";
  } catch {
    contextBlock = "";
  }

  const systemPrompt = `You are a concise, helpful coding assistant embedded in a browser IDE.
Use Markdown for all responses: headings, **bold**, *italic*, bullet/numbered lists, tables, blockquotes, fenced code blocks with language tags, and inline \`code\`.
When you suggest code, ALWAYS put it in a fenced code block with the correct language tag (e.g. \`\`\`ts, \`\`\`python, \`\`\`css).
Do NOT attempt to edit files directly — you cannot. Provide code the user can read and copy manually.
Keep answers focused and skippable. No filler.${contextBlock}`;

  // 3. Compose messages for Cerebras: system + history (last ~20) + new user msg.
  const history = (body.history ?? []).slice(-20);
  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: body.content },
  ];

  // 4. Auto-title the chat from the first user prompt if still "New chat".
  const firstPrompt = body.content.trim().slice(0, 60);
  renameChat(sess.userId, body.chatId, firstPrompt || "New chat").catch(() => {});

  // 5. Stream from Cerebras gpt-oss-120b, proxy SSE to the client.
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let assistantContent = "";
      try {
        const completion = await cerebras.chat.completions.create({
          model: "gpt-oss-120b",
          stream: true,
          temperature: 0.2,
          max_completion_tokens: 4096,
          reasoning_effort: "low",
          messages,
        });

        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            assistantContent += delta;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
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