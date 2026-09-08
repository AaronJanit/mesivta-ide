"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { FilePlus, FolderPlus, RefreshCw, Upload, ChevronDown, ChevronRight, Pencil, Trash2, Check, X } from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";
import { useFileStore } from "@/stores/useFileStore";
import { useEditorStore } from "@/stores/useEditorStore";
import { languageForFile } from "@/lib/languages";
import { iconForFile } from "@/lib/fileIcons";
import type { FileDTO } from "@/lib/api/client";
import { ContextMenu, type ContextMenuState } from "./ContextMenu";

interface CreateInputState {
  parentFolderId: string | null;
  parentName: string;
  type: "file" | "folder";
  name: string;
}

export function FileTreePanel() {
  const current = useProjectStore((s) => s.current);
  const { tree, loading, loadFiles, createFile, updateFile, deleteFile } = useFileStore();
  const open = useEditorStore((s) => s.open);
  const activeFileId = useEditorStore((s) => s.activeFileId);
  const [creating, setCreating] = useState<CreateInputState | null>(null);
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const createInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => current && loadFiles(current.id), [current, loadFiles]);

  function openFile(data: FileDTO) {
    open({
      fileId: data.id,
      name: data.name,
      content: data.content ?? "",
      language: languageForFile(data.name),
      dirty: false,
    });
  }

  useEffect(() => {
    if (creating) createInputRef.current?.focus();
  }, [creating]);

  useEffect(() => {
    if (renamingId) renameInputRef.current?.focus();
  }, [renamingId]);

  async function submitCreate() {
    if (!creating || !current) return;
    const name = creating.name.trim();
    setCreating(null);
    if (!name) return;
    try {
      const node = await createFile(current.id, creating.parentFolderId, name, creating.type);
      if (creating.type === "file") {
        open({
          fileId: node.id,
          name: node.name,
          content: node.content ?? "",
          language: languageForFile(node.name),
          dirty: false,
        });
      }
    } catch (e) {
      console.error("createFile failed", e);
    }
  }

  function startCreate(parentFolderId: string | null, parentName: string, type: "file" | "folder") {
    setCreating({ parentFolderId, parentName, type, name: "" });
  }

  async function submitRename() {
    if (!renamingId) return;
    const name = renameName.trim();
    if (name) {
      try {
        await updateFile(renamingId, { name });
      } catch (e) {
        console.error("rename failed", e);
      }
    }
    setRenamingId(null);
  }

  async function confirmDelete() {
    if (!confirmDeleteId) return;
    try {
      await deleteFile(confirmDeleteId);
    } catch (e) {
      console.error("delete failed", e);
    }
    setConfirmDeleteId(null);
  }

  function toggleFolder(id: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onContextMenu(e: React.MouseEvent, node: FileDTO | null) {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, node });
  }

  async function onDrop(e: React.DragEvent) {
    setDragOver(false);
    const dt = e.dataTransfer;
    if (!dt.files?.length) return;
    e.preventDefault();
    if (!current) return;
    const items = dt.items;
    if (items && items.length && typeof items[0].webkitGetAsEntry === "function") {
      const entries = [];
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry) entries.push(entry);
      }
      for (const entry of entries) await uploadEntry(entry, null);
    } else {
      for (let i = 0; i < dt.files.length; i++) {
        const f = dt.files[i];
        const text = await f.text();
        await createFile(current.id, null, f.name, "file", text);
      }
    }
  }

  async function uploadEntry(entry: any, parentFolderId: string | null) {
    if (!current) return;
    if (entry.isFile) {
      await new Promise<void>((resolve) => {
        entry.file(async (file: File) => {
          const text = await file.text();
          await createFile(current.id, parentFolderId, entry.name, "file", text);
          resolve();
        });
      });
    } else if (entry.isDirectory) {
      const folder = await createFile(current.id, parentFolderId, entry.name, "folder");
      const reader = entry.createReader();
      await new Promise<void>((resolve) => {
        const readBatch = () =>
          reader.readEntries(async (entries: any[]) => {
            if (entries.length === 0) return resolve();
            for (const child of entries) await uploadEntry(child, folder.id);
            readBatch();
          });
        readBatch();
      });
    }
  }

  function onDragOver(e: React.DragEvent) {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      setDragOver(true);
    }
  }

  return (
    <div
      className="relative flex h-full flex-col bg-panel"
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={() => setDragOver(false)}
      onContextMenu={(e) => onContextMenu(e, null)}
    >
      {/* Header */}
      <div className="flex h-9 shrink-0 items-center border-b border-border px-3">
        <span className="flex-1 truncate text-xs font-semibold uppercase tracking-wide text-muted-2">
          Explorer
        </span>
        <button
          onClick={refresh}
          disabled={!current}
          className="rounded p-1.5 text-muted hover:bg-panel-2 hover:text-foreground disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw className="size-3.5" />
        </button>
      </div>

      {/* Big action buttons */}
      {current && (
        <div className="flex shrink-0 gap-1.5 border-b border-border p-2">
          <button
            onClick={() => startCreate(null, "root", "file")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-2 text-xs font-medium text-accent-fg transition hover:opacity-90"
          >
            <FilePlus className="size-4" />
            New File
          </button>
          <button
            onClick={() => startCreate(null, "root", "folder")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-panel-2 px-3 py-2 text-xs font-medium text-foreground transition hover:bg-panel hover:border-accent/40"
          >
            <FolderPlus className="size-4" />
            New Folder
          </button>
        </div>
      )}

      {/* Create input */}
      {creating && (
        <div className="flex items-center gap-2 border-b border-border bg-panel-2 px-3 py-2">
          <span className="text-accent">
            {creating.type === "folder" ? <FolderPlus className="size-4" /> : <FilePlus className="size-4" />}
          </span>
          <input
            ref={createInputRef}
            value={creating.name}
            onChange={(e) => setCreating((c) => (c ? { ...c, name: e.target.value } : c))}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); submitCreate(); }
              if (e.key === "Escape") setCreating(null);
            }}
            placeholder={`${creating.type === "folder" ? "Folder" : "File"} name…`}
            className="flex-1 rounded border border-accent/60 bg-background px-2 py-1.5 text-xs text-foreground outline-none"
          />
          <button onClick={submitCreate} className="rounded bg-accent px-2 py-1.5 text-accent-fg hover:opacity-90" title="Confirm">
            <Check className="size-4" />
          </button>
          <button onClick={() => setCreating(null)} className="rounded border border-border px-2 py-1.5 text-muted hover:bg-panel hover:text-foreground" title="Cancel">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Tree / Empty state / Drop zone */}
      <div
        className={`flex-1 overflow-auto transition-colors ${dragOver ? "bg-accent/5" : ""}`}
        onContextMenu={(e) => onContextMenu(e, null)}
      >
        {!current ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <FolderPlus className="mb-3 size-8 text-muted-2" />
            <p className="text-sm text-muted">No project selected</p>
            <p className="mt-1 text-xs text-muted-2">Create or select a project to start adding files</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-8 text-xs text-muted-2">Loading…</div>
        ) : tree.length === 0 && !creating ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <FilePlus className="mb-3 size-8 text-muted-2" />
            <p className="text-sm text-muted">Empty project</p>
            <p className="mt-1 text-xs text-muted-2">Create your first file or drag &amp; drop files here</p>
            <button
              onClick={() => startCreate(null, "root", "file")}
              className="mt-4 flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-xs font-medium text-accent-fg transition hover:opacity-90"
            >
              <FilePlus className="size-4" />
              Create your first file
            </button>
          </div>
        ) : (
          <div className="py-1">
            {tree.map((node) => (
              <FileTreeRow
                key={node.id}
                node={node}
                depth={0}
                activeFileId={activeFileId}
                expandedFolders={expandedFolders}
                renamingId={renamingId}
                renameName={renameName}
                confirmDeleteId={confirmDeleteId}
                renameInputRef={renameInputRef}
                onOpenFile={openFile}
                onToggleFolder={toggleFolder}
                onStartRename={(n) => { setRenamingId(n.id); setRenameName(n.name); }}
                onSubmitRename={submitRename}
                onCancelRename={() => setRenamingId(null)}
                setRenameName={setRenameName}
                onConfirmDelete={(n) => setConfirmDeleteId(n.id)}
                onExecuteDelete={confirmDelete}
                onCancelDelete={() => setConfirmDeleteId(null)}
                onContextMenu={onContextMenu}
              />
            ))}
          </div>
        )}
      </div>

      {/* Drag overlay */}
      {dragOver && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-accent/10">
          <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-accent/50 bg-panel/90 px-8 py-6">
            <Upload className="size-8 text-accent" />
            <span className="text-sm font-medium text-foreground">Drop files to upload</span>
          </div>
        </div>
      )}

      {menu && (
        <ContextMenu
          state={menu}
          onClose={() => setMenu(null)}
          onCreateFile={(parent) => {
            const node = parent ? findNode(tree, parent) : null;
            startCreate(parent, node?.name ?? "root", "file");
          }}
          onCreateFolder={(parent) => {
            const node = parent ? findNode(tree, parent) : null;
            startCreate(parent, node?.name ?? "root", "folder");
          }}
          onRename={(node) => { setRenamingId(node.id); setRenameName(node.name); }}
          onDelete={(node) => setConfirmDeleteId(node.id)}
        />
      )}
    </div>
  );
}

