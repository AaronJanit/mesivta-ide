"use client";

import { useEffect, useRef } from "react";
import { useTerminalStore } from "@/stores/useTerminalStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useFileStore } from "@/stores/useFileStore";
import { resolvePath, listDir } from "@/lib/terminal/pathUtils";
import type { Terminal as XTerm } from "@xterm/xterm";

const COMMANDS = [
  "cd", "pwd", "ls", "mkdir", "touch", "cat", "rm", "mv", "echo",
  "clear", "help", "man", "code", "npm", "whoami", "date", "hostname",
  "uname", "which", "tree",
];

// xterm must be dynamically imported — it uses browser-only APIs
export function TerminalPanel() {
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const inputRef = useRef<string>("");
  const historyNavIndex = useRef<number>(-1);
  const lastHistoryLen = useRef<number>(0);

  const execute = useTerminalStore((s) => s.execute);
  const killServer = useTerminalStore((s) => s.killServer);
  const init = useTerminalStore((s) => s.init);
  const history = useTerminalStore((s) => s.history);
  const project = useProjectStore((s) => s.current);
  const projectName = project?.name ?? "project";

  // Write output from history changes (new entries added by execute())
  useEffect(() => {
    const term = xtermRef.current;
    if (!term) return;

    // Write only new history entries since last render
    const newEntries = history.slice(lastHistoryLen.current);
    let hasNewOutput = false;
    for (const entry of newEntries) {
      if (!entry.isCommand) {
        // Output line — write to terminal
        term.write(entry.text + "\r\n");
        hasNewOutput = true;
      }
      // Command lines are already written by the key handler, skip them
    }
    lastHistoryLen.current = history.length;

    // After writing output, write a new prompt
    if (hasNewOutput) {
      writePrompt(term);
    }
  }, [history]);

  // Reinitialize when project changes
  useEffect(() => {
    if (project) {
      init(project.name);
      lastHistoryLen.current = 0;
      const term = xtermRef.current;
      if (term) {
        term.clear();
        term.write("\x1b[1;36mProject changed: " + project.name + "\x1b[0m\r\n");
        writePrompt(term);
      }
    }
  }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize xterm on mount
  useEffect(() => {
    if (!termRef.current) return;
    let disposed = false;

    const initTerm = async () => {
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");

      if (disposed || !termRef.current) return;

      const term = new Terminal({
        fontSize: 13,
        fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
        lineHeight: 1.3,
        cursorBlink: true,
        cursorStyle: "block",
        theme: {
          background: "#0d0d12",
          foreground: "#d4d4d4",
          cursor: "#00b3ff",
          cursorAccent: "#0d0d12",
          selectionBackground: "#264f78",
          black: "#0d0d12",
          red: "#ff6b6b",
          green: "#4ec9b0",
          yellow: "#dcdcaa",
          blue: "#569cd6",
          magenta: "#c586c0",
          cyan: "#4ec9b0",
          white: "#d4d4d4",
          brightBlack: "#666666",
          brightRed: "#ff8c8c",
          brightGreen: "#6ecfb0",
          brightYellow: "#f0e68c",
          brightBlue: "#6ba3d6",
          brightMagenta: "#d6a0e0",
          brightCyan: "#6ecfb0",
          brightWhite: "#ffffff",
        },
        scrollback: 1000,
        convertEol: true,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(termRef.current);
      fitAddon.fit();

      xtermRef.current = term;

      // Handle resize
      const resizeObserver = new ResizeObserver(() => {
        fitAddon.fit();
      });
      resizeObserver.observe(termRef.current);

      // Handle input
      term.onKey(({ key, domEvent }) => {
        const ev = domEvent;

        // Ctrl+C — kill server or cancel current input
        if (ev.ctrlKey && ev.key === "c") {
          const store = useTerminalStore.getState();
          if (store.serverRunning) {
            store.killServer();
          }
          term.write("^C\r\n");
          writePrompt(term);
          inputRef.current = "";
          historyNavIndex.current = -1;
          return;
        }

        // Ctrl+L — clear screen
        if (ev.ctrlKey && ev.key === "l") {
          term.clear();
          writePrompt(term);
          return;
        }

        // Enter — execute command
        if (ev.key === "Enter") {
          const line = inputRef.current;
          inputRef.current = "";
          historyNavIndex.current = -1;
          term.write("\r\n");

          // Execute async — output will be written via history effect
          execute(line);
          return;
        }

        // Backspace
        if (ev.key === "Backspace") {
          if (inputRef.current.length > 0) {
            inputRef.current = inputRef.current.slice(0, -1);
            term.write("\b \b");
          }
          return;
        }

        // Up arrow — command history
        if (ev.key === "ArrowUp") {
          const store = useTerminalStore.getState();
          const cmds = store.commandHistory;
          if (cmds.length === 0) return;
          const newIndex = Math.min(
            historyNavIndex.current === -1 ? cmds.length - 1 : historyNavIndex.current - 1,
            cmds.length - 1,
          );
          if (newIndex < 0) return;
          historyNavIndex.current = newIndex;
          // Clear current input and replace with history item
          const currentInput = inputRef.current;
          if (currentInput.length > 0) {
            term.write(`\x1b[${currentInput.length}D\x1b[0J`);
          }
          inputRef.current = cmds[newIndex];
          term.write(inputRef.current);
          return;
        }

        // Down arrow — command history
        if (ev.key === "ArrowDown") {
          const store = useTerminalStore.getState();
          const cmds = store.commandHistory;
          if (historyNavIndex.current === -1) return;
          const newIndex = historyNavIndex.current + 1;
          const currentInput = inputRef.current;
          if (currentInput.length > 0) {
            term.write(`\x1b[${currentInput.length}D\x1b[0J`);
          }
          if (newIndex >= cmds.length) {
            historyNavIndex.current = -1;
            inputRef.current = "";
          } else {
            historyNavIndex.current = newIndex;
            inputRef.current = cmds[newIndex];
            term.write(inputRef.current);
          }
          return;
        }

        // Tab — autocomplete
        if (ev.key === "Tab") {
          const partial = inputRef.current;
          const store = useTerminalStore.getState();
          const completions = getCompletions(partial, store.cwd, useFileStore.getState().tree);
          if (completions.length === 1) {
            const completion = completions[0];
            const currentInput = inputRef.current;
            if (currentInput.length > 0) {
              term.write(`\x1b[${currentInput.length}D\x1b[0J`);
            }
            inputRef.current = completion;
            term.write(inputRef.current);
          } else if (completions.length > 1) {
            term.write("\r\n");
            term.write(completions.join("  ") + "\r\n");
            writePrompt(term);
            term.write(inputRef.current);
          }
          return;
        }

        // Regular printable character
        if (key.length === 1 && !ev.ctrlKey && !ev.altKey && !ev.metaKey) {
          inputRef.current += key;
          term.write(key);
        }
      });

      // Write welcome + prompt
      term.write("\x1b[1;36mWelcome to Mesivta IDE Terminal\x1b[0m\r\n");
      term.write(`Project: ${projectName}\r\n`);
      term.write("Type \x1b[1mhelp\x1b[0m for available commands.\r\n\r\n");
      writePrompt(term);
      term.focus();
    };

    initTerm();

    return () => {
      disposed = true;
      xtermRef.current?.dispose();
      xtermRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-full flex-col bg-[#0d0d12]">
      <div ref={termRef} className="flex-1 overflow-hidden px-1 pt-1" />
    </div>
  );
}

function writePrompt(term: XTerm) {
  const store = useTerminalStore.getState();
  const project = useProjectStore.getState().current;
  const projectName = project?.name ?? "project";
  const display = store.cwd === "/" ? `/${projectName}` : `/${projectName}${store.cwd}`;
  term.write(`\x1b[1;34m${display}\x1b[0m $ `);
}

function getCompletions(partial: string, cwd: string, tree: any): string[] {
  // Command completions (no space in input)
  if (!partial.includes(" ")) {
    return COMMANDS.filter((c) => c.startsWith(partial));
  }

  // File/directory completions for arguments
  const parts = partial.split(/\s+/);
  const lastArg = parts[parts.length - 1] ?? "";
  const dir = lastArg.includes("/") ? lastArg.substring(0, lastArg.lastIndexOf("/") + 1) : "";
  const prefix = lastArg.includes("/") ? lastArg.substring(lastArg.lastIndexOf("/") + 1) : lastArg;
  const resolvedDir = resolvePath(cwd, dir || ".");
  const entries = listDir(resolvedDir, tree);

  if (!entries) return [];

  return entries
    .filter((e: any) => e.name.toLowerCase().startsWith(prefix.toLowerCase()))
    .map((e: any) => {
      const base = [...parts.slice(0, -1), dir + e.name + (e.type === "folder" ? "/" : "")].join(" ");
      return base;
    });
}