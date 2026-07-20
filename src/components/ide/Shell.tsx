"use client";

import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import { LogOut } from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";
import { ProjectSwitcher } from "./ProjectSwitcher";
import { FileTreePanel } from "@/components/explorer/FileTreePanel";
import { EditorArea } from "@/components/editor/EditorArea";
import { AssistantPanel } from "@/components/ai/AssistantPanel";

export function Shell({ onLogout }: { onLogout: () => void }) {
  const current = useProjectStore((s) => s.current);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Top bar — 36px, minimal */}
      <header className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-panel px-3">
        <ProjectSwitcher />
        <div className="h-4 w-px bg-border" />
        <span className="text-xs text-muted-2">{current ? current.name : ""}</span>
        <div className="flex-1" />
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted hover:bg-panel-2 hover:text-foreground"
          title="Sign out"
        >
          <LogOut className="size-3.5" />
          <span>Sign out</span>
        </button>
      </header>

      {/* Main 3-column layout */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup orientation="horizontal" id="ide-main">
          <Panel defaultSize="18%" minSize="12%" maxSize="30%">
            <FileTreePanel />
          </Panel>
          <PanelResizeHandle className="w-px bg-border transition-colors hover:bg-accent/50" />
          <Panel minSize="30%">
            <EditorArea />
          </Panel>
          <PanelResizeHandle className="w-px bg-border transition-colors hover:bg-accent/50" />
          <Panel defaultSize="28%" minSize="18%" maxSize="45%">
            <AssistantPanel />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}