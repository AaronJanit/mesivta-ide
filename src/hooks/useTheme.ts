"use client";

import { useEffect, useState } from "react";

export type ThemeMode = "dark" | "light";

const STORAGE_KEY = "ide-theme";

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "light") {
    root.classList.add("light");
  } else {
    root.classList.remove("light");
  }
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    const stored = (typeof localStorage !== "undefined"
      ? localStorage.getItem(STORAGE_KEY)
      : null) as ThemeMode | null;
    const initial: ThemeMode = stored ?? "dark";
    setMode(initial);
    applyTheme(initial);
  }, []);

  function toggle() {
    setMode((prev) => {
      const next: ThemeMode = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  }

  return { mode, toggle };
}