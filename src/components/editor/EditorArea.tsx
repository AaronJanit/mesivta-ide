"use client";

import { useRef, useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { X, Eye, File, FileCode, FileJson, FileText, Image as ImageIcon, FileCog, Braces, Globe } from "lucide-react";
import { useEditorStore, type EditorTab } from "@/stores/useEditorStore";
import { useFileStore } from "@/stores/useFileStore";
import { iconForFile } from "@/lib/fileIcons";
import { PreviewPanel } from "@/components/preview/PreviewPanel";
import { cn } from "@/lib/cn";

// Monaco is browser-only. SSR must be disabled.
const MonacoInner = dynamic(() => import("./MonacoInner").then((m) => m.MonacoInner), {
  ssr: false,
  loading: () => <div className="p-3 text-xs text-muted-2">Loading editor…</div>,
});

const ICONS = {
  file: File,
  "file-code": FileCode,
  "file-json": FileJson,
  "file-text": FileText,
  image: ImageIcon,
  "file-cog": FileCog,
  braces: Braces,
} as const;

function FileTypeIcon({ name }: { name: string }) {
  const spec = iconForFile(name);
  const Cmp = ICONS[spec.icon];
  return <Cmp className="size-3.5" />;
}

export function EditorArea() {
  const { tabs, activeFileId, setActive, close, setContent, markClean } = useEditorStore();
  const { updateFile } = useFileStore();
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [showPreview, setShowPreview] = useState(false);

  // Debounced auto-save
  const scheduleSave = useCallback(
    (fileId: string, content: string) => {
      if (saveTimers.current[fileId]) clearTimeout(saveTimers.current[fileId]);
      saveTimers.current[fileId] = setTimeout(async () => {
        await updateFile(fileId, { content });
        markClean(fileId);
        delete saveTimers.current[fileId];
      }, 800);
    },
    [updateFile, markClean],
  );

  const activeTab = tabs.find((t) => t.fileId === activeFileId) ?? null;

  return (
    <div className="flex h-full flex-col bg-editor">
      {/* Tab strip */}
      <div className="flex h-9 shrink-0 items-stretch overflow-x-auto border-b border-border bg-panel">
        {tabs.map((t) => (
          <Tab
            key={t.fileId}
            tab={t}
            active={t.fileId === activeFileId && !showPreview}
            onClick={() => {
              setShowPreview(false);
              setActive(t.fileId);
            }}
            onClose={() => close(t.fileId)}
          />
        ))}
        {/* Preview tab */}
        <button
          onClick={() => setShowPreview(true)}
          className={cn(
            "group flex h-full shrink-0 cursor-pointer items-center gap-1.5 border-r border-border pl-3 pr-3 text-xs",
            showPreview ? "bg-editor text-foreground" : "bg-panel text-muted hover:bg-panel-2",
          )}
          title="Live preview"
        >
          <Globe className="size-3.5 text-accent" />
          <span>Preview</span>
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-1 border-l border-border px-2">
          <button
            onClick={() => setShowPreview((v) => !v)}
            className={cn(
              "rounded p-1 hover:bg-panel-2",
              showPreview ? "text-accent" : "text-muted hover:text-foreground",
            )}
            title="Toggle preview"
          >
            <Eye className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Editor OR preview — full height, swapped by active tab */}
      <div className="flex-1 overflow-hidden">
        {showPreview ? (
          <PreviewPanel />
        ) : activeTab ? (
          <MonacoInner
            key={activeTab.fileId}
            fileId={activeTab.fileId}
            value={activeTab.content}
            language={activeTab.language}
            onChange={(val) => {
              setContent(activeTab.fileId, val);
              scheduleSave(activeTab.fileId, val);
            }}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

function Tab({ tab, active, onClick, onClose }: { tab: EditorTab; active: boolean; onClick: () => void; onClose: () => void }) {
  const Icon = iconForFile(tab.name);
  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex h-full cursor-pointer items-center gap-1.5 border-r border-border pl-3 pr-2 text-xs",
        active ? "bg-editor text-foreground" : "bg-panel text-muted hover:bg-panel-2",
      )}
    >
      <span className={Icon.color ?? "text-muted"}>
        <FileTypeIcon name={tab.name} />
      </span>
      <span className="max-w-[140px] truncate">{tab.name}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="ml-1 rounded p-0.5 opacity-0 hover:bg-panel-2 group-hover:opacity-100"
        title="Close"
      >
        {tab.dirty ? (
          <span className="block size-2 rounded-full bg-accent" />
        ) : (
          <X className="size-3 text-muted hover:text-foreground" />
        )}
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center text-xs text-muted-2">
      No file open
    </div>
  );
}