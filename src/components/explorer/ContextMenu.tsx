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
  const x = Math.min(state.x, window.innerWidth - 200);
  const y = Math.min(state.y, window.innerHeight - 220);

  return (
    <div
      ref={ref}
      className="fixed z-[100] w-44 overflow-hidden rounded-md border border-border bg-panel py-1 text-xs shadow-pop"
      style={{ left: x, top: y }}
    >
      {node && (
        <>
          <MenuItem icon={<Pencil className="size-3.5" />} label="Rename" onClick={() => { onRename(node); onClose(); }} />
          <MenuItem icon={<Trash2 className="size-3.5" />} label="Delete" danger onClick={() => { onDelete(node); onClose(); }} />
          <div className="my-1 h-px bg-border" />
        </>
      )}
      <MenuItem
        icon={<FilePlus className="size-3.5" />}
        label="New file"
        onClick={() => { onCreateFile(node?.type === "folder" ? node.id : null); onClose(); }}
      />
      <MenuItem
        icon={<FolderPlus className="size-3.5" />}
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
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-panel-2 ${
        danger ? "text-danger hover:bg-danger/10" : "text-foreground"
      }`}
    >
      <span className="text-muted">{icon}</span>
      <span>{label}</span>
    </button>
  );
}