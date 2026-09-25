"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, FileText, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { FileDTO } from "@/lib/api/client";

interface FileContextModalProps {
  open: boolean;
  tree: FileDTO[];
  /** File ids already attached (shown but not re-selectable). */
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
  onClose: () => void;
}

/** Flatten a file tree to files only, keeping their folder path. */
function flattenFiles(nodes: FileDTO[], prefix = "", acc: { node: FileDTO; path: string }[] = []) {
  for (const n of nodes) {
    const path = prefix ? `${prefix}/${n.name}` : n.name;
    if (n.type === "folder") {
      if (n.children) flattenFiles(n.children, path, acc);
    } else {
      acc.push({ node: n, path });
    }
  }
  return acc;
}

/**
 * Modal listing every file in the project; the user picks one or more to
 * attach as context to the next AI prompt.
 */
export function FileContextModal({ open, tree, selectedIds, onConfirm, onClose }: FileContextModalProps) {
  const [picked, setPicked] = useState<Set<string>>(new Set(selectedIds));
  const [search, setSearch] = useState("");

  // Reset local picks each time the modal opens.
  useEffect(() => {
    if (open) {
      setPicked(new Set(selectedIds));
      setSearch("");
    }
  }, [open, selectedIds]);

  const files = useMemo(() => flattenFiles(tree), [tree]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) => f.path.toLowerCase().includes(q));
  }, [files, search]);

  if (!open) return null;

  const toggle = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirm = () => {
    onConfirm(Array.from(picked));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Attach files as context"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-sm overflow-hidden rounded-xl border border-border bg-panel shadow-pop">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent)/0.55)] to-transparent"
        />

        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <span className="rounded-md bg-accent-soft p-1.5 text-accent ring-1 ring-[hsl(var(--accent)/0.25)]">
            <FileText className="size-4" />
          </span>
          <div className="flex-1">
            <h2 className="text-sm font-semibold">Attach files</h2>
            <p className="text-[11px] text-muted-2">Sent to the AI with your next message</p>
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

        {/* Search */}
        <div className="px-4 pt-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 focus-within:border-accent">
            <Search className="size-3.5 shrink-0 text-muted-2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files…"
              className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-2"
            />
          </div>
        </div>

        {/* File list */}
        <div className="max-h-72 overflow-y-auto px-2 py-2">
          {filtered.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-muted-2">
              {files.length === 0 ? "This project has no files yet." : "No files match that search."}
            </p>
          )}
          {filtered.map(({ node, path }) => {
            const isPicked = picked.has(node.id);
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => toggle(node.id)}
                aria-pressed={isPicked}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition",
                  isPicked ? "bg-accent-soft/70 text-foreground" : "text-muted hover:bg-panel-2 hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border transition",
                    isPicked ? "border-accent bg-accent text-accent-fg" : "border-border bg-background",
                  )}
                >
                  {isPicked && <Check className="size-3" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{node.name}</span>
                  <span className="block truncate text-[10px] text-muted-2">
                    {path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "root"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
          <span className="text-[11px] text-muted-2">
            {picked.size} file{picked.size === 1 ? "" : "s"} selected
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-border px-3 py-1.5 text-xs text-muted transition hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={picked.size === 0}
              className="rounded bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-fg transition hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
            >
              Attach {picked.size > 0 ? picked.size : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}