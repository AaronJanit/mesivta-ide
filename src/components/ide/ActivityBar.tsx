"use client";

import {
  Files,
  BookOpen,
  Bug,
  Search,
  GitBranch,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { useDebugStore } from "@/stores/useDebugStore";

export type ActivityView =
  | "explorer"
  | "guide"
  | "debug"
  | "search"
  | "scm"
  | "settings";

interface ActivityItem {
  id: ActivityView;
  icon: LucideIcon;
  label: string;
  /** When true, the item renders at the bottom of the bar (VS Code style). */
  pinnedBottom?: boolean;
}

const TOP_ITEMS: ActivityItem[] = [
  { id: "explorer", icon: Files, label: "Explorer" },
  { id: "guide", icon: BookOpen, label: "Coding Guide" },
  { id: "debug", icon: Bug, label: "Run and Debug" },
];

const BOTTOM_ITEMS: ActivityItem[] = [
  { id: "search", icon: Search, label: "Search" },
  { id: "scm", icon: GitBranch, label: "Source Control" },
  { id: "settings", icon: Settings, label: "Settings" },
];

interface ActivityBarProps {
  active: ActivityView;
  onSelect: (view: ActivityView) => void;
}

export function ActivityBar({ active, onSelect }: ActivityBarProps) {
  // Read the live issue count from the debug store so the badge reflects
  // background scans even when the DebugPanel isn't open.
  const issueCount = useDebugStore((s) => s.result?.issues.length ?? 0);

  const renderItems = (items: ActivityItem[]) =>
    items.map(({ id, icon: Icon, label }) => {
      const isActive = active === id;
      const showBadge = id === "debug" && issueCount > 0 && !isActive;
      return (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          title={showBadge ? `${label} — ${issueCount} ${issueCount === 1 ? "issue" : "issues"} found` : label}
          aria-label={label}
          aria-pressed={isActive}
          className={`group relative flex h-11 w-12 items-center justify-center transition-colors ${
            isActive
              ? "text-foreground"
              : "text-muted-2 hover:text-foreground"
          }`}
        >
          {/* VS Code-style left accent bar for active view */}
          {isActive && (
            <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
          )}
          <Icon className="size-5" strokeWidth={1.6} />
          {/* Pulsing red badge when syntax errors are detected */}
          {showBadge && (
            <span
              className="absolute right-2 top-2 flex size-2.5 items-center justify-center"
              title={`${issueCount} syntax ${issueCount === 1 ? "error" : "errors"} found`}
            >
              <span className="absolute size-2.5 animate-ping rounded-full bg-danger opacity-75" />
              <span className="relative size-2 rounded-full bg-danger shadow-[0_0_4px_rgba(255,0,0,0.8)]" />
            </span>
          )}
        </button>
      );
    });

  return (
    <nav
      className="flex w-12 shrink-0 flex-col items-stretch border-r border-border bg-panel"
      aria-label="Activity Bar"
    >
      <div className="flex flex-1 flex-col">{renderItems(TOP_ITEMS)}</div>
      <div className="flex flex-col">{renderItems(BOTTOM_ITEMS)}</div>
    </nav>
  );
}