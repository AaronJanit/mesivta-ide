"use client";

import { ActivityBar, type ActivityView } from "./ActivityBar";
import { FileTreePanel } from "@/components/explorer/FileTreePanel";

interface SidebarProps {
  active: ActivityView;
  onSelect: (view: ActivityView) => void;
}

export function Sidebar({ active, onSelect }: SidebarProps) {
  function renderContent() {
    switch (active) {
      case "explorer":
        return <FileTreePanel />;
      case "debug":
        // When Debug is active, Shell renders the DebugPanel in the editor
        // region instead of the Sidebar column, so this case is unreachable.
        // Kept for exhaustiveness.
        return null;
      case "guide":
        // The Coding Guide fills the editor region, not the sidebar column.
        return (
          <div className="flex h-full flex-col bg-panel">
            <div className="flex h-8 shrink-0 items-center border-b border-border px-3">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">
                Coding Guide
              </span>
            </div>
            <div className="flex-1 px-3 py-3 text-xs text-muted-2">
              The Coding Guide opens in the editor area on the right.
            </div>
          </div>
        );
      case "search":
      case "scm":
      case "settings":
        // Tab content to be added later.
        return (
          <div className="flex h-full flex-col bg-panel">
            <div className="flex h-8 shrink-0 items-center border-b border-border px-3">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">
                {labelFor(active)}
              </span>
            </div>
            <div className="flex-1" />
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="flex h-full">
      <ActivityBar active={active} onSelect={onSelect} />
      <div className="h-full flex-1 overflow-hidden">{renderContent()}</div>
    </div>
  );
}

function labelFor(view: ActivityView): string {
  switch (view) {
    case "explorer":
      return "Explorer";
    case "guide":
      return "Coding Guide";
    case "debug":
      return "Run and Debug";
    case "search":
      return "Search";
    case "scm":
      return "Source Control";
    case "settings":
      return "Settings";
  }
}