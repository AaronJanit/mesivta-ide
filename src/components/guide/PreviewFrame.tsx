"use client";

import { useState } from "react";
import { Eye, EyeOff, RotateCw } from "lucide-react";

interface PreviewFrameProps {
  html: string;
  title?: string;
}

/**
 * Sandboxed <iframe> preview of a complete HTML document.
 * Used to show learners what the example code actually renders.
 */
export function PreviewFrame({ html, title = "Preview" }: PreviewFrameProps) {
  const [visible, setVisible] = useState(true);
  // srcDoc key lets users force-reload the iframe (re-runs scripts).
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-border bg-panel">
      <div className="flex h-8 items-center justify-between border-b border-border px-3">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-2">
          <Eye className="size-3.5" />
          {title}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="rounded p-1 text-muted hover:bg-panel-2 hover:text-foreground"
            title="Reload preview"
            aria-label="Reload preview"
          >
            <RotateCw className="size-3.5" />
          </button>
          <button
            onClick={() => setVisible((v) => !v)}
            className="rounded p-1 text-muted hover:bg-panel-2 hover:text-foreground"
            title={visible ? "Hide preview" : "Show preview"}
            aria-label={visible ? "Hide preview" : "Show preview"}
          >
            {visible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
        </div>
      </div>
      {visible && (
        <iframe
          key={reloadKey}
          srcDoc={html}
          title={title}
          sandbox="allow-scripts"
          className="h-56 w-full border-0 bg-white"
        />
      )}
    </div>
  );
}