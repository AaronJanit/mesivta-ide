"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Eye, Undo2, Redo2, LogOut, Sun, Moon } from "lucide-react";
import { getEditor, useEditorBridge } from "@/lib/editorBridge";
import { useTheme } from "@/hooks/useTheme";

interface ToolbarProps {
  aiChatVisible: boolean;
  onToggleAiChat: () => void;
  onLogout: () => void;
}

export function Toolbar({ aiChatVisible, onToggleAiChat, onLogout }: ToolbarProps) {
  const [viewOpen, setViewOpen] = useState(false);
  const viewRef = useRef<HTMLDivElement>(null);
  const { mode, toggle } = useTheme();
  const isLight = mode === "light";
  const canUndo = useEditorBridge((s) => s.canUndo);
  const canRedo = useEditorBridge((s) => s.canRedo);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (viewRef.current && !viewRef.current.contains(e.target as Node)) setViewOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border bg-panel px-3">
      {/* Logo — Mesivta IDE text only, same gradient style as login, smaller.
          Uses foreground (white-dark / dark-light) so it adapts to light mode. */}
      <span className="bg-gradient-to-r from-foreground via-foreground to-[hsl(var(--accent))] bg-clip-text text-base font-bold tracking-tight text-transparent select-none">
        Mesivta IDE
      </span>

      <div className="mx-2 h-4 w-px bg-border" />

      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => getEditor()?.trigger("toolbar", "undo", null)}
          disabled={!canUndo}
          className="rounded p-1 text-muted transition hover:bg-panel-2 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => getEditor()?.trigger("toolbar", "redo", null)}
          disabled={!canRedo}
          className="rounded p-1 text-muted transition hover:bg-panel-2 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="size-4" />
        </button>
      </div>

      <div className="mx-2 h-4 w-px bg-border" />

      {/* View menu */}
      <div className="relative" ref={viewRef}>
        <button
          type="button"
          onClick={() => setViewOpen((o) => !o)}
          className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition ${
            viewOpen
              ? "bg-panel-2 text-foreground"
              : "text-muted hover:bg-panel-2 hover:text-foreground"
          }`}
        >
          <Eye className="size-3.5" />
          <span>View</span>
          <ChevronDown className="size-3 opacity-70" />
        </button>

        {viewOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 min-w-[200px] overflow-hidden rounded border border-border bg-panel shadow-pop">
            <button
              type="button"
              onClick={() => {
                onToggleAiChat();
              }}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs text-foreground transition hover:bg-panel-2"
            >
              <span>AI Chat</span>
              <span
                className={`flex h-4 w-7 items-center rounded-full px-0.5 transition ${
                  aiChatVisible ? "bg-accent justify-end" : "bg-border justify-start"
                }`}
              >
                <span className="size-3 rounded-full bg-white" />
              </span>
            </button>
            <div className="h-px bg-border" />
            <button
              type="button"
              onClick={toggle}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs text-foreground transition hover:bg-panel-2"
            >
              <span className="flex items-center gap-2">
                {isLight ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
                Light Mode
              </span>
              <span
                className={`flex h-4 w-7 items-center rounded-full px-0.5 transition ${
                  isLight ? "bg-accent justify-end" : "bg-border justify-start"
                }`}
              >
                <span className="size-3 rounded-full bg-white" />
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="flex-1" />

      <button
        onClick={onLogout}
        className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted transition hover:bg-panel-2 hover:text-foreground"
        title="Sign out"
      >
        <LogOut className="size-3.5" />
        <span>Sign out</span>
      </button>
    </div>
  );
}