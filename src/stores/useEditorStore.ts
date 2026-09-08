"use client";

import { create } from "zustand";

/** Reserved fileId for the welcome tab. Not a real file. */
export const WELCOME_TAB_ID = "__welcome__";

export interface EditorTab {
  fileId: string;
  name: string;
  content: string;
  language: string;
  dirty: boolean;
  isWelcome?: boolean;
}

interface EditorState {
  tabs: EditorTab[];
  activeFileId: string | null;
  open: (tab: EditorTab) => void;
  openWelcome: () => void;
  close: (fileId: string) => void;
  setActive: (fileId: string) => void;
  setContent: (fileId: string, content: string) => void;
  markClean: (fileId: string) => void;
  renameTab: (fileId: string, name: string) => void;
  hasTab: (fileId: string) => boolean;
  clear: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activeFileId: null,
  open: (tab) => {
    if (get().tabs.some((t) => t.fileId === tab.fileId)) {
      set({ activeFileId: tab.fileId });
      return;
    }
    set({ tabs: [...get().tabs, tab], activeFileId: tab.fileId });
  },
  openWelcome: () => {
    if (get().tabs.some((t) => t.fileId === WELCOME_TAB_ID)) {
      set({ activeFileId: WELCOME_TAB_ID });
      return;
    }
    set({
      tabs: [
        ...get().tabs,
        { fileId: WELCOME_TAB_ID, name: "Welcome", content: "", language: "plaintext", dirty: false, isWelcome: true },
      ],
      activeFileId: WELCOME_TAB_ID,
    });
  },
  close: (fileId) => {
    const tabs = get().tabs.filter((t) => t.fileId !== fileId);
    const activeFileId =
      get().activeFileId === fileId ? (tabs[tabs.length - 1]?.fileId ?? null) : get().activeFileId;
    set({ tabs, activeFileId });
  },
  setActive: (fileId) => set({ activeFileId: fileId }),
  setContent: (fileId, content) =>
    set({
      tabs: get().tabs.map((t) => (t.fileId === fileId ? { ...t, content, dirty: true } : t)),
    }),
  markClean: (fileId) =>
    set({
      tabs: get().tabs.map((t) => (t.fileId === fileId ? { ...t, dirty: false } : t)),
    }),
  renameTab: (fileId, name) =>
    set({
      tabs: get().tabs.map((t) => (t.fileId === fileId ? { ...t, name } : t)),
    }),
  hasTab: (fileId) => get().tabs.some((t) => t.fileId === fileId),
  clear: () => set({ tabs: [], activeFileId: null }),
}));