"use client";

import { useCallback, useRef, useState } from "react";
import { unzipSync, strFromU8 } from "fflate";
import {
  Upload,
  X,
  FileArchive,
  FolderPlus,
  FolderInput,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useProjectStore } from "@/stores/useProjectStore";
import { useFileStore } from "@/stores/useFileStore";
import type { FileDTO } from "@/lib/api/client";

type Mode = "new" | "existing";
type Stage = "pick" | "review" | "importing" | "done";

interface ZipEntry {
  path: string;
  content: string;
}

const MAX_ZIP_BYTES = 30 * 1024 * 1024; // 30 MB
const MAX_FILE_BYTES = 2 * 1024 * 1024; // per decoded file

const BINARY_EXT = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "ico", "bmp", "avif",
  "woff", "woff2", "ttf", "otf", "eot",
  "zip", "gz", "tar", "rar", "7z",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "exe", "dll", "so", "dylib", "bin", "class", "jar",
  "mp3", "mp4", "wav", "ogg", "webm", "mov", "avi",
]);

function extOf(path: string): string {
  return path.split(".").pop()?.toLowerCase() ?? "";
}

/** Decode a zip entry as text; null for binary/junk files. */
function decodeEntry(name: string, data: Uint8Array): string | null {
  const base = name.split("/").pop() ?? "";
  if (base.startsWith(".") || name.includes("__MACOSX")) return null;
  if (BINARY_EXT.has(extOf(name))) return null;
  if (data.byteLength > MAX_FILE_BYTES) return null;
  const text = strFromU8(data);
  // Heuristic: reject binary-looking content
  const sample = text.slice(0, 2000);
  let bad = 0;
  for (const ch of sample) {
    const c = ch.charCodeAt(0);
    if (c < 9 || (c > 13 && c < 32)) bad++;
  }
  if (sample.length > 0 && bad / sample.length > 0.1) return null;
  return text;
}

interface ParsedZip {
  entries: ZipEntry[];
  skippedBinary: number;
  rootStripped: string | null;
  folderCount: number;
}

