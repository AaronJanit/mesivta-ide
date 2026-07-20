"use client";

import { create } from "zustand";
import { api, type FileDTO } from "@/lib/api/client";

interface FileState {
  tree: FileDTO[];
  loading: boolean;
  loadFiles: (projectId: string) => Promise<void>;
  createFile: (projectId: string, parent: string | null, name: string, type: "file" | "folder", content?: string) => Promise<FileDTO>;
  updateFile: (id: string, patch: { name?: string; content?: string; parent_folder_id?: string | null }) => Promise<void>;
  deleteFile: (id: string) => Promise<void>;
  patchLocal: (id: string, patch: Partial<FileDTO>) => void; // optimistic
  findNode: (id: string) => FileDTO | undefined;
  clear: () => void;
}

// Flatten tree into a map for quick lookup
function collect(nodes: FileDTO[], acc: Map<string, FileDTO> = new Map()): Map<string, FileDTO> {
  for (const n of nodes) {
    acc.set(n.id, n);
    if (n.children) collect(n.children, acc);
  }
  return acc;
}

function rebuildAfterChange(tree: FileDTO[]): FileDTO[] {
  // shallow clone to trigger re-render
  return tree.map((n) => ({ ...n, children: n.children ? rebuildAfterChange(n.children) : n.children }));
}

export const useFileStore = create<FileState>((set, get) => ({
  tree: [],
  loading: false,
  loadFiles: async (projectId) => {
    set({ loading: true });
    try {
      const { tree } = await api.files.list(projectId);
      set({ tree, loading: false });
    } catch {
      set({ tree: [], loading: false });
    }
  },
  createFile: async (projectId, parent, name, type, content) => {
    const { node } = await api.files.create(projectId, { parent_folder_id: parent, name, type, content });
    // insert into tree
    const tree = [...get().tree];
    if (parent) {
      const map = collect(tree);
      const parent_ = map.get(parent);
      if (parent_) {
        parent_.children = [...(parent_.children ?? []), node];
      }
    } else {
      tree.push(node);
    }
    set({ tree: rebuildAfterChange(tree) });
    return node;
  },
  updateFile: async (id, patch) => {
    // optimistic
    get().patchLocal(id, patch);
    await api.files.update(id, patch);
  },
  deleteFile: async (id) => {
    await api.files.remove(id);
    // remove from tree
    const removeRec = (nodes: FileDTO[]): FileDTO[] =>
      nodes
        .filter((n) => n.id !== id)
        .map((n) => ({ ...n, children: n.children ? removeRec(n.children) : undefined }));
    set({ tree: removeRec(get().tree) });
  },
  patchLocal: (id, patch) => {
    const map = collect(get().tree);
    const node = map.get(id);
    if (node) Object.assign(node, patch);
    set({ tree: rebuildAfterChange(get().tree) });
  },
  findNode: (id) => collect(get().tree).get(id),
  clear: () => set({ tree: [] }),
}));