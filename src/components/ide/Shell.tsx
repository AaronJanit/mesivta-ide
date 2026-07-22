"use client";

import { useState } from "react";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import { useProjectStore } from "@/stores/useProjectStore";
import { Toolbar } from "./Toolbar";
import { ProjectSwitcher } from "./ProjectSwitcher";
import { Sidebar } from "./Sidebar";
import { ActivityBar } from "./ActivityBar";
import { EditorArea } from "@/components/editor/EditorArea";
import { AssistantPanel } from "@/components/ai/AssistantPanel";
import { DebugPanel } from "@/components/debug/DebugPanel";
import { CodingGuide } from "@/components/guide/CodingGuide";
import { useBackgroundDebugScan } from "@/hooks/useBackgroundDebugScan";
import type { ActivityView } from "./ActivityBar";

export function Shell({ onLogout }: { onLogout: () => void }) {
  const current = useProjectStore((s) => s.current);
  const [aiChatVisible, setAiChatVisible] = useState(true);
  const [activityView, setActivityView] = useState<ActivityView>("explorer");
  const showDebug = activityView === "debug";
  const showGuide = activityView === "guide";

  // Keep the debug store's scan result fresh in the background so the
  // pulsing badge on the Debug activity-bar icon reflects live state.
  useBackgroundDebugScan();

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Toolbar — 40px, logo + View menu + sign out */}
      <Toolbar
        aiChatVisible={aiChatVisible}
        onToggleAiChat={() => setAiChatVisible((v) => !v)}
        onLogout={onLogout}
      />

      {/* Project bar — 36px, minimal */}
      <header className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-panel px-3">
        <ProjectSwitcher />
        <div className="h-4 w-px bg-border" />
        <span className="text-xs text-muted-2">{current ? current.name : ""}</span>
        <div className="flex-1" />
      </header>

      {/* Main layout */}
      <div className="flex-1 overflow-hidden">
        {showGuide ? (
          // Guide view: only the icon activity bar + the guide filling the
          // rest. No file-tree sidebar, no AI chatbot panel, no resizers.
          <div className="flex h-full">
            <ActivityBar active={activityView} onSelect={setActivityView} />
            <div className="h-full flex-1 overflow-hidden">
              <CodingGuide onClose={() => setActivityView("explorer")} />
            </div>
          </div>
        ) : showDebug ? (
          // Debug view: ActivityBar + DebugPanel filling the width up to the
          // AI chatbot. No file-tree sidebar column, no resizer on the left.
          <div className="flex h-full">
            <ActivityBar active={activityView} onSelect={setActivityView} />
            <PanelGroup orientation="horizontal" id="ide-debug" className="flex-1">
              <Panel minSize="30%">
                <DebugPanel onClose={() => setActivityView("explorer")} />
              </Panel>
              {aiChatVisible && (
                <>
                  <PanelResizeHandle className="w-px bg-border transition-colors hover:bg-accent/50" />
                  <Panel defaultSize="28%" minSize="18%" maxSize="45%">
                    <AssistantPanel />
                  </Panel>
                </>
              )}
            </PanelGroup>
          </div>
        ) : (
          <PanelGroup orientation="horizontal" id="ide-main">
            <Panel defaultSize="20%" minSize="14%" maxSize="35%">
              <Sidebar active={activityView} onSelect={setActivityView} />
            </Panel>
            <PanelResizeHandle className="w-px bg-border transition-colors hover:bg-accent/50" />
            <Panel minSize="30%">
              <EditorArea />
            </Panel>
            {aiChatVisible && (
              <>
                <PanelResizeHandle className="w-px bg-border transition-colors hover:bg-accent/50" />
                <Panel defaultSize="28%" minSize="18%" maxSize="45%">
                  <AssistantPanel />
                </Panel>
              </>
            )}
          </PanelGroup>
        )}
      </div>
    </div>
  );
}