"use client";

import { useCallback, useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, RefreshCw, Bug, Loader2, BookOpen } from "lucide-react";
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
        <label className="flex items-center gap-1.5 text-[11px] text-muted-2 select-none">
          <input
            type="checkbox"
            checked={autoOnTreeChange}
            onChange={(e) => setAutoOnTreeChange(e.target.checked)}
            className="size-3 accent-[hsl(var(--accent))]"
          />
          Auto-rescan on change
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
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <CheckCircle2 className="size-14 text-success" strokeWidth={1.5} />
      <div className="text-base font-semibold text-foreground">All checks passed</div>
      <p className="max-w-sm text-sm text-muted">
        No HTML, CSS or JavaScript syntax errors were found across{" "}
        <b className="text-foreground">{result.checkedCount}</b>{" "}
        {result.checkedCount === 1 ? "file" : "files"} in this project. Keep up the good work!
      </p>
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
            <div className="text-xs text-muted-2">Thinking…</div>
          ) : null}
        </div>
      )}
    </div>
  );
}