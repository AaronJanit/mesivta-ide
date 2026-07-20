"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { FilePlus, FolderPlus, RefreshCw, ChevronsDownUp } from "lucide-react";
import dynamic from "next/dynamic";
import { useProjectStore } from "@/stores/useProjectStore";
import { useFileStore } from "@/stores/useFileStore";
import { useEditorStore } from "@/stores/useEditorStore";
import { languageForFile } from "@/lib/languages";
import type { FileDTO } from "@/lib/api/client";

// react-arborist is client-only (uses react-dnd). Dynamic import avoids SSR.
const Tree = dynamic(() => import("react-arborist").then((m) => m.Tree) as any, {
  ssr: false,
  loading: () => <div className="p-3 text-xs text-muted-2">Loading…</div>,
}) as any;

import { TreeRow } from "./TreeRow";
import { ContextMenu, type ContextMenuState } from "./ContextMenu";

interface CreateInputState {
  parentFolderId: string | null;
  parentName: string; // for display ("in <folder>" or "in root")
  type: "file" | "folder";
  name: string;
}

export function FileTreePanel() {
  const current = useProjectStore((s) => s.current);
  const { tree, loading, loadFiles, createFile, updateFile, deleteFile } = useFileStore();
  const open = useEditorStore((s) => s.open);
  const [creating, setCreating] = useState<CreateInputState | null>(null);
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

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

  async function submitCreate() {
    if (!creating || !current) return;
    const name = creating.name.trim();
    setCreating(null);
    if (!name) return;
    try {
      await createFile(current.id, creating.parentFolderId, name, creating.type);
    } catch (e) {
      console.error("createFile failed", e);
    }
  }

  function startCreate(parentFolderId: string | null, parentName: string, type: "file" | "folder") {
    setCreating({ parentFolderId, parentName, type, name: "" });
  }

  // Flatten tree for react-arborist
  const flat = flatten(tree);

  function onContextMenu(e: React.MouseEvent, node: FileDTO | null) {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, node });
  }

  async function onDrop(e: React.DragEvent) {
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
    if (e.dataTransfer.types.includes("Files")) e.preventDefault();
  }

  return (
    <div
      className="flex h-full flex-col bg-panel"
      onDrop={onDrop}
      onDragOver={onDragOver}
      onContextMenu={(e) => onContextMenu(e, null)}
    >
      {/* Toolbar */}
      <div className="flex h-8 shrink-0 items-center gap-0.5 border-b border-border px-2">
        <span className="flex-1 truncate text-[11px] font-semibold uppercase tracking-wide text-muted-2">
          Explorer
        </span>
        <button
          onClick={() => startCreate(null, "root", "file")}
          disabled={!current}
          className="rounded p-1 text-muted hover:bg-panel-2 hover:text-foreground disabled:opacity-40"
          title="New file"
        >
          <FilePlus className="size-3.5" />
        </button>
        <button
          onClick={() => startCreate(null, "root", "folder")}
          disabled={!current}
          className="rounded p-1 text-muted hover:bg-panel-2 hover:text-foreground disabled:opacity-40"
          title="New folder"
        >
          <FolderPlus className="size-3.5" />
        </button>
        <button
          onClick={refresh}
          disabled={!current}
          className="rounded p-1 text-muted hover:bg-panel-2 hover:text-foreground disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw className="size-3.5" />
        </button>
        <button
          onClick={() => {/* collapse-all — TODO via arborist ref */}}
          disabled={!current}
          className="rounded p-1 text-muted hover:bg-panel-2 hover:text-foreground disabled:opacity-40"
          title="Collapse all"
        >
          <ChevronsDownUp className="size-3.5" />
        </button>
      </div>

      {/* Create input — rendered above the tree, clearly labeled */}
      {creating && (
        <div className="flex items-center gap-2 border-b border-border bg-panel-2 px-2 py-1.5">
          <span className="text-muted-2">
            {creating.type === "folder" ? <FolderPlus className="size-3.5" /> : <FilePlus className="size-3.5" />}
          </span>
          <input
            ref={createInputRef}
            value={creating.name}
            onChange={(e) => setCreating((c) => (c ? { ...c, name: e.target.value } : c))}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); submitCreate(); }
              if (e.key === "Escape") setCreating(null);
            }}
            onBlur={submitCreate}
            placeholder={`${creating.type} name in ${creating.parentName}`}
            className="flex-1 rounded border border-accent/60 bg-background px-1.5 py-0.5 text-xs outline-none"
          />
        </div>
      )}

      {/* Tree */}
      <div className="flex-1 overflow-auto" onContextMenu={(e) => onContextMenu(e, null)}>
        {!current ? (
          <div className="p-3 text-xs text-muted-2">No project selected</div>
        ) : loading ? (
          <div className="p-3 text-xs text-muted-2">Loading…</div>
        ) : flat.length === 0 && !creating ? (
          <div className="p-3 text-xs text-muted-2">
            Empty project. Right-click or use the toolbar to add files.
          </div>
        ) : (
          <Tree
            data={flat}
            idAccessor="id"
            childrenAccessor="children"
            onActivate={(node: any) => {
              const data = node.data as FileDTO;
              if (data.type === "folder") {
                // toggle handled by arborist default; nothing extra
              } else {
                openFile(data);
              }
            }}
            onMove={(payload: any) => {
              const { dragIds, parentId } = payload;
              const id = dragIds[0];
              if (!id) return;
              updateFile(id, { parent_folder_id: parentId ?? null }).catch(console.error);
            }}
            disableDrag={false}
            disableDrop={false}
            width={9999}
            rowHeight={26}
            indent={12}
          >
            {(props: any) => <TreeRow {...props} />}
          </Tree>
        )}
      </div>

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
          onRename={async (node) => {
            const name = window.prompt("New name", node.name);
            if (name && name.trim()) await updateFile(node.id, { name: name.trim() });
          }}
          onDelete={async (node) => {
            if (window.confirm(`Delete ${node.type} "${node.name}"?${node.type === "folder" ? " This will remove all contents." : ""}`)) {
              await deleteFile(node.id);
            }
          }}
        />
      )}
    </div>
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

function flatten(nodes: FileDTO[], acc: any[] = []): any[] {
  for (const n of nodes) {
    acc.push({
      id: n.id,
      name: n.name,
      type: n.type,
      content: n.content,
      parent_folder_id: n.parent_folder_id,
      project_id: n.project_id,
      level: 0,
      children: n.children?.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        content: c.content,
        parent_folder_id: c.parent_folder_id,
        project_id: c.project_id,
        children: c.children,
      })),
    });
  }
  return acc;
}