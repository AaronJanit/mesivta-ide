"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCw } from "lucide-react";
import { useFileStore } from "@/stores/useFileStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { buildPreview } from "@/lib/preview/buildPreview";

export function PreviewPanel() {
  const tree = useFileStore((s) => s.tree);
  const loading = useFileStore((s) => s.loading);
  const current = useProjectStore((s) => s.current);
  const [version, setVersion] = useState(0);

  // Auto-refresh: rebuild srcDoc when tree changes (debounced via effect)
  useEffect(() => {
    const t = setTimeout(() => setVersion((v) => v + 1), 400);
    return () => clearTimeout(t);
  }, [tree]);

  const srcDoc = useMemo(() => buildPreview(tree), [tree, version]);

  if (!current) {
    return <div className="flex h-full items-center justify-center text-xs text-muted-2">No project</div>;
  }
  if (loading) {
    return <div className="flex h-full items-center justify-center text-xs text-muted-2">Loading…</div>;
  }
  if (!srcDoc) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-muted-2">
        <span>No index.html</span>
        <span className="text-muted-2/70">Add an index.html to see a preview</span>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col bg-background">
      <iframe
        key={version}
        sandbox="allow-scripts allow-modals"
        srcDoc={srcDoc}
        className="flex-1 border-0 bg-white"
        title="Preview"
      />
      <button
        onClick={() => setVersion((v) => v + 1)}
        className="absolute right-2 top-2 z-10 rounded bg-panel/80 p-1 text-muted shadow-sm backdrop-blur hover:bg-panel-2 hover:text-foreground"
        title="Refresh preview"
      >
        <RotateCw className="size-3" />
      </button>
    </div>
  );
}