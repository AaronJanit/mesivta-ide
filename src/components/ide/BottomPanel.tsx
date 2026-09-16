"use client";

import { TerminalSquare } from "lucide-react";
import { TerminalPanel } from "@/components/terminal/TerminalPanel";

export function BottomPanel() {
  return (
    <div className="flex h-full flex-col bg-[#0d0d12]">
      {/* Tab bar */}
      <div className="flex items-center border-b border-[#2d2d44] bg-[#16162a]">
        <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 border-[#00b3ff] text-[#ddd]">
          <TerminalSquare size={13} />
          Terminal
        </div>
      </div>

      {/* Terminal content */}
      <div className="flex-1 overflow-hidden">
        <TerminalPanel />
      </div>
    </div>
  );
}