/** Parse a .zip into text entries, stripping one shared root folder + junk. */
function parseZip(buffer: ArrayBuffer): ParsedZip {
  const files = unzipSync(new Uint8Array(buffer), {
    filter: (file) => !file.name.endsWith("/"),
  });

  const entries: ZipEntry[] = [];
  let skippedBinary = 0;
  for (const [name, data] of Object.entries(files)) {
    const clean = name.replace(/\\/g, "/").replace(/^\.\//, "");
    const base = clean.split("/").pop() ?? "";
    if (base.startsWith(".") || clean.includes("__MACOSX")) continue;
    const text = decodeEntry(clean, data);
    if (text === null) {
      skippedBinary++;
      continue;
    }
    entries.push({ path: clean, content: text });
  }

  // Strip a single shared top-level folder (common when zipping a directory)
  let rootStripped: string | null = null;
  if (entries.length > 0) {
    const firstTop = entries[0].path.split("/")[0];
    const allShare = entries.every((e) => e.path.includes("/") && e.path.split("/")[0] === firstTop);
    if (allShare) {
      rootStripped = firstTop;
      for (const e of entries) e.path = e.path.slice(firstTop.length + 1);
    }
  }

  const folders = new Set<string>();
  for (const e of entries) {
    const parts = e.path.split("/");
    parts.pop();
    let cur = "";
    for (const p of parts) {
      cur = cur ? `${cur}/${p}` : p;
      folders.add(cur);
    }
  }

  return { entries, skippedBinary, rootStripped, folderCount: folders.size };
}

/** Find a child by name in the tree; null if absent. */
function childByName(nodes: FileDTO[], folderId: string | null, name: string): FileDTO | null {
  const list = folderId
    ? (flatten(nodes).find((n) => n.id === folderId)?.children ?? [])
    : nodes;
  return list.find((n) => n.name === name) ?? null;
}

function flatten(nodes: FileDTO[], acc: FileDTO[] = []): FileDTO[] {
  for (const n of nodes) {
    acc.push(n);
    if (n.children) flatten(n.children, acc);
  }
  return acc;
}

interface ZipUploadModalProps {
  onClose: () => void;
}

/**
 * Upload-a-ZIP dialog: extract the archive client-side (fflate) and import it
 * as a brand-new project or into any existing project. Folders are recreated
 * (existing same-name folders are reused, same-name files overwritten), so
 * re-importing is idempotent.
 */
export function ZipUploadModal({ onClose }: ZipUploadModalProps) {
  const projects = useProjectStore((s) => s.projects);
  const createProject = useProjectStore((s) => s.createProject);
  const selectProject = useProjectStore((s) => s.selectProject);
  const loadFiles = useFileStore((s) => s.loadFiles);
  const createFile = useFileStore((s) => s.createFile);
  const updateFile = useFileStore((s) => s.updateFile);

  const [stage, setStage] = useState<Stage>("pick");
  const [mode, setMode] = useState<Mode>("new");
  const [targetProjectId, setTargetProjectId] = useState<string>(projects[0]?.id ?? "");
  const [newProjectName, setNewProjectName] = useState("");
  const [zipLabel, setZipLabel] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedZip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      if (!/\.zip$/i.test(file.name)) {
        setError("Please choose a .zip file.");
        return;
      }
      if (file.size > MAX_ZIP_BYTES) {
        setError("That archive is too large (max 30 MB).");
        return;
      }
      try {
        setZipLabel(file.name);
        const fallback =
          file.name.replace(/\.zip$/i, "").replace(/[-_]+/g, " ").trim() || "Imported project";
        setNewProjectName(fallback.charAt(0).toUpperCase() + fallback.slice(1));
        const buffer = await file.arrayBuffer();
        const result = parseZip(buffer);
        if (result.entries.length === 0) {
          setError("No importable text files found in that archive.");
          return;
        }
        setParsed(result);
        setStage("review");
      } catch {
        setError("Could not read that archive. Is it a valid .zip?");
      }
    },
    [],
  );

  const importZip = useCallback(async () => {
    if (!parsed || parsed.entries.length === 0) return;
    setStage("importing");
    setError(null);

    try {
      let projectId: string;
      if (mode === "new") {
        const project = await createProject(newProjectName.trim() || "Imported project");
        projectId = project.id;
      } else {
        if (!targetProjectId) {
          setError("Choose a project to import into.");
          setStage("review");
          return;
        }
        projectId = targetProjectId;
      }

      // Load the target tree first so existing folders/files can be reused.
      await loadFiles(projectId);
      const folderIds = new Map<string, string>();
      const seedFolders = (nodes: FileDTO[], prefix: string) => {
        for (const n of nodes) {
          if (n.type !== "folder") continue;
          const p = prefix ? `${prefix}/${n.name}` : n.name;
          folderIds.set(p, n.id);
          if (n.children) seedFolders(n.children, p);
        }
      };
      seedFolders(useFileStore.getState().tree, "");

      const total = parsed.entries.length;
      setProgress({ done: 0, total });
      let done = 0;
      let created = 0;
      let skipped = 0;
      const depths = [...new Set(parsed.entries.map((e) => e.path.split("/").length))].sort((a, b) => a - b);

      for (const depth of depths) {
        const batch = parsed.entries.filter((e) => e.path.split("/").length === depth);
        for (const entry of batch) {
          const parts = entry.path.split("/");
          const name = parts.pop()!;
          const folderId = parts.length === 0 ? null : folderIds.get(parts.join("/")) ?? null;

          // Create any missing ancestor folders (defensive; usually pre-seeded)
          let cur = "";
          for (const p of parts) {
            cur = cur ? `${cur}/${p}` : p;
            if (!folderIds.has(cur)) {
              const parentOfCur = cur.includes("/") ? folderIds.get(cur.split("/").slice(0, -1).join("/")) ?? null : null;
              const node = await createFile(projectId, parentOfCur, p, "folder");
              folderIds.set(cur, node.id);
            }
          }

          // Folder entry vs file entry: content always present for files here.
          const existing = childByName(useFileStore.getState().tree, folderId, name);
          if (existing && existing.type === "file") {
            await updateFile(existing.id, { content: entry.content });
            skipped++;
          } else {
            await createFile(projectId, folderId, name, "file", entry.content);
            created++;
          }
          done++;
          setProgress({ done, total });
        }
      }

      setResult({ created, skipped });
      selectProject(projectId);
      await loadFiles(projectId);
      setStage("done");
    } catch (e) {
      setError((e as Error).message || "Import failed");
      setStage("review");
    }
  }, [mode, targetProjectId, parsed, createProject, selectProject, loadFiles, createFile, updateFile]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Upload a ZIP archive"
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
            <h2 className="text-sm font-semibold">Upload ZIP</h2>
            <p className="text-[11px] text-muted-2">
              {stage === "pick" && "Import a folder of files as a project"}
              {stage === "review" && zipLabel}
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
          {error && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 p-3 text-xs text-foreground">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-danger" />
              {error}
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
                const file = e.dataTransfer.files?.[0];
                if (file) void handleFile(file);
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
              <p className="text-xs font-medium text-foreground">Drop a .zip here, or click to browse</p>
              <p className="text-[11px] text-muted-2">Max 30 MB · extracted in your browser</p>
              <input
                ref={inputRef}
                type="file"
                accept=".zip,application/zip"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                  e.target.value = "";
                }}
              />
            </div>
          )}

          {stage === "review" && parsed && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-panel-2/50 p-3 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-success" />
                  <span className="font-medium text-foreground">
                    {parsed.entries.length} file{parsed.entries.length === 1 ? "" : "s"} ready
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  {parsed.folderCount} folder{parsed.folderCount === 1 ? "" : "s"}
                  {parsed.skippedBinary > 0 &&
                    ` · ${parsed.skippedBinary} binary file${parsed.skippedBinary === 1 ? "" : "s"} skipped`}
                </p>
                <ul className="mt-2 max-h-24 space-y-0.5 overflow-y-auto text-[11px] text-muted-2">
                  {parsed.entries.slice(0, 6).map((e) => (
                    <li key={e.path} className="truncate">
                      {e.path}
                    </li>
                  ))}
                  {parsed.entries.length > 6 && <li>… and {parsed.entries.length - 6} more</li>}
                </ul>
              </div>

              {/* Destination */}
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Import into
                </p>
                <div className="flex items-center gap-0.5 rounded-lg border border-border bg-background/60 p-0.5">
                  <ModeButton active={mode === "new"} onClick={() => setMode("new")} icon={FolderPlus} label="New project" />
                  <ModeButton
                    active={mode === "existing"}
                    onClick={() => setMode("existing")}
                    icon={FolderInput}
                    label="Existing"
                  />
                </div>
              </div>

              {mode === "new" ? (
                <label className="block text-xs text-muted">
                  Project name
                  <input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="mt-1.5 w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                    placeholder="e.g. My site"
                  />
                </label>
              ) : (
                <label className="block text-xs text-muted">
                  Choose project
                  <select
                    value={targetProjectId}
                    onChange={(e) => setTargetProjectId(e.target.value)}
                    className="mt-1.5 w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                  >
                    {projects.length === 0 && <option value="">No projects yet</option>}
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStage("pick");
                    setParsed(null);
                    setZipLabel(null);
                    setError(null);
                  }}
                  className="rounded border border-border px-3 py-1.5 text-xs text-muted transition hover:text-foreground"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => void importZip()}
                  disabled={mode === "existing" && !targetProjectId}
                  className="inline-flex items-center gap-1.5 rounded bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-fg transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                >
                  <Upload className="size-3.5" />
                  Import {parsed.entries.length} file{parsed.entries.length === 1 ? "" : "s"}
                </button>
              </div>
            </div>
          )}

          {stage === "importing" && (
            <div className="space-y-3 py-2">
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

          {stage === "done" && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-xs font-medium text-success">
                <CheckCircle2 className="size-4" />
                Imported {result.created} item{result.created === 1 ? "" : "s"}
                {result.skipped > 0 ? ` · ${result.skipped} updated` : ""}
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

function ModeButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-all duration-150 focus-visible:outline focus-visible:outline-1.5 focus-visible:outline-accent",
        active
          ? "bg-accent-soft text-foreground shadow-[inset_0_0_0_1px_hsl(var(--accent)/0.35)]"
          : "text-muted hover:bg-panel-2 hover:text-foreground",
      )}
    >
      <Icon className={cn("size-3.5", active ? "text-accent" : "")} />
      {label}
    </button>
  );
}