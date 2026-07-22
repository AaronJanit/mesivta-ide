import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Ollama Cloud — per https://docs.ollama.com/api/introduction and
// https://docs.ollama.com/cloud the base URL is https://ollama.com/api and
// auth is a `Bearer <OLLAMA_API_KEY>` header. The native /api/chat endpoint
// streams newline-delimited JSON objects of shape
// { message: { role, content }, done: boolean } (NOT OpenAI's
// /v1/chat/completions shape — that's why the OpenAI SDK + /v1 base URL
// returned 405 Method Not Allowed).
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "https://ollama.com/api";
const MODEL = process.env.OLLAMA_MODEL ?? "glm-5.2:cloud";

interface Body {
  language: string;
  filePath: string;
  message: string;
  excerpt?: string;
  snippet?: string;
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
  if (typeof body.message !== "string") {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  const apiKey = process.env.OLLAMA_API_KEY ?? "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "OLLAMA_API_KEY is not set on the server — add it to .env.local" },
      { status: 500 },
    );
  }

  const language = body.language ?? "code";
  const filePath = body.filePath ?? "(file)";
  const excerpt = body.excerpt ?? "";
  const snippet = body.snippet ?? "";

  const userPrompt = `Explain this syntax error clearly and in an educational manner: ${body.message}

File: ${filePath}
Language: ${language}
${excerpt ? `Offending line:\n\`\`\`\n${excerpt}\n\`\`\`\n` : ""}${snippet ? `Context:\n\`\`\`\n${snippet}\n\`\`\`\n` : ""}

Explain WHY this is a syntax error (the underlying rule being violated), and how the user can identify and fix it themselves. Do NOT just give the corrected line — teach the concept so the user learns.`;

  const systemPrompt = `You are a patient programming teacher embedded in a browser IDE's debugger panel.
A learner has a syntax error in their ${language} file. Explain the error clearly and educationally:
- State which rule of ${language} syntax is being violated.
- Show the small mental model the learner should have (e.g. "every opening brace needs a matching close").
- Point out the exact spot in the snippet that triggers it.
- Guide the learner toward fixing it themselves — describe the fix in words, do NOT paste the corrected code.
Use Markdown. Keep it under ~200 words.`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let upstream: ReadableStream<Uint8Array> | null = null;
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
            options: { temperature: 0.3 },
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
        upstream = upstreamRes.body;

        // Ollama streams newline-delimited JSON objects:
        // {"model":...,"message":{"role":"assistant","content":"The"},"done":false}
        const reader = upstream.getReader();
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
      } catch (err) {
        const msg = (err as Error).message ?? "Explain stream error";
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