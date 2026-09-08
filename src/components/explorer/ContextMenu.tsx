"use client";

import { useEffect, useRef } from "react";
import { FilePlus, FolderPlus, Pencil, Trash2 } from "lucide-react";
import type { FileDTO } from "@/lib/api/client";

export interface ContextMenuState {
  x: number;
  y: number;
  node: FileDTO | null;
}

interface Props {
  state: ContextMenuState;
  onClose: () => void;
  onCreateFile: (parent: string | null) => void;
  onCreateFolder: (parent: string | null) => void;
  onRename: (node: FileDTO) => void;
  onDelete: (node: FileDTO) => void;
}

export function ContextMenu({ state, onClose, onCreateFile, onCreateFolder, onRename, onDelete }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onClose]);

  const { node } = state;
  // clamp position
  const x = Math.min(state.x, window.innerWidth - 240);
  const y = Math.min(state.y, window.innerHeight - 300);

  return (
    <div
      ref={ref}
      className="fixed z-[100] w-56 overflow-hidden rounded-lg border border-border bg-panel py-1.5 shadow-pop"
      style={{ left: x, top: y }}
    >
      {node && (
        <>
          <MenuItem icon={<Pencil className="size-4" />} label="Rename" onClick={() => { onRename(node); onClose(); }} />
          <MenuItem icon={<Trash2 className="size-4" />} label="Delete" danger onClick={() => { onDelete(node); onClose(); }} />
          <div className="my-1.5 h-px bg-border" />
        </>
      )}
      <MenuItem
        icon={<FilePlus className="size-4" />}
        label="New file"
        onClick={() => { onCreateFile(node?.type === "folder" ? node.id : null); onClose(); }}
      />
      <MenuItem
        icon={<FolderPlus className="size-4" />}
        label="New folder"
        onClick={() => { onCreateFolder(node?.type === "folder" ? node.id : null); onClose(); }}
      />
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium hover:bg-panel-2 ${
        danger ? "text-danger hover:bg-danger/10" : "text-foreground"
      }`}
    >
      <span className={danger ? "text-danger" : "text-accent"}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}