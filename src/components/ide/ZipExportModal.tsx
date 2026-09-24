"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download, FileArchive, Loader2, X } from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";
import { useFileStore } from "@/stores/useFileStore";
import { buildProjectZip, downloadBlob } from "@/lib/exportZip";

interface ZipExportModalProps {
  onClose: () => void;
}

/**
 * Download-the-project dialog: zips the current project's file tree in the
 * browser (fflate) and triggers a download. Styled to match the upload modal.
 */
export function ZipExportModal({ onClose }: ZipExportModalProps) {
  const current = useProjectStore((s) => s.current);
  const tree = useFileStore((s) => s.tree);

  const [stage, setStage] = useState<"ready" | "zipping" | "done">("ready");
  const [result, setResult] = useState<{ fileName: string; fileCount: number; folderCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isEmpty = tree.length === 0;

  // Escape to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const doExport = () => {
    if (!current) return;
    setStage("zipping");
    setError(null);
    try {
      // Let the spinner paint before the (synchronous) zip work.
      setTimeout(() => {
        try {
          const out = buildProjectZip(tree, current.name);
          downloadBlob(out.blob, out.fileName);
          setResult({ fileName: out.fileName, fileCount: out.fileCount, folderCount: out.folderCount });
          setStage("done");
        } catch (e) {
          setError((e as Error).message || "Could not create the archive");
          setStage("ready");
        }
      }, 50);
    } catch (e) {
      setError((e as Error).message || "Could not create the archive");
      setStage("ready");
    }
  };

  const fileCount = (function count(nodes: typeof tree): number {
    let n = 0;
    for (const node of nodes) {
      if (node.type === "file") n++;
      if (node.children) n += count(node.children);
    }
    return n;
  })(tree);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Download project as ZIP"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-panel shadow-pop">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent)/0.55)] to-transparent"
        />

        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
          <span className="rounded-md bg-accent-soft p-2 text-accent ring-1 ring-[hsl(var(--accent)/0.25)]">
            {stage === "done" ? <CheckCircle2 className="size-4" /> : <FileArchive className="size-4" />}
          </span>
          <div className="flex-1">
            <h2 className="text-sm font-semibold">Download ZIP</h2>
            <p className="text-[11px] text-muted-2">
              {stage === "done" ? "Download started" : `Export “${current?.name ?? "project"}”`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className="rounded p-1.5 text-muted transition hover:bg-panel-2 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          {error && (
            <div className="mb-3 rounded-lg border border-danger/40 bg-danger/10 p-3 text-xs text-foreground">
              {error}
            </div>
          )}

          {stage !== "done" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-panel-2/50 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{current?.name ?? "No project"}</span>
                  <span className="tabular-nums text-muted-2">
                    {fileCount} file{fileCount === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  Everything in this project will be zipped, including folders.
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded border border-border px-3 py-1.5 text-xs text-muted transition hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={doExport}
                  disabled={!current || fileCount === 0 || stage === "zipping"}
                  className="inline-flex items-center gap-1.5 rounded bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-fg transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                >
                  {stage === "zipping" ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Zipping…
                    </>
                  ) : (
                    <>
                      <Download className="size-3.5" />
                      Download ZIP
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {stage === "done" && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-xs font-medium text-success">
                <CheckCircle2 className="size-4" />
                Saved {result.fileName} — {result.fileCount} file{result.fileCount === 1 ? "" : "s"}
                {result.folderCount > 0 ? ` in ${result.folderCount} folder${result.folderCount === 1 ? "" : "s"}` : ""}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-fg transition hover:brightness-110 active:scale-[0.98]"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}