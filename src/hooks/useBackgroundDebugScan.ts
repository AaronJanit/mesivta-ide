"use client";

import { useEffect } from "react";
import { useProjectStore } from "@/stores/useProjectStore";
import { useFileStore } from "@/stores/useFileStore";
import { useDebugStore, type ScanResult } from "@/stores/useDebugStore";

/**
 * Keeps the debug store's scan result up to date for the current project,
 * regardless of whether the DebugPanel is mounted. This drives the pulsing
 * red badge on the Debug activity-bar icon.
 *
 * Re-scans when the project changes or the file tree changes (if auto-rescan
 * is on). setState happens inside the async fetch (after `await`), never
 * synchronously in the effect body.
 */
export function useBackgroundDebugScan() {
  const current = useProjectStore((s) => s.current);
  const fileVersion = useFileStore((s) => s.tree);
  const autoOnTreeChange = useDebugStore((s) => s.autoOnTreeChange);
  const scannedProjectId = useDebugStore((s) => s.projectId);

  useEffect(() => {
    if (!current) return;
    if (!autoOnTreeChange) {
      // With auto off, only scan once per project (the DebugPanel's own
      // mount effect handles the explicit one-time scan). Skip here unless
      // we've never scanned this project.
      if (scannedProjectId === current.id) return;
    }

    let cancelled = false;
    const run = async () => {
      useDebugStore.getState().setLoading(true);
      useDebugStore.getState().setError(null);
      try {
        const res = await fetch(`/api/debug/check?projectId=${encodeURIComponent(current.id)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const data = (await res.json().catch(() => ({}))) as ScanResult & { error?: string };
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
        useDebugStore.getState().setResult(data);
        useDebugStore.getState().setProjectId(current.id);
      } catch (e) {
        if (cancelled) return;
        useDebugStore.getState().setError((e as Error).message ?? "Scan failed");
        useDebugStore.getState().setResult(null);
        useDebugStore.getState().setProjectId(current.id);
      } finally {
        if (!cancelled) useDebugStore.getState().setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, fileVersion, autoOnTreeChange]);

  // Clear results when the project is unset.
  useEffect(() => {
    if (!current) {
      const id = setTimeout(() => {
        useDebugStore.getState().setResult(null);
        useDebugStore.getState().setProjectId(null);
      }, 0);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);
}