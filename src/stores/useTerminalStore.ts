"use client";

import { create } from "zustand";
import { useFileStore } from "./useFileStore";
import { useEditorStore } from "./useEditorStore";
import { PREVIEW_TAB_ID } from "./useEditorStore";
import { useProjectStore } from "./useProjectStore";
import { parseCommand } from "@/lib/terminal/parser";
import { executeCommand, type CommandResult } from "@/lib/terminal/commands";
import { resolvePath, listDir, pathToNode, parentDir } from "@/lib/terminal/pathUtils";
import type { FileNode } from "@/lib/db/types";

export interface HistoryLine {
  text: string;
  isCommand: boolean; // true = user typed it, false = output
}

export interface TerminalState {
  cwd: string;
  history: HistoryLine[];
  serverRunning: boolean;
  serverPort: number | null;
  commandHistory: string[];  // up/down arrow history
  historyIndex: number;
  showPanel: boolean;  // whether the bottom panel (terminal+preview) is visible

  // Actions
  execute: (input: string) => Promise<void>;
  clearHistory: () => void;
  killServer: () => void;
  init: (projectName: string) => void;
  togglePanel: () => void;
  openPanel: () => void;
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  cwd: "/",
  history: [],
  serverRunning: false,
  serverPort: null,
  commandHistory: [],
  historyIndex: -1,
  showPanel: false,

  init: (projectName: string) => {
    set({
      cwd: "/",
      history: [
        { text: `\x1b[1;36mWelcome to Mesivta IDE Terminal\x1b[0m`, isCommand: false },
        { text: `Project: ${projectName}`, isCommand: false },
        { text: `Type \x1b[1mhelp\x1b[0m for available commands.`, isCommand: false },
        { text: "", isCommand: false },
      ],
      serverRunning: false,
      serverPort: null,
      commandHistory: [],
      historyIndex: -1,
    });
  },

