"use client";

import { useCallback, useRef, useState } from "react";

interface StreamOptions {
  onDelta: (full: string) => void;
  onDone: (full: string) => void;
  onError?: (err: string) => void;
}

interface ExplainArgs {
  language: string;
  filePath: string;
  message: string;
  excerpt?: string;
  snippet?: string;
}

/**
 * Streams an educational explanation from /api/debug/explain (SSE) using the
 * Ollama Cloud model `glm-5.2:cloud`. Mirrors useStreamChat's flush cadence
 * so Markdown re-render doesn't run per byte.
 */
export function useExplainStream() {
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async (args: ExplainArgs, opts: StreamOptions) => {
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
      const res = await fetch("/api/debug/explain", {
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
          } catch (e) {
            if ((e as Error).message && !(e as Error).message.includes("JSON")) {
              throw e;
            }
          }
        }
      }
      if (rafId !== null) {
        clearTimeout(rafId);
        rafId = null;
      }
      flush();
      opts.onDone(full);
    } catch (err) {
      const msg = (err as Error).message ?? "Explain failed";
      opts.onError?.(msg);
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  return { streaming, send, stop };
}