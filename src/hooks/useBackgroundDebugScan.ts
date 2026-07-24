"use client";

import { useEffect, useRef } from "react";
import { useProjectStore } from "@/stores/useProjectStore";
import { useFileStore } from "@/stores/useFileStore";
import { useDebugStore, type ScanResult } from "@/stores/useDebugStore";

/**
 * Keeps the debug store's scan result up to date for the current project,
 * regardless of whether the DebugPanel is mounted. This drives the pulsing
 * red badge on the Debug activity-bar icon.
 *
 * - When "Auto-rescan on change" is ON (default): runs an immediate scan on
 *   project/tree changes AND sets a 3-second polling interval so edits that
 *   haven't hit the file store yet (e.g. mid-debounce typing) are still caught.
 * - When OFF: scans once per project, then only via the manual Re-scan button.
 *
 * setState happens inside the async fetch (after `await`), never synchronously
 * in the effect body.
 */
const AUTO_INTERVAL_MS = 3000;

export function useBackgroundDebugScan() {
  const current = useProjectStore((s) => s.current);
  const fileVersion = useFileStore((s) => s.tree);
  const autoOnTreeChange = useDebugStore((s) => s.autoOnTreeChange);
  const scannedProjectId = useDebugStore((s) => s.projectId);
  // Guard against overlapping scans (poll + change firing concurrently).
  const inFlight = useRef(false);

  useEffect(() => {
    if (!current) return;
    if (!autoOnTreeChange) {
      // With auto off, only scan once per project. Skip here unless we've
      // never scanned this project.
      if (scannedProjectId === current.id) return;
    }

    let cancelled = false;
    const run = async () => {
      if (inFlight.current) return;
      inFlight.current = true;
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
        inFlight.current = false;
        if (!cancelled) useDebugStore.getState().setLoading(false);
      }
    };
    void run();

    // When auto is on, also poll every 3 seconds so in-progress edits
    // (before the 800ms save debounce writes to the file store) are caught.
    let intervalId: ReturnType<typeof setInterval> | undefined;
    if (autoOnTreeChange) {
      intervalId = setInterval(() => {
        if (!cancelled) void run();
      }, AUTO_INTERVAL_MS);
    }

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
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