  execute: async (input: string) => {
    const trimmed = input.trim();
    const { cwd, serverRunning, commandHistory } = get();
    const tree = useFileStore.getState().tree;
    const project = useProjectStore.getState().current;
    const projectName = project?.name ?? "project";

    // Add command line to history
    const prompt = buildPrompt(cwd, projectName);
    const newHistory: HistoryLine[] = [
      { text: `${prompt}${trimmed}`, isCommand: true },
    ];

    // Track command history for up/down arrows
    const newCommandHistory = trimmed ? [...commandHistory, trimmed] : commandHistory;

    if (!trimmed) {
      set({ history: [...get().history, ...newHistory], commandHistory: newCommandHistory, historyIndex: -1 });
      return;
    }

    // Parse the command
    const parsed = parseCommand(trimmed);

    // Handle Ctrl+C is done in the component, but check for it
    if (trimmed === "\x03") {
      newHistory.push({ text: "^C", isCommand: false });
      if (serverRunning) {
        set({
          history: [...get().history, ...newHistory],
          serverRunning: false,
          serverPort: null,
          commandHistory: newCommandHistory,
          historyIndex: -1,
        });
      } else {
        set({ history: [...get().history, ...newHistory], commandHistory: newCommandHistory, historyIndex: -1 });
      }
      return;
    }

    // Execute the command
    const result = executeCommand(parsed, cwd, tree, projectName, serverRunning);

    // Add output to history
    if (result.output) {
      newHistory.push({ text: result.output, isCommand: false });
    }

    // Apply side effects
    let newCwd = cwd;
    let newServerRunning = serverRunning;
    let newServerPort = get().serverPort;

    if (result.clear) {
      set({
        history: [],
        cwd: newCwd,
        serverRunning: newServerRunning,
        serverPort: newServerPort,
        commandHistory: newCommandHistory,
        historyIndex: -1,
      });
      return;
    }

    if (result.newCwd) {
      newCwd = result.newCwd;
    }

    if (result.serverStart) {
      newServerRunning = true;
      newServerPort = result.serverStart.port;
      // Open the live preview as a tab in the editor area
      useEditorStore.getState().openPreview();
    }

    if (result.serverStop) {
      newServerRunning = false;
      newServerPort = null;
      // Close the preview tab when the server stops
      useEditorStore.getState().close(PREVIEW_TAB_ID);
    }

    // Handle file operations via the file store
    if (result.mkdir) {
      const { parentPath, name } = result.mkdir;
      const parentNode = pathToNode(parentPath, tree);
      if (project) {
        try {
          await useFileStore.getState().createFile(project.id, parentNode?.id ?? null, name, "folder");
          newHistory.push({ text: "", isCommand: false }); // blank line after success
        } catch {
          newHistory.push({ text: `mkdir: error creating directory '${name}'\n`, isCommand: false });
        }
      }
    }

    if (result.touch) {
      const { parentPath, name } = result.touch;
      const parentNode = pathToNode(parentPath, tree);
      if (project) {
        try {
          await useFileStore.getState().createFile(project.id, parentNode?.id ?? null, name, "file", "");
        } catch {
          newHistory.push({ text: `touch: error creating file '${name}'\n`, isCommand: false });
        }
      }
    }

    if (result.rm) {
      try {
        await useFileStore.getState().deleteFile(result.rm.id);
      } catch {
        newHistory.push({ text: `rm: error removing '${result.rm.name}'\n`, isCommand: false });
      }
    }

    if (result.mv) {
      const { id, newName, newParentPath } = result.mv;
      const newParentNode = pathToNode(newParentPath, useFileStore.getState().tree);
      const patch: { name?: string; parent_folder_id?: string | null } = {};
      if (newName) patch.name = newName;
      if (newParentNode) patch.parent_folder_id = newParentNode.id;
      else if (newParentPath === "/") patch.parent_folder_id = null;
      try {
        await useFileStore.getState().updateFile(id, patch);
      } catch {
        newHistory.push({ text: `mv: error moving file\n`, isCommand: false });
      }
    }

    if (result.writeToFile) {
      const { path: filePath, content } = result.writeToFile;
      const node = pathToNode(filePath, useFileStore.getState().tree);
      if (node && node.type === "file") {
        // Update existing file
        try {
          await useFileStore.getState().updateFile(node.id, { content });
        } catch {
          newHistory.push({ text: `echo: error writing to file\n`, isCommand: false });
        }
      } else if (!node && project) {
        // Create new file
        const parentPath = parentDir(filePath);
        const fileName = filePath.split("/").pop() ?? "untitled";
        const parentNode = pathToNode(parentPath, useFileStore.getState().tree);
        try {
          await useFileStore.getState().createFile(project.id, parentNode?.id ?? null, fileName, "file", content);
        } catch {
          newHistory.push({ text: `echo: error creating file\n`, isCommand: false });
        }
      }
    }

    if (result.openFile) {
      // Open file in editor — schedule for next tick so store state settles
      const fileId = result.openFile;
      const node = findNodeById(useFileStore.getState().tree, fileId);
      if (node) {
        setTimeout(() => {
          useEditorStore.getState().open({
            fileId: node.id,
            name: node.name,
            content: node.content ?? "",
            language: languageForFile(node.name),
            dirty: false,
          });
        }, 0);
      }
    }

    set({
      history: [...get().history, ...newHistory],
      cwd: newCwd,
      serverRunning: newServerRunning,
      serverPort: newServerPort,
      commandHistory: newCommandHistory,
      historyIndex: -1,
    });
  },

  clearHistory: () => set({ history: [] }),

  killServer: () => {
    set({
      serverRunning: false,
      serverPort: null,
      history: [
        ...get().history,
        { text: "^C", isCommand: false },
        { text: "\x1b[33mServer stopped.\x1b[0m\n", isCommand: false },
      ],
    });
  },

  togglePanel: () => set((s) => ({ showPanel: !s.showPanel })),
  openPanel: () => set({ showPanel: true }),
}));

function buildPrompt(cwd: string, projectName: string): string {
  // Show relative path for shorter prompt
  const display = cwd === "/" ? `/${projectName}` : `/${projectName}${cwd}`;
  return `\x1b[1;34m${display}\x1b[0m $ `;
}

function findNodeById(tree: FileNode[], id: string): FileNode | undefined {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

function languageForFile(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    html: "html",
    htm: "html",
    css: "css",
    js: "javascript",
    ts: "typescript",
    jsx: "javascript",
    tsx: "typescript",
    json: "json",
    md: "markdown",
    py: "python",
    txt: "plaintext",
    xml: "xml",
    svg: "xml",
    yaml: "yaml",
    yml: "yaml",
  };
  return map[ext] ?? "plaintext";
}