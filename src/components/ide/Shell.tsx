"use client";

import { useCallback, useEffect, useState } from "react";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import { useTerminalStore } from "@/stores/useTerminalStore";
import { Toolbar } from "./Toolbar";
import { Sidebar } from "./Sidebar";
import { ActivityBar } from "./ActivityBar";
import { EditorArea } from "@/components/editor/EditorArea";
import { RightDock } from "./RightDock";
import { DebugPanel } from "@/components/debug/DebugPanel";
import { CodingGuide } from "@/components/guide/CodingGuide";
import { BottomPanel } from "./BottomPanel";
import { useBackgroundDebugScan } from "@/hooks/useBackgroundDebugScan";
import type { ActivityView } from "./ActivityBar";

export function Shell({ onLogout }: { onLogout: () => void }) {
  const showBottomPanel = useTerminalStore((s) => s.showPanel);
  const [aiChatVisible, setAiChatVisible] = useState(true);
  const [explorerVisible, setExplorerVisible] = useState(true);
  const [activityView, setActivityView] = useState<ActivityView>("explorer");
  const showDebug = activityView === "debug";
  const showGuide = activityView === "guide";

  // Ctrl+B toggles the explorer sidebar, VS Code style.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setExplorerVisible((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Clicking the Explorer activity-bar icon re-opens the sidebar (and selects
  // the explorer view) when it's collapsed.
  const handleActivitySelect = useCallback(
    (view: ActivityView) => {
      if (view === "explorer") setExplorerVisible(true);
      setActivityView(view);
    },
    [],
  );

  // Intro-tour hooks: the tour dispatches window events to open specific IDE
  // views so it can spotlight them (guide view, debug view, terminal panel).
  useEffect(() => {
    const openTerminal = () => {
      useTerminalStore.getState().openPanel();
      setActivityView((v) => (v === "guide" || v === "debug" ? "explorer" : v));
      setExplorerVisible(true);
    };
    const openDebug = () => setActivityView("debug");
    const openGuide = () => setActivityView("guide");
    window.addEventListener("tour:open-terminal", openTerminal);
    window.addEventListener("tour:open-debug", openDebug);
    window.addEventListener("tour:open-guide", openGuide);
    return () => {
      window.removeEventListener("tour:open-terminal", openTerminal);
      window.removeEventListener("tour:open-debug", openDebug);
      window.removeEventListener("tour:open-guide", openGuide);
    };
  }, []);

  // Keep the debug store's scan result fresh in the background so the
  // pulsing badge on the Debug activity-bar icon reflects live state.
  useBackgroundDebugScan();

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Toolbar — 40px, logo + View menu + sign out */}
      <Toolbar
        aiChatVisible={aiChatVisible}
        onToggleAiChat={() => setAiChatVisible((v) => !v)}
        explorerVisible={explorerVisible}
        onToggleExplorer={() => setExplorerVisible((v) => !v)}
        onLogout={onLogout}
      />

      {/* Main layout */}
      <div className="flex-1 overflow-hidden">
        {showGuide ? (
          // Guide view: icon activity bar + the guide, with the AI chatbot
          // docked on the right like the debug view.
          <div className="flex h-full">
            <ActivityBar active={activityView} onSelect={handleActivitySelect} />
            <PanelGroup orientation="horizontal" id="ide-guide" className="flex-1">
              <Panel minSize="30%">
                <div data-tour="ide-guide" className="h-full overflow-hidden">
                  <CodingGuide onClose={() => setActivityView("explorer")} />
                </div>
              </Panel>
              {aiChatVisible && (
                <>
                  <PanelResizeHandle className="w-px bg-border transition-colors hover:bg-accent/50" />
                  <Panel defaultSize="28%" minSize="18%" maxSize="45%">
                    <RightDock />
                  </Panel>
                </>
              )}
            </PanelGroup>
          </div>
        ) : showDebug ? (
          // Debug view: ActivityBar + DebugPanel filling the width up to the
          // AI chatbot. No file-tree sidebar column, no resizer on the left.
          <div className="flex h-full">
            <ActivityBar active={activityView} onSelect={handleActivitySelect} />
            <PanelGroup orientation="horizontal" id="ide-debug" className="flex-1">
              <Panel minSize="30%">
                <div data-tour="ide-debug" className="h-full">
                  <DebugPanel onClose={() => setActivityView("explorer")} />
                </div>
              </Panel>
              {aiChatVisible && (
                <>
                  <PanelResizeHandle className="w-px bg-border transition-colors hover:bg-accent/50" />
                  <Panel defaultSize="28%" minSize="18%" maxSize="45%">
                    <RightDock />
                  </Panel>
                </>
              )}
            </PanelGroup>
          </div>
        ) : (
          <div className="flex h-full">
            <ActivityBar active={activityView} onSelect={handleActivitySelect} />
            <PanelGroup orientation="horizontal" id="ide-main" className="flex-1">
              {explorerVisible && (
                <>
                  <Panel
                    id="explorer-panel"
                    defaultSize="20%"
                    minSize="14%"
                    maxSize="35%"
                    collapsible
                    collapsedSize="0px"
                  >
                    <Sidebar active={activityView} onSelect={handleActivitySelect} onCollapseExplorer={() => setExplorerVisible(false)} />
                  </Panel>
                  <PanelResizeHandle className="w-px bg-border transition-colors hover:bg-accent/50" />
                </>
              )}
              <Panel minSize="30%">
                {/* Vertical split: editor on top, terminal/preview on bottom */}
                <PanelGroup orientation="vertical" id="ide-editor-split">
                  <Panel defaultSize={showBottomPanel ? 60 : 100} minSize="20%">
                    <EditorArea />
                  </Panel>
                  {showBottomPanel && (
                    <>
                      <PanelResizeHandle className="h-px bg-border transition-colors hover:bg-accent/50" />
                      <Panel defaultSize="40%" minSize="15%" maxSize="70%">
                        <BottomPanel />
                      </Panel>
                    </>
                  )}
                </PanelGroup>
              </Panel>
              {aiChatVisible && (
                <>
                  <PanelResizeHandle className="w-px bg-border transition-colors hover:bg-accent/50" />
                  <Panel defaultSize="28%" minSize="18%" maxSize="45%">
                    <RightDock />
                  </Panel>
                </>
              )}
            </PanelGroup>
          </div>
        )}
      </div>
    </div>
  );
}