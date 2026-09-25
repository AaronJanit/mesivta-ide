"use client";

import { useCallback, useRef, useState } from "react";
import {
  Upload,
  X,
  FileUp,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  File as FileIcon,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useProjectStore } from "@/stores/useProjectStore";
import { useFileStore } from "@/stores/useFileStore";

type Stage = "pick" | "review" | "importing" | "done";

interface PickedFile {
  file: File;
  name: string;
}

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB per file
const MAX_FILES = 50;

/** Extensions we accept as "coding files". */
const ALLOWED_EXT = new Set([
  "html", "htm", "css", "scss", "less", "js", "mjs", "cjs", "jsx",
  "ts", "tsx", "json", "md", "mdx", "txt", "svg", "xml", "yml", "yaml",
  "py", "rb", "go", "rs", "java", "c", "h", "cpp", "hpp", "cs", "php", "sql", "sh",
]);

function extOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function isAllowed(name: string): boolean {
  return ALLOWED_EXT.has(extOf(name));
}

function sanitizeName(name: string): string {
  // Strip path components (some browsers may include them) and illegal chars.
  const base = name.split(/[\\/]/).pop() ?? name;
  return base.replace(/[<>:"|?*\u0000-\u001F]/g, "").trim() || "untitled.txt";
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsText(file);
  });
}

interface FileUploadModalProps {
  onClose: () => void;
}

/**
 * Upload-file dialog: add one or more coding files to the CURRENT project.
 * Client-side only — reads files with FileReader and saves them through the
 * existing file store (same path as creating a file in the editor).
 */
export function FileUploadModal({ onClose }: FileUploadModalProps) {
  const current = useProjectStore((s) => s.current);
  const createFile = useFileStore((s) => s.createFile);
  const findNode = useFileStore((s) => s.findNode);

  const [stage, setStage] = useState<Stage>("pick");
  const [picked, setPicked] = useState<PickedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [imported, setImported] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      setError(null);
      const incoming = Array.from(files);
      if (incoming.length === 0) return;

      const accepted: PickedFile[] = [];
      const problems: string[] = [];
      setPicked((prev) => {
        const seen = new Set(prev.map((p) => p.name));
        for (const file of incoming) {
          const name = sanitizeName(file.name);
          if (!isAllowed(name)) {
            problems.push(`${name} — unsupported file type`);
            continue;
          }
          if (file.size > MAX_FILE_BYTES) {
            problems.push(`${name} — too large (max 2 MB)`);
            continue;
          }
          if (seen.has(name)) {
            problems.push(`${name} — already added`);
            continue;
          }
          seen.add(name);
          accepted.push({ file, name });
        }
        const combined = [...prev, ...accepted];
        if (combined.length > MAX_FILES) problems.push(`Max ${MAX_FILES} files per upload`);
        return combined.slice(0, MAX_FILES);
      });

      if (problems.length > 0) setError(problems.join(" · "));
      else setError(null);
    },
    [],
  );

  const removeAt = (index: number) => {
    setPicked((prev) => prev.filter((_, i) => i !== index));
  };

  const doImport = async () => {
    if (!current || picked.length === 0) return;
    setStage("importing");
    setProgress({ done: 0, total: picked.length });
    let ok = 0;

    try {
      for (const item of picked) {
        const content = await readAsText(item.file);
        const existing = findNode(item.name); // top-level lookup by id won't work; search tree by name
        void existing;
        // Overwrite if a file with the same name already exists at the root.
        const existingNode = useFileStore.getState().tree.find((n) => n.type === "file" && n.name === item.name);
        if (existingNode) {
          await useFileStore.getState().updateFile(existingNode.id, { content });
        } else {
          await createFile(current.id, null, item.name, "file", content);
        }
        ok++;
        setProgress((p) => ({ ...p, done: p.done + 1 }));
      }
      setImported(ok);
      setStage("done");
    } catch (e) {
      setError((e as Error).message || "Import failed");
      setStage("review");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Upload files"
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
            {stage === "done" ? <CheckCircle2 className="size-4" /> : <Upload className="size-4" />}
          </span>
          <div className="flex-1">
            <h2 className="text-sm font-semibold">Upload files</h2>
            <p className="text-[11px] text-muted-2">
              {stage === "pick" && `Add coding files to “${current?.name ?? "project"}”`}
              {stage === "review" && `${picked.length} file${picked.length === 1 ? "" : "s"} selected`}
              {stage === "importing" && "Importing…"}
              {stage === "done" && "Import complete"}
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
          {!current && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 p-3 text-xs text-foreground">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-danger" />
              Create or select a project first.
            </div>
          )}

          {error && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-foreground">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
              <span className="min-w-0 flex-1">{error}</span>
            </div>
          )}

          {stage === "pick" && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
              }}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center transition",
                dragOver
                  ? "border-accent bg-accent-soft/60"
                  : "border-border bg-background/50 hover:border-accent/60 hover:bg-panel-2/50",
              )}
            >
              <span className="rounded-full bg-accent-soft p-3 text-accent ring-1 ring-[hsl(var(--accent)/0.25)]">
                <Upload className="size-5" />
              </span>
              <p className="text-xs font-medium text-foreground">Drop files here, or click to browse</p>
              <p className="text-[11px] text-muted-2">
                HTML · CSS · JS · JSON · Markdown and more · max 2 MB each
              </p>
              <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (picked.length > 0) setStage("review");
                }}
                disabled={picked.length === 0}
                className="mt-2 inline-flex items-center gap-1.5 rounded bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-fg transition hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
              >
                Continue with {picked.length} file{picked.length === 1 ? "" : "s"}
              </button>
            </div>
          )}

          {(stage === "review" || stage === "importing" || stage === "done") && (
            <div className="space-y-4">
              <ul className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border bg-panel-2/50 p-2">
                {picked.map((item, i) => (
                  <li
                    key={item.name}
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-foreground odd:bg-background/40"
                  >
                    <FileIcon className="size-3.5 shrink-0 text-accent" />
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    <span className="tabular-nums text-[11px] text-muted-2">
                      {(item.file.size / 1024).toFixed(1)} KB
                    </span>
                    {stage === "review" && (
                      <button
                        type="button"
                        onClick={() => removeAt(i)}
                        aria-label={`Remove ${item.name}`}
                        title="Remove"
                        className="rounded p-0.5 text-muted transition hover:bg-panel-2 hover:text-danger"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              {stage === "importing" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <Loader2 className="size-4 animate-spin text-accent" />
                    Importing file {progress.done} of {progress.total}…
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--accent)/0.7)] to-[hsl(var(--accent))] transition-all duration-300"
                      style={{
                        width: `${progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {stage === "done" && (
                <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-xs font-medium text-success">
                  <CheckCircle2 className="size-4" />
                  Added {imported} file{imported === 1 ? "" : "s"} to {current?.name}
                </div>
              )}

              <div className="flex justify-end gap-2">
                {stage === "review" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setStage("pick")}
                      className="rounded border border-border px-3 py-1.5 text-xs text-muted transition hover:text-foreground"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => void doImport()}
                      className="inline-flex items-center gap-1.5 rounded bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-fg transition hover:brightness-110 active:scale-[0.98]"
                    >
                      <Upload className="size-3.5" />
                      Upload {picked.length} file{picked.length === 1 ? "" : "s"}
                    </button>
                  </>
                )}
                {stage === "done" && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-fg transition hover:brightness-110 active:scale-[0.98]"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}