"use client";

import { Eye } from "lucide-react";
import { Markdown } from "@/components/ai/Markdown";

interface MarkdownPreviewProps {
  content: string;
  fileName: string;
}

/** Live-rendered markdown view shown beside the editor for .md files. */
export function MarkdownPreview({ content, fileName }: { content: string; fileName: string }) {
  return (
    <div className="flex h-full min-w-0 flex-col border-l border-border bg-[#0d0d12]">
      <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-border bg-panel px-3">
        <Eye className="size-3.5 text-accent" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
          Preview
        </span>
        <span className="truncate text-[11px] text-muted-2">{fileName}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <Markdown content={content || "*Nothing to preview yet — start typing.*"} />
      </div>
    </div>
  );
}