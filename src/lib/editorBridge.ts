"use client";

import { create } from "zustand";
import type * as MonacoNS from "monaco-editor";

type Editor = MonacoNS.editor.IStandaloneCodeEditor;

interface EditorBridgeState {
  editor: Editor | null;
  canUndo: boolean;
  canRedo: boolean;
  setEditor: (editor: Editor | null) => void;
}

// Per-model high-water mark of alternativeVersionId, so we can tell whether
// there is anything left to redo after undos. Keyed by model uri string.
const maxAltPerModel = new Map<string, number>();
let currentEditor: Editor | null = null;
let cleanup: (() => void) | null = null;

function recompute() {
  const editor = currentEditor;
  const model = editor?.getModel() ?? null;
  if (!model) {
    useEditorBridge.setState({ canUndo: false, canRedo: false });
    return;
  }
  const key = model.uri.toString();
  const alt = model.getAlternativeVersionId();
  const prevMax = maxAltPerModel.get(key) ?? alt;
  if (alt > prevMax) maxAltPerModel.set(key, alt);
  const max = maxAltPerModel.get(key) ?? alt;
  const canUndo = alt > 1;
  const canRedo = alt < max;
  useEditorBridge.setState({ canUndo, canRedo });
}

export const useEditorBridge = create<EditorBridgeState>((set) => ({
  editor: null,
  canUndo: false,
  canRedo: false,
  setEditor: (editor) => {
    cleanup?.();
    cleanup = null;
    currentEditor = editor;
    set({ editor });
    if (editor) {
      const model = editor.getModel();
      if (model) {
        const key = model.uri.toString();
        const alt = model.getAlternativeVersionId();
        maxAltPerModel.set(key, Math.max(maxAltPerModel.get(key) ?? alt, alt));
      }
      const d1 = editor.onDidChangeModelContent(recompute);
      const d2 = editor.onDidChangeModel(recompute);
      const d3 = editor.onDidDispose(() => {
        useEditorBridge.setState({ canUndo: false, canRedo: false });
      });
      cleanup = () => {
        d1.dispose();
        d2.dispose();
        d3.dispose();
      };
    }
    recompute();
  },
}));

export function getEditor(): Editor | null {
  return useEditorBridge.getState().editor;
}