"use client";

import { useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { X, File, FileCode, FileJson, FileText, Image as ImageIcon, FileCog, Braces, Sparkles, Globe } from "lucide-react";
import { useEditorStore, type EditorTab, WELCOME_TAB_ID, PREVIEW_TAB_ID } from "@/stores/useEditorStore";
import { useFileStore } from "@/stores/useFileStore";
import { iconForFile } from "@/lib/fileIcons";
import { WelcomePanel } from "./WelcomePanel";
import { LivePreview } from "@/components/preview/LivePreview";
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
            active={t.fileId === activeFileId}
            onClick={() => setActive(t.fileId)}
            onClose={() => close(t.fileId)}
          />
        ))}
      </div>

      {/* Editor OR welcome OR preview — full height, swapped by active tab */}
      <div className="flex-1 overflow-hidden">
        {activeTab?.isWelcome ? (
          <WelcomePanel />
        ) : activeTab?.isPreview ? (
          <LivePreview />
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
      <span className={tab.isWelcome ? "text-accent" : tab.isPreview ? "text-accent" : (Icon.color ?? "text-muted")}>
        {tab.isWelcome ? (
          <Sparkles className="size-3.5" />
        ) : tab.isPreview ? (
          <Globe className="size-3.5" />
        ) : (
          <FileTypeIcon name={tab.name} />
        )}
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