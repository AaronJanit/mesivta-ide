"use client";

import { create } from "zustand";

// Mirror of the server ScanResult / SyntaxIssue shape (client-safe subset).
export type DebugLanguage = "html" | "css" | "javascript";

export interface SyntaxIssue {
  fileId: string;
  path: string;
  name: string;
  language: DebugLanguage;
  line: number;
  column: number;
  message: string;
  excerpt: string;
  snippet: string;
}

export interface ScanResult {
  issues: SyntaxIssue[];
  fileCount: number;
  checkedCount: number;
}

interface DebugState {
  /** The latest scan result for the current project, or null if not scanned. */
  result: ScanResult | null;
  /** True while a scan is in flight. */
  loading: boolean;
  /** Error message if the last scan failed. */
  error: string | null;
  /** Whether to auto-rescan when the file tree changes. */
  autoOnTreeChange: boolean;
  /** The projectId the current result corresponds to. */
  projectId: string | null;

  setResult: (r: ScanResult | null) => void;
  setLoading: (b: boolean) => void;
  setError: (e: string | null) => void;
  setAutoOnTreeChange: (b: boolean) => void;
  setProjectId: (id: string | null) => void;
  reset: () => void;
}

export const useDebugStore = create<DebugState>((set) => ({
  result: null,
  loading: false,
  error: null,
  autoOnTreeChange: true,
  projectId: null,

  setResult: (result) => set({ result }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setAutoOnTreeChange: (autoOnTreeChange) => set({ autoOnTreeChange }),
  setProjectId: (projectId) => set({ projectId }),
  reset: () => set({ result: null, loading: false, error: null, projectId: null }),
}));

/** Number of issues in the current scan, or 0 if none/not scanned. */
export const selectIssueCount = (s: DebugState): number => s.result?.issues.length ?? 0;