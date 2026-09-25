"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useTerminalStore } from "@/stores/useTerminalStore";
import { useProjectStore } from "@/stores/useProjectStore";
import {
  Monitor,
  Smartphone,
  Tablet,
  RefreshCw,
  ExternalLink,
  Globe,
} from "lucide-react";

const DEVICE_PRESETS = [
  { label: "Desktop", icon: Monitor, width: undefined },
  { label: "Tablet", icon: Tablet, width: 768 },
  { label: "Mobile", icon: Smartphone, width: 375 },
] as const;

export function LivePreview() {
  const serverRunning = useTerminalStore((s) => s.serverRunning);
  const serverPort = useTerminalStore((s) => s.serverPort);
  const project = useProjectStore((s) => s.current);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [deviceWidth, setDeviceWidth] = useState<number | undefined>(undefined);

  const reload = useCallback(() => {
    setPreviewKey((k) => k + 1);
  }, []);

  // Auto-reload when project files change (via key increment)
  // The parent component can trigger this

  if (!project) {
    return <div className="flex h-full items-center justify-center text-xs text-muted-2">No project</div>;
  }

  if (!serverRunning) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-2">
        <Globe className="size-10 opacity-30" />
        <span>No server running</span>
        <span className="text-xs text-muted-2/70">Start your site with <code className="rounded bg-panel-2 px-1.5 py-0.5 font-mono text-xs">npm start</code> in the terminal</span>
      </div>
    );
  }

  // Keep the trailing slash so relative asset URLs in index.html resolve
  // beneath this project's virtual server path.
  const previewUrl = `/api/serve/${project.id}/`;

  // For display, show simulated localhost URL
  const displayUrl = `http://localhost:${serverPort}`;

  return (
    <div className="flex h-full flex-col bg-[#1a1a2e]">
      {/* Address bar */}
      <div className="flex items-center gap-2 border-b border-[#2d2d44] bg-[#16162a] px-3 py-1.5">
        <button
          onClick={reload}
          className="flex h-6 w-6 items-center justify-center rounded hover:bg-[#2d2d44] text-[#888] hover:text-[#ddd] transition-colors"
          title="Refresh preview"
        >
          <RefreshCw size={13} />
        </button>

        <div className="flex flex-1 items-center rounded bg-[#0d0d12] px-2 py-1 text-xs text-[#888] font-mono">
          <span className="truncate">{displayUrl}</span>
        </div>

        {/* Device width toggles */}
        <div className="flex items-center gap-0.5">
          {DEVICE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => setDeviceWidth(preset.width)}
              className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${
                deviceWidth === preset.width
                  ? "bg-[#2d2d44] text-[#00b3ff]"
                  : "hover:bg-[#2d2d44] text-[#666] hover:text-[#aaa]"
              }`}
              title={preset.label}
            >
              <preset.icon size={13} />
            </button>
          ))}
        </div>

        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-6 w-6 items-center justify-center rounded hover:bg-[#2d2d44] text-[#888] hover:text-[#ddd] transition-colors"
          title="Open in new tab"
        >
          <ExternalLink size={13} />
        </a>
      </div>

      {/* Preview iframe */}
      <div className="flex flex-1 items-start justify-center overflow-auto bg-[#1a1a2e] p-2">
        <div
          className="relative bg-white transition-all duration-200"
          style={{
            width: deviceWidth ? `${deviceWidth}px` : "100%",
            maxWidth: "100%",
            height: "100%",
            boxShadow: deviceWidth
              ? "0 4px 24px rgba(0,0,0,0.4)"
              : "none",
            borderRadius: deviceWidth ? "8px" : "0",
            overflow: "hidden",
          }}
        >
          <iframe
            key={previewKey}
            ref={iframeRef}
            src={previewUrl}
            className="h-full w-full border-0"
            sandbox="allow-scripts allow-modals"
            title="Live Preview"
          />
        </div>
      </div>
    </div>
  );
}