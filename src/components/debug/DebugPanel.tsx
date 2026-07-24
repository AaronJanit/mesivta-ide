"use client";

import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { CheckCircle2, AlertTriangle, RefreshCw, Bug, Loader2, BookOpen, Search } from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";
import { useFileStore } from "@/stores/useFileStore";
import { useEditorStore } from "@/stores/useEditorStore";
import { useDebugStore, type SyntaxIssue, type ScanResult } from "@/stores/useDebugStore";
import { useExplainStream } from "@/hooks/useExplainStream";
import { Markdown } from "@/components/ai/Markdown";
import { languageForFile } from "@/lib/languages";
import { cn } from "@/lib/cn";
import type { DebugLanguage } from "@/lib/debug/syntaxCheck";

interface DebugPanelProps {
  onClose: () => void;
}

const LANG_LABEL: Record<DebugLanguage, string> = {
  html: "HTML",
  css: "CSS",
  javascript: "JavaScript",
};

export function DebugPanel({ onClose }: DebugPanelProps) {
  const current = useProjectStore((s) => s.current);
  const open = useEditorStore((s) => s.open);

  // Scan state lives in the store so the ActivityBar badge can read it.
  // The background scan (`useBackgroundDebugScan` in Shell) keeps it fresh.
  const result = useDebugStore((s) => s.result);
  const loading = useDebugStore((s) => s.loading);
  const error = useDebugStore((s) => s.error);
  const autoOnTreeChange = useDebugStore((s) => s.autoOnTreeChange);
  const setResult = useDebugStore((s) => s.setResult);
  const setLoading = useDebugStore((s) => s.setLoading);
  const setError = useDebugStore((s) => s.setError);
  const setAutoOnTreeChange = useDebugStore((s) => s.setAutoOnTreeChange);
  const setProjectId = useDebugStore((s) => s.setProjectId);

  const { streaming, send: streamSend, stop: streamStop } = useExplainStream();
  const [explainFor, setExplainFor] = useState<SyntaxIssue | null>(null);
  const [explainText, setExplainText] = useState("");
  const [explainError, setExplainError] = useState<string | null>(null);

  const runCheck = useCallback(async () => {
    if (!current) return;
    setLoading(true);
    setError(null);
    setExplainFor(null);
    setExplainText("");
    setExplainError(null);
    streamStop();
    try {
      const res = await fetch(`/api/debug/check?projectId=${encodeURIComponent(current.id)}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = (await res.json().catch(() => ({}))) as ScanResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setResult(data);
      setProjectId(current.id);
    } catch (e) {
      setError((e as Error).message ?? "Scan failed");
      setResult(null);
      setProjectId(current.id);
    } finally {
      setLoading(false);
    }
  }, [current, streamStop, setLoading, setError, setResult, setProjectId]);

  const explain = useCallback(
    (issue: SyntaxIssue) => {
      setExplainFor(issue);
      setExplainText("");
      setExplainError(null);
      streamSend(
        {
          language: issue.language,
          filePath: issue.path,
          message: issue.message,
          excerpt: issue.excerpt,
          snippet: issue.snippet,
        },
        {
          onDelta: (full) => setExplainText(full),
          onDone: (full) => setExplainText(full),
          onError: (msg) => setExplainError(msg),
        },
      );
    },
    [streamSend],
  );

  const openFileAt = useCallback(
    (issue: SyntaxIssue) => {
      const node = useFileStore.getState().findNode(issue.fileId);
      if (!node) return;
      open({
        fileId: node.id,
        name: node.name,
        content: node.content ?? "",
        language: languageForFile(node.name),
        dirty: false,
      });
      onClose();
    },
    [open, onClose],
  );

  // Auto-explain the first issue as soon as scan results arrive.
  const autoExplainedRef = useRef(false);
  useEffect(() => {
    if (!result || result.issues.length === 0) {
      autoExplainedRef.current = false;
      return;
    }
    if (autoExplainedRef.current) return;
    autoExplainedRef.current = true;
    explain(result.issues[0]);
  }, [result, explain]);

  const issueCount = result?.issues.length ?? 0;
  const allOk = result !== null && issueCount === 0 && !error;

  const summary = useMemo(() => {
    if (!result) return null;
    const byLang: Record<string, number> = {};
    for (const i of result.issues) byLang[i.language] = (byLang[i.language] ?? 0) + 1;
    return { byLang, total: result.issues.length };
  }, [result]);

  return (
    <div className="flex h-full flex-col bg-editor">
      {/* Header */}
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-panel px-3">
        <Bug className="size-4 text-accent" />
        <span className="text-xs font-semibold uppercase tracking-wide text-foreground">Visual Code Debugger</span>
        <div className="flex-1" />
        <label className="flex items-center gap-1.5 text-[11px] text-muted-2 select-none" title="When on, scans every 3 seconds and on file changes. When off, only scans once per project.">
          <input
            type="checkbox"
            checked={autoOnTreeChange}
            onChange={(e) => setAutoOnTreeChange(e.target.checked)}
            className="size-3 accent-[hsl(var(--accent))]"
          />
          Auto-rescan (3s)
        </label>
        <button
          onClick={runCheck}
          disabled={loading || !current}
          className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted hover:bg-panel-2 hover:text-foreground disabled:opacity-50"
          title="Re-run syntax scan"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          <span>Re-scan</span>
        </button>
        <button
          onClick={onClose}
          className="rounded px-2 py-1 text-xs text-muted hover:bg-panel-2 hover:text-foreground"
          title="Close Debug view"
        >
          Close
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto px-4 py-4">
        {!current ? (
          <EmptyState text="Open a project to scan it for syntax errors." />
        ) : loading && result === null ? (
          <EmptyState text="Scanning project files…" spinner />
        ) : error ? (
          <div className="mx-auto max-w-2xl rounded-md border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="size-4" /> Scan failed
            </div>
            <p className="mt-1 text-danger/80">{error}</p>
            <button
              onClick={runCheck}
              className="mt-3 rounded border border-danger/40 px-2 py-1 text-xs hover:bg-danger/15"
            >
              Retry
            </button>
          </div>
        ) : allOk ? (
          <AllOk result={result!} />
        ) : result ? (
          <div className="mx-auto max-w-3xl space-y-4">
            {/* Summary bar */}
            <div className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
              <AlertTriangle className="size-4 text-warning" />
              <span className="text-foreground">
                Found <b className="text-warning">{issueCount}</b>{" "}
                {issueCount === 1 ? "issue" : "issues"} across{" "}
                <b>{result.checkedCount}</b>{" "}
                {result.checkedCount === 1 ? "file" : "files"}.
              </span>
              {summary &&
                Object.entries(summary.byLang).map(([lang, n]) => (
                  <span
                    key={lang}
                    className="ml-auto rounded bg-panel-2 px-1.5 py-0.5 text-[11px] text-muted"
                  >
                    {LANG_LABEL[lang as DebugLanguage]}: {n}
                  </span>
                ))}
            </div>

            {/* Issue cards */}
            {result.issues.map((issue, idx) => {
              const isExplaining = explainFor?.fileId === issue.fileId && explainFor?.line === issue.line;
              return (
                <IssueCard
                  key={`${issue.fileId}-${issue.line}-${idx}`}
                  issue={issue}
                  onOpen={() => openFileAt(issue)}
                  onExplain={() => explain(issue)}
                  isExplaining={isExplaining}
                  streaming={streaming && isExplaining}
                  explainText={isExplaining ? explainText : ""}
                  explainError={isExplaining ? explainError : null}
                  onStop={streamStop}
                />
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AllOk({ result }: { result: ScanResult }) {
  const current = useProjectStore((s) => s.current);
  const [enhancedText, setEnhancedText] = useState("");
  const [enhancedError, setEnhancedError] = useState<string | null>(null);
  const [enhancedRunning, setEnhancedRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const runEnhanced = useCallback(async () => {
    if (!current) return;
    setEnhancedRunning(true);
    setEnhancedText("");
    setEnhancedError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    let full = "";
    let rafId: number | null = null;
    let lastFlush = 0;
    const FLUSH_MS = 60;
    const flush = () => { rafId = null; setEnhancedText(full); lastFlush = Date.now(); };
    const schedule = () => {
      if (rafId !== null) return;
      const wait = Math.max(0, FLUSH_MS - (Date.now() - lastFlush));
      rafId = window.setTimeout(() => { rafId = null; flush(); }, wait) as unknown as number;
    };
    try {
      const res = await fetch("/api/debug/enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: current.id }),
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
            if (json.delta) { full += json.delta; schedule(); }
          } catch (e) {
            if ((e as Error).message && !(e as Error).message.includes("JSON")) throw e;
          }
        }
      }
      if (rafId !== null) { clearTimeout(rafId); rafId = null; }
      flush();
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setEnhancedError((err as Error).message ?? "Enhanced debug failed");
    } finally {
      setEnhancedRunning(false);
      abortRef.current = null;
    }
  }, [current]);

  const stopEnhanced = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setEnhancedRunning(false);
  }, []);

  const hasReport = enhancedText || enhancedError || (enhancedRunning && enhancedText);

  return (
    <div className={`flex h-full flex-col ${hasReport ? "justify-start" : "items-center justify-center"} gap-3 ${hasReport ? "" : "text-center"}`}>
      {/* Success summary — shrinks to a compact header when a report is visible */}
      <div className={`flex shrink-0 flex-col gap-2 ${hasReport ? "flex-row items-center gap-3 border-b border-border px-4 py-2 text-left" : "items-center"}`}>
        {hasReport ? (
          <CheckCircle2 className="size-5 shrink-0 text-success" strokeWidth={2} />
        ) : (
          <CheckCircle2 className="size-14 text-success" strokeWidth={1.5} />
        )}
        <div className={hasReport ? "min-w-0" : ""}>
          {hasReport ? (
            <span className="text-sm font-medium text-foreground">All checks passed — enhanced debug report below</span>
          ) : (
            <>
              <div className="text-base font-semibold text-foreground">All checks passed</div>
              <p className="max-w-sm text-sm text-muted">
                No HTML, CSS or JavaScript syntax errors were found across{" "}
                <b className="text-foreground">{result.checkedCount}</b>{" "}
                {result.checkedCount === 1 ? "file" : "files"} in this project. Keep up the good work!
              </p>
            </>
          )}
        </div>
      </div>

      {/* Enhanced debug section — fills remaining height when a report exists */}
      <div className={`flex flex-col gap-3 ${hasReport ? "min-h-0 flex-1 px-4 pb-4" : "mt-6 w-full max-w-md items-center"}`}>
        {/* Divider + trigger button */}
        {!hasReport && (
          <div className="flex w-full flex-col items-center gap-4">
            <div className="flex w-full items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] uppercase tracking-wide text-muted-2">Something still not working?</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <button
              onClick={runEnhanced}
              disabled={!current}
              className="group flex w-full items-center gap-3 rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-left transition-all hover:border-accent/50 hover:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/20 transition-colors group-hover:bg-accent/30">
                <Search className="size-4.5 text-accent" strokeWidth={2} />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-semibold text-foreground">Run Enhanced Debug</span>
                <span className="text-xs text-muted">Get deeper diagnostics — an AI reviews all your files for logic errors, broken references, and integration issues.</span>
              </span>
            </button>
          </div>
        )}
        {enhancedRunning ? (
          <button
            onClick={stopEnhanced}
            className={`flex shrink-0 items-center gap-2 rounded-lg border border-border bg-panel px-3 py-2 text-xs text-muted transition-colors hover:bg-panel-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${hasReport ? "self-start" : ""}`}
          >
            <Loader2 className="size-3.5 animate-spin" />
            Stop
          </button>
        ) : null}

        {/* Enhanced debug results — scrollable, fills the page */}
        {enhancedRunning && !enhancedText && !enhancedError && (
          <div className={hasReport ? "min-h-0 flex-1" : ""}>
            <LoadingAnimation />
          </div>
        )}
        {enhancedError && (
          <div className={`rounded-md border border-danger/40 bg-danger/10 p-3 text-left text-sm text-danger ${hasReport ? "min-h-0 flex-1 overflow-auto" : "w-full max-w-2xl"}`}>
            {enhancedError}
          </div>
        )}
        {enhancedText && (
          <div className={`overflow-auto rounded-lg border border-border bg-panel p-4 text-left ${hasReport ? "min-h-0 flex-1" : "w-full max-w-2xl"}`}>
            <div className="mb-3 flex shrink-0 items-center gap-2 border-b border-border pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-2">
              <Search className="size-3.5 text-accent" strokeWidth={2} />
              Enhanced Debug Report
              {enhancedRunning && <Loader2 className="size-3 animate-spin text-accent" />}
            </div>
            <Markdown content={enhancedText} />
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text, spinner }: { text: string; spinner?: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-2">
      {spinner ? <Loader2 className="size-5 animate-spin" /> : <Bug className="size-5 opacity-50" />}
      <span>{text}</span>
    </div>
  );
}

function IssueCard({
  issue,
  onOpen,
  onExplain,
  isExplaining,
  streaming,
  explainText,
  explainError,
  onStop,
}: {
  issue: SyntaxIssue;
  onOpen: () => void;
  onExplain: () => void;
  isExplaining: boolean;
  streaming: boolean;
  explainText: string;
  explainError: string | null;
  onStop: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-panel">
      {/* Issue header */}
      <div className="flex items-start gap-2 border-b border-border bg-panel-2/40 px-3 py-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded bg-warning/15 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-warning">
              {LANG_LABEL[issue.language]}
            </span>
            <button
              onClick={onOpen}
              className="truncate font-medium text-foreground hover:text-accent hover:underline"
              title={`Open ${issue.path}`}
            >
              {issue.path}
            </button>
            <span className="shrink-0 text-muted-2">
              :{issue.line}:{issue.column}
            </span>
          </div>
          <p className="mt-1 text-sm text-foreground/90">{issue.message}</p>
        </div>
      </div>

      {/* Code snippet */}
      <pre className="overflow-x-auto bg-editor px-3 py-2 font-mono text-[12px] leading-relaxed text-foreground/90">
        {issue.snippet}
      </pre>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-border px-3 py-2">
        <button
          onClick={onOpen}
          className="rounded border border-border px-2 py-1 text-xs text-muted hover:bg-panel-2 hover:text-foreground"
        >
          Open file
        </button>
        {streaming ? (
          <button
            onClick={onStop}
            className="flex items-center gap-1.5 rounded border border-border px-2 py-1 text-xs text-muted hover:bg-panel-2 hover:text-foreground"
          >
            <Loader2 className="size-3 animate-spin" />
            Stop
          </button>
        ) : (
          <button
            onClick={onExplain}
            disabled={streaming}
            className={cn(
              "flex items-center gap-1.5 rounded px-2 py-1 text-xs",
              "bg-accent/15 text-accent hover:bg-accent/25 disabled:opacity-50",
            )}
          >
            <BookOpen className="size-3.5" />
            {isExplaining && explainText ? "Explain again" : "Explain this error"}
          </button>
        )}
      </div>

      {/* Explanation */}
      {isExplaining && (explainText || explainError || streaming) && (
        <div className="border-t border-border bg-panel px-3 py-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-2">
            <BookOpen className="size-3.5" />
            Explanation (Ollama · glm-5.2:cloud)
            {streaming && <Loader2 className="size-3 animate-spin" />}
          </div>
          {explainError ? (
            <div className="rounded border border-danger/40 bg-danger/10 p-2 text-sm text-danger">
              {explainError}
            </div>
          ) : explainText ? (
            <Markdown content={explainText} />
          ) : streaming ? (
            <LoadingAnimation />
          ) : null}
        </div>
      )}
    </div>
  );
}

function LoadingAnimation() {
  return (
    <div className="flex flex-col gap-3 py-2">
      {/* Animated label */}
      <div className="flex items-center gap-2 text-[11px] text-muted-2">
        <span className="flex gap-1">
          <span className="size-1.5 animate-bounce rounded-full bg-accent [animation-delay:0ms]" />
          <span className="size-1.5 animate-bounce rounded-full bg-accent [animation-delay:150ms]" />
          <span className="size-1.5 animate-bounce rounded-full bg-accent [animation-delay:300ms]" />
        </span>
        <span className="animate-pulse">Asking Ollama for an explanation…</span>
      </div>
      {/* Skeleton lines */}
      <div className="space-y-2">
        <div className="h-3 animate-pulse rounded bg-panel-2" style={{ width: "85%" }} />
        <div className="h-3 animate-pulse rounded bg-panel-2" style={{ width: "92%" }} />
        <div className="h-3 animate-pulse rounded bg-panel-2" style={{ width: "70%" }} />
        <div className="h-3 animate-pulse rounded bg-panel-2" style={{ width: "88%" }} />
        <div className="h-3 animate-pulse rounded bg-panel-2" style={{ width: "55%" }} />
      </div>
    </div>
  );
}