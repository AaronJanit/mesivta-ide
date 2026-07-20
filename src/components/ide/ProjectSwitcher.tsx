"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, Folder, Trash2, Check, X } from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";

export function ProjectSwitcher() {
  const { projects, current, selectProject, createProject, renameProject, deleteProject } =
    useProjectStore();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  async function submitCreate() {
    const name = newName.trim();
    if (!name) return;
    await createProject(name);
    setNewName("");
    setCreating(false);
    setOpen(false);
  }

  async function submitRename() {
    if (!editingId) return;
    const name = editName.trim();
    if (name) await renameProject(editingId, name);
    setEditingId(null);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-foreground hover:bg-panel-2"
      >
        <Folder className="size-3.5 text-accent" />
        <span className="max-w-[140px] truncate">{current?.name ?? "No project"}</span>
        <ChevronDown className="size-3 text-muted" />
      </button>

      {open && (
        <div className="absolute left-0 top-7 z-50 w-64 rounded-md border border-border bg-panel shadow-pop">
          <div className="flex items-center justify-between border-b border-border px-2 py-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">
              Projects
            </span>
            <button
              onClick={() => setCreating(true)}
              className="rounded p-1 text-muted hover:bg-panel-2 hover:text-foreground"
              title="New project"
            >
              <Plus className="size-3.5" />
            </button>
          </div>

          <div className="max-h-72 overflow-auto py-1">
            {projects.length === 0 && !creating && (
              <div className="px-3 py-2 text-xs text-muted-2">No projects yet</div>
            )}
            {projects.map((p) => (
              <div
                key={p.id}
                className={`group flex items-center gap-1 px-1 py-0.5 hover:bg-panel-2 ${
                  current?.id === p.id ? "bg-panel-2" : ""
                }`}
              >
                {editingId === p.id ? (
                  <div className="flex flex-1 items-center gap-1 px-2">
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitRename();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 text-xs outline-none focus:border-accent"
                    />
                    <button onClick={submitRename} className="text-success hover:opacity-80">
                      <Check className="size-3" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-muted hover:text-foreground">
                      <X className="size-3" />
                    </button>
                  </div>
                ) : confirmDeleteId === p.id ? (
                  <div className="flex flex-1 items-center gap-1 px-2 py-0.5">
                    <span className="flex-1 truncate text-xs text-muted">Delete?</span>
                    <button
                      onClick={async () => {
                        await deleteProject(p.id);
                        setConfirmDeleteId(null);
                      }}
                      className="text-danger hover:opacity-80"
                      title="Confirm delete"
                    >
                      <Check className="size-3" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-muted hover:text-foreground"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        selectProject(p.id);
                        setOpen(false);
                      }}
                      onDoubleClick={() => {
                        setEditingId(p.id);
                        setEditName(p.name);
                      }}
                      className="flex-1 truncate px-2 py-1 text-left text-xs text-foreground"
                      title={p.name}
                    >
                      {p.name}
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(p.id);
                        setEditName(p.name);
                      }}
                      className="hidden p-1 text-muted hover:text-foreground group-hover:block"
                      title="Rename"
                    >
                      <span className="text-[10px]">✎</span>
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(p.id)}
                      className="hidden p-1 text-muted hover:text-danger group-hover:block"
                      title="Delete"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {creating && (
            <div className="flex items-center gap-1 border-t border-border px-2 py-1.5">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitCreate();
                  if (e.key === "Escape") setCreating(false);
                }}
                placeholder="Project name"
                className="flex-1 rounded border border-border bg-background px-1.5 py-1 text-xs outline-none focus:border-accent"
              />
              <button onClick={submitCreate} className="text-success hover:opacity-80">
                <Check className="size-3.5" />
              </button>
              <button onClick={() => setCreating(false)} className="text-muted hover:text-foreground">
                <X className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}