// ——— Custom tree row (no react-arborist) ———

interface FileTreeRowProps {
  node: FileDTO;
  depth: number;
  activeFileId: string | null;
  expandedFolders: Set<string>;
  renamingId: string | null;
  renameName: string;
  confirmDeleteId: string | null;
  renameInputRef: React.RefObject<HTMLInputElement>;
  onOpenFile: (data: FileDTO) => void;
  onToggleFolder: (id: string) => void;
  onStartRename: (node: FileDTO) => void;
  onSubmitRename: () => void;
  onCancelRename: () => void;
  setRenameName: (name: string) => void;
  onConfirmDelete: (node: FileDTO) => void;
  onExecuteDelete: () => void;
  onCancelDelete: () => void;
  onContextMenu: (e: React.MouseEvent, node: FileDTO | null) => void;
}

function FileTreeRow(props: FileTreeRowProps) {
  const data = props.node;
  const isFolder = data.type === "folder";
  const isActive = !isFolder && props.activeFileId === data.id;
  const isOpen = props.expandedFolders.has(data.id);
  const isRenaming = props.renamingId === data.id;
  const isConfirmingDelete = props.confirmDeleteId === data.id;
  const iconSpec = iconForFile(data.name);
  const [showActions, setShowActions] = useState(false);

  return (
    <>
      <div
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        onClick={() => {
          if (isRenaming || isConfirmingDelete) return;
          if (isFolder) props.onToggleFolder(data.id);
          else props.onOpenFile(data);
        }}
        onContextMenu={(e) => props.onContextMenu(e, data)}
        className={`group flex cursor-pointer items-center gap-1.5 py-1.5 pr-2 text-xs ${
          isActive ? "bg-accent-soft text-foreground" : "text-foreground/90 hover:bg-panel-2/60"
        }`}
        style={{ paddingLeft: `${props.depth * 16 + 8}px` }}
        title={data.name}
      >
        {/* Expand chevron for folders */}
        <span className="flex w-4 shrink-0 items-center justify-center">
          {isFolder ? (
            isOpen ? <ChevronDown className="size-3.5 text-muted" /> : <ChevronRight className="size-3.5 text-muted" />
          ) : null}
        </span>

        {/* Icon */}
        {isFolder ? (
          <FolderPlus className="size-4 shrink-0 text-accent" />
        ) : (
          <FilePlus className={`size-4 shrink-0 ${iconSpec.color ?? "text-muted"}`} />
        )}

        {/* Name or rename input */}
        {isRenaming ? (
          <input
            ref={props.renameInputRef}
            value={props.renameName}
            onChange={(e) => props.setRenameName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); props.onSubmitRename(); }
              if (e.key === "Escape") props.onCancelRename();
            }}
            onBlur={props.onSubmitRename}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 rounded border border-accent/60 bg-background px-1.5 py-0.5 text-xs outline-none"
          />
        ) : (
          <span className="flex-1 truncate">{data.name}</span>
        )}

        {/* Inline actions */}
        {isConfirmingDelete ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button onClick={props.onExecuteDelete} className="rounded bg-danger px-1.5 py-0.5 text-[10px] font-medium text-white hover:opacity-90" title="Confirm">
              <Check className="size-3" />
            </button>
            <button onClick={props.onCancelDelete} className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted hover:bg-panel hover:text-foreground" title="Cancel">
              <X className="size-3" />
            </button>
          </div>
        ) : isRenaming ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button onClick={props.onSubmitRename} className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-fg hover:opacity-90" title="Confirm">
              <Check className="size-3" />
            </button>
            <button onClick={props.onCancelRename} className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted hover:bg-panel hover:text-foreground" title="Cancel">
              <X className="size-3" />
            </button>
          </div>
        ) : showActions ? (
          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => props.onStartRename(data)} className="rounded p-1 text-muted hover:bg-panel hover:text-foreground" title="Rename">
              <Pencil className="size-3" />
            </button>
            <button onClick={() => props.onConfirmDelete(data)} className="rounded p-1 text-muted hover:bg-danger/10 hover:text-danger" title="Delete">
              <Trash2 className="size-3" />
            </button>
          </div>
        ) : null}
      </div>

      {/* Children */}
      {isFolder && isOpen && data.children && data.children.length > 0 && (
        <>
          {data.children.map((child) => (
            <FileTreeRow
              key={child.id}
              {...props}
              node={child}
              depth={props.depth + 1}
            />
          ))}
        </>
      )}
    </>
  );
}

function findNode(tree: FileDTO[], id: string): FileDTO | undefined {
  for (const n of tree) {
    if (n.id === id) return n;
    if (n.children) {
      const f = findNode(n.children, id);
      if (f) return f;
    }
  }
}