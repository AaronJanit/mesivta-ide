"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, FolderPlus, BookOpen, FileCode, Check, X, FilePlus, Globe, Bug, MessageSquare } from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";
import { useEditorStore, WELCOME_TAB_ID } from "@/stores/useEditorStore";
import { useFileStore } from "@/stores/useFileStore";
import { languageForFile } from "@/lib/languages";

export function WelcomePanel() {
  const { projects, current, createProject } = useProjectStore();
  const closeTab = useEditorStore((s) => s.close);
  const openTab = useEditorStore((s) => s.open);
  const { createFile } = useFileStore();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  useEffect(() => {
    if (current) setNewFileName("");
  }, [current?.id]);

  async function submitCreate() {
    const name = newName.trim();
    if (!name) return;
    await createProject(name);
    setNewName("");
    setCreating(false);
    closeTab(WELCOME_TAB_ID);
  }

  async function submitCreateFile() {
    const name = newFileName.trim();
    if (!name || !current) return;
    try {
      const node = await createFile(current.id, null, name, "file");
      openTab({
        fileId: node.id,
        name: node.name,
        content: node.content ?? "",
        language: languageForFile(node.name),
        dirty: false,
      });
      closeTab(WELCOME_TAB_ID);
    } catch (e) {
      console.error("createFile failed", e);
    }
  }

  // No project selected — show the "create a project" welcome
  if (!current) {
    return (
    <div className="flex h-full overflow-auto bg-editor">
      <div className="mx-auto max-w-2xl px-10 py-16">
        {/* Hero */}
        <div className="mb-8 flex items-center gap-4">
          <img
            src="/white-logo.png"
            alt="Mesivta IDE logo"
            width={56}
            height={66}
            className="drop-shadow-[0_2px_12px_rgba(0,179,255,0.3)]"
          />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Welcome to Mesivta IDE</h1>
            <p className="mt-1 text-sm text-muted">
              A browser-based coding environment. Write, preview, and debug — all in one place.
            </p>
          </div>
        </div>

        {/* Create a new project */}
        <section className="mb-8 rounded-lg border border-border bg-panel p-6">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="size-4 text-accent" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
              Get Started
            </h2>
          </div>

          {projects.length > 0 && (
            <p className="mb-4 text-sm text-muted">
              You have <span className="text-foreground">{projects.length}</span> project
              {projects.length === 1 ? "" : "s"}. Current project:{" "}
              <span className="text-foreground">{current?.name}</span>
            </p>
          )}

          {creating ? (
            <div className="flex items-center gap-2">
              <FolderPlus className="size-4 text-accent" />
              <input
                ref={inputRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitCreate();
                  if (e.key === "Escape") {
                    setCreating(false);
                    setNewName("");
                  }
                }}
                placeholder="Project name…"
                className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
              <button
                onClick={submitCreate}
                className="rounded bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
              >
                <Check className="size-4" />
              </button>
              <button
                onClick={() => {
                  setCreating(false);
                  setNewName("");
                }}
                className="rounded border border-border px-3 py-2 text-sm text-muted hover:bg-panel-2"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg transition hover:opacity-90"
            >
              <FolderPlus className="size-4" />
              Create a new project
            </button>
          )}
        </section>

        {/* Quick tips */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TipCard
            icon={<FileCode className="size-4 text-accent" />}
            title="Write code"
            description="Create HTML, CSS, and JavaScript files. Edit them in our easy code editor."
          />
          <TipCard
            icon={<BookOpen className="size-4 text-accent" />}
            title="Learn the basics"
            description="New to coding? Open the Coding Guide from the activity bar for beginner-friendly lessons with live previews."
          />
        </section>

        {/* Features list */}
        <section className="mt-8 rounded-lg border border-border bg-panel p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-foreground">
            What you can do
          </h2>
          <ul className="space-y-2.5 text-sm text-muted">
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-success" />
              Create and manage multiple projects with a file tree
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-success" />
              Live preview your HTML/CSS/JS in a sandboxed iframe
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-success" />
              Ask the AI assistant for help — it can explain code and suggest fixes
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-success" />
              Run a syntax scan to catch errors in your HTML, CSS, and JavaScript
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-success" />
              Everything saves automatically — just start typing
            </li>
          </ul>
        </section>
      </div>
    </div>
    );
  }

  // Project selected — show project welcome with editor info + create file
  return (
    <div className="flex h-full overflow-auto bg-editor">
      <div className="mx-auto max-w-2xl px-10 py-16">
        {/* Hero */}
        <div className="mb-8 flex items-center gap-4">
          <img
            src="/white-logo.png"
            alt="Mesivta IDE logo"
            width={48}
            height={57}
            className="drop-shadow-[0_2px_12px_rgba(0,179,255,0.3)]"
          />
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome to your project
            </h1>
            <p className="mt-1 text-sm text-muted">
              You're working in <span className="text-foreground">{current.name}</span>. Let's start
              coding!
            </p>
          </div>
        </div>

        {/* Create your first file */}
        <section className="mb-8 rounded-lg border border-border bg-panel p-6">
          <div className="mb-4 flex items-center gap-2">
            <FilePlus className="size-4 text-accent" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
              Create a file
            </h2>
          </div>
          <p className="mb-4 text-sm text-muted">
            Files are where your code lives. Start with an{" "}
            <code className="rounded bg-panel-2 px-1 py-0.5 text-xs text-foreground">index.html</code>{" "}
            file — it's the entry point for any website.
          </p>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitCreateFile();
                if (e.key === "Escape") setNewFileName("");
              }}
              placeholder="e.g. index.html"
              className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
            <button
              onClick={submitCreateFile}
              disabled={!newFileName.trim()}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:opacity-90 disabled:opacity-40"
            >
              <FilePlus className="size-4" />
              Create file
            </button>
          </div>
        </section>

        {/* About the editor */}
        <section className="mb-8 rounded-lg border border-border bg-panel p-6">
          <div className="mb-4 flex items-center gap-2">
            <FileCode className="size-4 text-accent" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
              The Text Editor
            </h2>
          </div>
          <p className="mb-4 text-sm text-muted">
            Click any file in the sidebar to open it in the editor. The editor supports syntax
            highlighting for HTML, CSS, JavaScript, and more. Just start typing — your work saves
            automatically as you go.
          </p>
          <ul className="space-y-2.5 text-sm text-muted">
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-success" />
              <span>
                <span className="text-foreground">Open a file</span> — click any file in the Explorer
                panel on the left
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-success" />
              <span>
                <span className="text-foreground">Create more files</span> — use the "New file" button
                in the Explorer toolbar at the top of the sidebar
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-success" />
              <span>
                <span className="text-foreground">Organize with folders</span> — use the "New folder"
                button next to "New file"
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-success" />
              <span>
                <span className="text-foreground">Switch tabs</span> — each open file shows as a tab at
                the top of the editor
              </span>
            </li>
          </ul>
        </section>

        {/* Other features */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FeatureCard
            icon={<Globe className="size-4 text-accent" />}
            title="Live Preview"
            description="Click the Preview tab to see your HTML/CSS/JS rendered live in a sandboxed iframe."
          />
          <FeatureCard
            icon={<MessageSquare className="size-4 text-accent" />}
            title="AI Assistant"
            description="Ask the AI chatbot on the right for help — it can explain code, suggest fixes, and more."
          />
          <FeatureCard
            icon={<Bug className="size-4 text-accent" />}
            title="Debug"
            description="Click the bug icon in the activity bar to run a syntax scan and catch errors in your code."
          />
        </section>

        {/* Learn more */}
        <section className="mt-8 rounded-lg border border-border bg-panel p-6">
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="size-4 text-accent" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
              New to coding?
            </h2>
          </div>
          <p className="text-sm text-muted">
            Open the{" "}
            <span className="text-foreground">Coding Guide</span> from the activity bar (the book icon
            on the left) for step-by-step lessons on HTML, CSS, and JavaScript — with live previews
            and beginner-friendly explanations.
          </p>
        </section>
      </div>
    </div>
  );
}

function TipCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>
      <p className="text-xs leading-relaxed text-muted">{description}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>
      <p className="text-xs leading-relaxed text-muted">{description}</p>
    </div>
  );
}