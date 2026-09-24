"use client";

import { useRef, useState } from "react";
import { BookOpen, FileText, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { CodingGuide } from "@/components/guide/CodingGuide";

type PaneTab = "guide" | "cheatsheet";
type CheatSheet = "html" | "css";

const SHEETS: Record<CheatSheet, { label: string; src: string }> = {
  html: { label: "HTML", src: "/html-cheatsheet.pdf" },
  css: { label: "CSS", src: "/css-cheatsheet.pdf" },
};

/**
 * Content of the right-dock "Docs" tab: sub-tabs for the Mesivta coding
 * guide and a cheatsheet viewer (HTML / CSS reference PDFs). Both sub-tabs
 * stay mounted (hidden via CSS) so guide scroll position survives switching.
 */
export function DocsPane() {
  const [tab, setTab] = useState<PaneTab>("guide");
  const [sheet, setSheet] = useState<CheatSheet>("html");
  const tablistRef = useRef<HTMLDivElement>(null);

  function onTablistKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "ArrowUp" && e.key !== "ArrowDown")
      return;
    e.preventDefault();
    const next: PaneTab = tab === "guide" ? "cheatsheet" : "guide";
    setTab(next);
    tablistRef.current?.querySelectorAll<HTMLButtonElement>("[role='tab']")[next === "guide" ? 0 : 1]?.focus();
  }

  return (
    <div className="flex h-full flex-col">
      {/* Sub-tab bar — same segmented style as the dock's own tab bar */}
      <div className="shrink-0 border-b border-border px-2 py-1.5">
        <div
          ref={tablistRef}
          role="tablist"
          aria-label="Docs sections"
          onKeyDown={onTablistKeyDown}
          className="flex items-center gap-0.5 rounded-lg border border-border bg-background/60 p-0.5"
        >
          <PaneTabButton
            active={tab === "guide"}
            onClick={() => setTab("guide")}
            icon={BookOpen}
            label="Mesivta Docs"
            tabId="docs-tab-guide"
            panelId="docs-panel-guide"
          />
          <PaneTabButton
            active={tab === "cheatsheet"}
            onClick={() => setTab("cheatsheet")}
            icon={FileText}
            label="Cheatsheet"
            tabId="docs-tab-cheatsheet"
            panelId="docs-panel-cheatsheet"
          />
        </div>
      </div>

      {/* Panels — kept mounted so guide state survives switching */}
      <div
        id="docs-panel-guide"
        role="tabpanel"
        aria-labelledby="docs-tab-guide"
        hidden={tab !== "guide"}
        className="min-h-0 flex-1 overflow-hidden"
      >
        <CodingGuide compact />
      </div>
      <div
        id="docs-panel-cheatsheet"
        role="tabpanel"
        aria-labelledby="docs-tab-cheatsheet"
        hidden={tab !== "cheatsheet"}
        className="min-h-0 flex-1 overflow-hidden"
      >
        <div className="flex h-full flex-col">
          {/* Which PDF */}
          <div className="shrink-0 border-b border-border px-2 py-1.5">
            <div className="flex items-center gap-0.5 rounded-lg border border-border bg-background/60 p-0.5">
              {(Object.keys(SHEETS) as CheatSheet[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={sheet === key}
                  onClick={() => setSheet(key)}
                  className={cn(
                    "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-all duration-150 focus-visible:outline focus-visible:outline-1.5 focus-visible:outline-accent",
                    sheet === key
                      ? "bg-accent-soft text-foreground shadow-[inset_0_0_0_1px_hsl(var(--accent)/0.35)]"
                      : "text-muted hover:bg-panel-2 hover:text-foreground",
                  )}
                >
                  <FileText className={cn("size-3.5", sheet === key ? "text-accent" : "")} />
                  {SHEETS[key].label}
                </button>
              ))}
            </div>
          </div>
          <iframe
            key={sheet}
            title={`${SHEETS[sheet].label} cheatsheet`}
            src={`${SHEETS[sheet].src}#view=FitH`}
            className="min-h-0 flex-1 border-0 bg-panel-2"
          />
        </div>
      </div>
    </div>
  );
}

function PaneTabButton({
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