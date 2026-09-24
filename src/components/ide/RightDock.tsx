"use client";

import { useRef, useState } from "react";
import { MessageSquare, BookOpen, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { AssistantPanel } from "@/components/ai/AssistantPanel";
import { DocsPane } from "@/components/ide/DocsPane";

type DockTab = "chat" | "docs";

/**
 * The right-hand dock: tabbed panel holding the AI chat and the Mesivta
 * coding docs. Both tabs stay mounted (hidden via CSS) so chat state and
 * in-flight AI streams survive switching tabs.
 */
export function RightDock() {
  const [tab, setTab] = useState<DockTab>("chat");
  const tablistRef = useRef<HTMLDivElement>(null);

  // Roving-focus arrow-key navigation between the two tabs (WAI-ARIA tabs
  // pattern): Left/Right (or Up/Down) moves focus and activates the tab.
  function onTablistKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "ArrowUp" && e.key !== "ArrowDown")
      return;
    e.preventDefault();
    const next = tab === "chat" ? "docs" : "chat";
    setTab(next);
    const buttons = tablistRef.current?.querySelectorAll<HTMLButtonElement>("[role='tab']");
    buttons?.[next === "chat" ? 0 : 1]?.focus();
  }

  return (
    <div className="flex h-full flex-col bg-panel">
      {/* Tab bar — segmented control, generous 32px hit target */}
      <div className="shrink-0 border-b border-border px-2 py-1.5">
        <div
          ref={tablistRef}
          role="tablist"
          aria-label="Assistant panel tabs"
          onKeyDown={onTablistKeyDown}
          className="flex items-center gap-0.5 rounded-lg border border-border bg-background/60 p-0.5"
        >
          <DockTabButton
            active={tab === "chat"}
            onClick={() => setTab("chat")}
            icon={MessageSquare}
            label="AI Chat"
            tabId="dock-tab-chat"
            panelId="dock-panel-chat"
          />
          <DockTabButton
            active={tab === "docs"}
            onClick={() => setTab("docs")}
            icon={BookOpen}
            label="Docs"
            tabId="dock-tab-docs"
            panelId="dock-panel-docs"
          />
        </div>
      </div>

      {/* Panels — kept mounted so state survives tab switches */}
      <div
        id="dock-panel-chat"
        role="tabpanel"
        aria-labelledby="dock-tab-chat"
        hidden={tab !== "chat"}
        className="min-h-0 flex-1 overflow-hidden"
      >
        <AssistantPanel />
      </div>
      <div
        id="dock-panel-docs"
        role="tabpanel"
        aria-labelledby="dock-tab-docs"
        hidden={tab !== "docs"}
        className="min-h-0 flex-1 overflow-hidden"
      >
        <DocsPane />
      </div>
    </div>
  );
}

function DockTabButton({
  active,
  onClick,
  icon: Icon,
  label,
  tabId,
  panelId,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  tabId: string;
  panelId: string;
}) {
  return (
    <button
      id={tabId}
      role="tab"
      aria-selected={active}
      aria-controls={panelId}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={cn(
        "relative flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-all duration-150 focus-visible:outline focus-visible:outline-1.5 focus-visible:outline-accent",
        active
          ? "bg-accent-soft text-foreground shadow-[inset_0_0_0_1px_hsl(var(--accent)/0.35)]"
          : "text-muted hover:bg-panel-2 hover:text-foreground",
      )}
    >
      <Icon className={cn("size-3.5 transition-colors", active ? "text-accent" : "")} />
      <span>{label}</span>
    </button>
  );
}