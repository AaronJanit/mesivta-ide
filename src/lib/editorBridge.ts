"use client";

import { create } from "zustand";
import type * as MonacoNS from "monaco-editor";
import { useEditorStore } from "@/stores/useEditorStore";

type Editor = MonacoNS.editor.IStandaloneCodeEditor;

export interface EditorSelection {
  fileId: string;
  fileName: string;
  /** 1-based */
  startLine: number;
  endLine: number;
  startCol: number;
  endCol: number;
  text: string;
}

interface EditorBridgeState {
  editor: Editor | null;
  canUndo: boolean;
  canRedo: boolean;
  /** Live text selection in the active editor tab (null when none). */
  selection: EditorSelection | null;
  setEditor: (editor: Editor | null) => void;
}

let currentEditor: Editor | null = null;
let cleanup: (() => void) | null = null;

function recompute() {
  const editor = currentEditor;
  const model = editor?.getModel() ?? null;
  if (!model) {
    useEditorBridge.setState({ canUndo: false, canRedo: false });
    return;
  }
  useEditorBridge.setState({ canUndo: model.canUndo(), canRedo: model.canRedo() });
}

/** Read the current selection from the editor, if any (empty selections → null). */
function readSelection(editor: Editor): EditorSelection | null {
  const model = editor.getModel();
  const sel = editor.getSelection?.();
  if (!model || !sel || sel.isEmpty()) return null;
  // The model uri is `file:///<fileId>` (a DB uuid) for real files; resolve the
  // human name from the editor store tabs, falling back to the uri's last segment.
  const uriStr = model.uri.toString();
  const uriName = decodeURIComponent(model.uri.path.split("/").pop() ?? "untitled");
  const fileName =
    uriStr.startsWith("file:///")
      ? (useEditorStore.getState().tabs.find((t) => t.fileId === uriStr.slice("file://".length))?.name ?? uriName)
      : uriName;
  return {
    fileId: uriStr,
    fileName,
    startLine: sel.startLineNumber,
    endLine: sel.endLineNumber,
    startCol: sel.startColumn,
    endCol: sel.endColumn,
    text: model.getValueInRange(sel),
  };
}

export const useEditorBridge = create<EditorBridgeState>((set) => ({
  editor: null,
  canUndo: false,
  canRedo: false,
  selection: null,
  setEditor: (editor) => {
    cleanup?.();
    cleanup = null;
    currentEditor = editor;
    set({ editor });
    if (editor) {
      const model = editor.getModel();
      const d1 = editor.onDidChangeModelContent(recompute);
      const d2 = editor.onDidChangeModel(recompute);
      const d3 = editor.onDidDispose(() => {
        useEditorBridge.setState({ canUndo: false, canRedo: false, selection: null });
      });
      const d4 = editor.onDidChangeCursorSelection(() => {
        useEditorBridge.setState({ selection: readSelection(editor) });
      });
      cleanup = () => {
        d1.dispose();
        d2.dispose();
        d3.dispose();
        d4.dispose();
      };
    }
    recompute();
  },
}));

export function getEditor(): Editor | null {
  return useEditorBridge.getState().editor;
}

/** Read the live editor selection, if any. */
export function getEditorSelection(): EditorSelection | null {
  return useEditorBridge.getState().selection;
}