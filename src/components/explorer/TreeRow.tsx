"use client";

import { ChevronRight, ChevronDown, File, FileCode, FileJson, FileText, Image as ImageIcon, FileCog, Braces } from "lucide-react";
import { iconForFile } from "@/lib/fileIcons";
import { languageForFile } from "@/lib/languages";
import { useEditorStore } from "@/stores/useEditorStore";
import type { FileDTO } from "@/lib/api/client";

const ICONS = {
  file: File,
  "file-code": FileCode,
  "file-json": FileJson,
  "file-text": FileText,
  image: ImageIcon,
  "file-cog": FileCog,
  braces: Braces,
} as const;

interface TreeRowProps {
  node: any;          // react-arborist NodeApi
  tree: any;          // react-arborist TreeApi
  style: React.CSSProperties;
  dragHandle: any;
}

export function TreeRow({ node, tree, style, dragHandle }: TreeRowProps) {
  const open = useEditorStore((s) => s.open);
  const activeFileId = useEditorStore((s) => s.activeFileId);
  const tabs = useEditorStore((s) => s.tabs);

  // react-arborist's NodeApi wraps the raw data on `node.data`.
  const data = (node.data ?? {}) as FileDTO;
  const isFolder = data.type === "folder";
  const isActive = !isFolder && activeFileId === data.id;
  const isOpen = node.isOpen;
  const tab = tabs.find((t) => t.fileId === data.id);
  const dirty = tab?.dirty ?? false;

  const iconSpec = iconForFile(data.name);
  const Icon = ICONS[iconSpec.icon];

  function onClick(e: React.MouseEvent) {
    if (isFolder) {
      tree.toggle(node.id);
    } else {
      open({
        fileId: data.id,
        name: data.name,
        content: data.content ?? "",
        language: languageForFile(data.name),
        dirty: false,
      });
    }
  }

  return (
    <div
      ref={dragHandle}
      style={style}
      onClick={onClick}
      className={`group flex cursor-pointer items-center gap-1 py-0.5 pr-2 text-xs ${
        isActive ? "bg-panel-2 text-foreground" : "hover:bg-panel-2/60 text-foreground/90"
      }`}
      title={data.name}
    >
      <span className="flex w-3.5 shrink-0 items-center justify-center">
        {isFolder ? (
          isOpen ? <ChevronDown className="size-3 text-muted" /> : <ChevronRight className="size-3 text-muted" />
        ) : null}
      </span>
      <Icon className={`size-3.5 shrink-0 ${iconSpec.color ?? "text-muted"}`} />
      <span className="flex-1 truncate">{data.name}</span>
      {dirty && <span className="size-1.5 shrink-0 rounded-full bg-accent" title="Unsaved" />}
    </div>
  );
}