"use client";

import { useCallback, useRef, useState } from "react";

interface StreamOptions {
  onDelta: (full: string) => void;
  onDone: (full: string) => void;
  onError?: (err: string) => void;
}

interface SendArgs {
  chatId: string;
  projectId: string;
  content: string;
  history: { role: "user" | "assistant" | "system"; content: string }[];
}

/**
 * Streams an AI chat response from /api/chat (SSE). Accumulates delta content
 * and reports it to onDelta with requestAnimationFrame-throttled updates so
 * Markdown re-render doesn't run per byte.
 */
export function useStreamChat() {
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async (args: SendArgs, opts: StreamOptions) => {
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    let full = "";
    let rafId: number | null = null;
    let lastFlush = 0;
    const FLUSH_MS = 60;

    const flush = () => {
      rafId = null;
      opts.onDelta(full);
      lastFlush = Date.now();
    };

    const schedule = () => {
      if (rafId !== null) return;
      const wait = Math.max(0, FLUSH_MS - (Date.now() - lastFlush));
      rafId = window.setTimeout(() => {
        rafId = null;
        flush();
      }, wait) as unknown as number;
    };

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload) as { delta?: string; error?: string };
            if (json.error) throw new Error(json.error);
            if (json.delta) {
              full += json.delta;
              schedule();
            }
          } catch {
            // ignore parse hiccups mid-stream
          }
        }
      }
      // final flush
      if (rafId !== null) {
        clearTimeout(rafId);
        rafId = null;
      }
      flush();
      opts.onDone(full);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        opts.onDone(full);
      } else {
        const msg = (err as Error).message;
        opts.onError?.(msg);
        opts.onDone(full || `⚠️ ${msg}`);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { streaming, send, abort };
}