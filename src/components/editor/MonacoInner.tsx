"use client";

import { useEffect, useRef, useCallback } from "react";
import { Editor, type OnMount } from "@monaco-editor/react";
import type * as MonacoNS from "monaco-editor";
import { useEditorBridge } from "@/lib/editorBridge";

interface MonacoInnerProps {
  fileId: string;
  value: string;
  language: string;
  onChange: (val: string) => void;
}

let modelsRef: { current: Record<string, MonacoNS.editor.ITextModel | null> } = { current: {} };
let monacoRef: typeof MonacoNS | null = null;

export function MonacoInner({ fileId, value, language, onChange }: MonacoInnerProps) {
  const setEditor = useEditorBridge((s) => s.setEditor);
  const editorRef = useRef<MonacoNS.editor.IStandaloneCodeEditor | null>(null);

  const onMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef = monaco;
    setEditor(editor);
    // Define a dark theme matching the app
    monaco.editor.defineTheme("ide-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#0d0d12",
        "editorGutter.background": "#121215",
        "editorLineNumber.foreground": "#4b5360",
        "editorLineNumber.activeForeground": "#9aa0aa",
        "editor.lineHighlightBackground": "#1b1b1f40",
        "editorCursor.foreground": "#00b3ff",
        "editor.selectionBackground": "#00b3ff30",
        "editorIndentGuide.background1": "#2a2d33",
      },
    });
    monaco.editor.setTheme("ide-dark");
  }, []);

  // When the file changes, swap to a per-file model so undo/cursor persist.
  useEffect(() => {
    if (!monacoRef || !editorRef.current) return;
    const monaco = monacoRef;
    const editor = editorRef.current;
    // create or reuse model
    let model = modelsRef.current[fileId];
    if (!model || model.isDisposed()) {
      const uri = monaco.Uri.parse(`file:///${fileId}`);
      model = monaco.editor.getModel(uri) ?? monaco.editor.createModel(value, language, uri);
      modelsRef.current[fileId] = model;
    }
    editor.setModel(model);
    editor.focus();
  }, [fileId, value, language]);

  useEffect(() => {
    return () => setEditor(null);
  }, []);

  return (
    <Editor
      value={value}
      language={language}
      onMount={onMount}
      onChange={(val) => onChange(val ?? "")}
      loading={<div className="p-3 text-xs text-muted-2">Loading editor…</div>}
      options={{
        fontSize: 13,
        fontFamily: "var(--font-geist-mono), Menlo, Consolas, monospace",
        fontLigatures: true,
        minimap: { enabled: true, maxColumn: 80 },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorBlinking: "smooth",
        renderWhitespace: "selection",
        tabSize: 2,
        automaticLayout: true,
        padding: { top: 8, bottom: 8 },
        lineNumbers: "on",
        roundedSelection: true,
        bracketPairColorization: { enabled: true },
      }}
    />
  );
}