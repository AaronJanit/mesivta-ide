"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Plus, MessageSquare, Trash2, ChevronLeft, Send, Square, Search, Check, Pencil, Clock, Code2, X, RotateCcw, Paperclip } from "lucide-react";
import { useChatStore, DRAFT_CHAT_ID } from "@/stores/useChatStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useEditorStore } from "@/stores/useEditorStore";
import { useFileStore } from "@/stores/useFileStore";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { FileContextModal } from "./FileContextModal";
import { useStreamChat, type ActiveFileContext } from "@/hooks/useStreamChat";
import { useEditorBridge, type EditorSelection } from "@/lib/editorBridge";
import type { FileDTO } from "@/lib/api/client";
import { Markdown } from "./Markdown";

/** Build a map of fileId -> slash-separated path by walking parent_folder_id. */
function buildPathMap(tree: FileDTO[]): Map<string, string> {
  const idToNode = new Map<string, FileDTO>();
  const collect = (nodes: FileDTO[]) => {
    for (const n of nodes) {
      idToNode.set(n.id, n);
      if (n.children) collect(n.children);
    }
  };
  collect(tree);
  const memo = new Map<string, string>();
  const pathOf = (id: string): string => {
    if (memo.has(id)) return memo.get(id)!;
    const node = idToNode.get(id);
    if (!node) return "";
    const parentPath = node.parent_folder_id ? pathOf(node.parent_folder_id) : "";
    const p = parentPath ? `${parentPath}/${node.name}` : node.name;
    memo.set(id, p);
    return p;
  };
  for (const id of idToNode.keys()) pathOf(id);
  return memo;
}

export function AssistantPanel() {
  const current = useProjectStore((s) => s.current);
  const { chats, activeChatId, messages, loadChats, selectChat, createChat, deleteChat, renameChat, ensureChatPersisted, appendMessage, appendAssistantStreaming, finalizeStreaming } =
    useChatStore();
  const { streaming, send, abort } = useStreamChat();
  const tabs = useEditorStore((s) => s.tabs);
  const activeFileId = useEditorStore((s) => s.activeFileId);
  const tree = useFileStore((s) => s.tree);
  const findNode = useFileStore((s) => s.findNode);
  const [input, setInput] = useState("");
  const [viewMode, setViewMode] = useState<"conversation" | "history">("conversation");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  // ── Rate limiting ─────────────────────────────────────────────────────
  // A cooldown starts only after every PROMPTS_PER_COOLDOWN prompts, giving
  // users a burst of prompts before the wait kicks in.
  const RATE_LIMIT_MS = 2 * 60 * 1000; // 2 minutes
  const PROMPTS_PER_COOLDOWN = 5;
  const [lastSentAt, setLastSentAt] = useState(0);
  const [promptsSinceCooldown, setPromptsSinceCooldown] = useState(0);
  const [now, setNow] = useState(0);
  /** When editing: the created_at of the user prompt being re-sent. */
  const [editingFrom, setEditingFrom] = useState<string | null>(null);
  /** File ids attached as context for the next message. */
  const [attachedIds, setAttachedIds] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  /** Live selection in the editor — shown as a badge, auto-attached on send. */
  const editorSelection = useEditorBridge((s) => s.selection);
  // Tick every second so the countdown stays live while rate-limited.
  useEffect(() => {
    const remaining = lastSentAt ? RATE_LIMIT_MS - (Date.now() - lastSentAt) : 0;
    if (remaining <= 0) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lastSentAt, RATE_LIMIT_MS]);
  const rateLimited = lastSentAt > 0 && now > 0 && now - lastSentAt < RATE_LIMIT_MS;
  const remainingMs = rateLimited ? RATE_LIMIT_MS - (now - lastSentAt) : 0;
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Whether the user is currently pinned to the bottom of the messages list.
  // We only auto-scroll on new content if they're already at the bottom; if
  // they've scrolled up to read, we leave their scroll position alone.
  const stickToBottomRef = useRef(true);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 80;
  };

  // auto-scroll to bottom only when the user is already pinned there
  useEffect(() => {
    if (stickToBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // reload chats when project changes
  useEffect(() => {
    if (current) loadChats(current.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const activeChat = chats.find((c) => c.id === activeChatId);

  /** The newest user message in the current chat. */
  const lastUserMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") return messages[i];
    }
    return null;
  }, [messages]);

  /** Begin editing the most recent prompt: load it into the composer and
   *  (for persisted chats) drop it + its response from the DB on submit. */
  function startEditLast() {
    if (!lastUserMessage || sending) return;
    setInput(lastUserMessage.content);
    setEditingFrom(lastUserMessage.created_at);
    inputRef.current?.focus();
  }

  function cancelEdit() {
    setEditingFrom(null);
    setInput("");
  }

  async function submit() {
    const content = input.trim();
    if (!content || !current || !activeChatId || sending) return;
    const editing = editingFrom;
    setInput("");
    setSending(true);
    setEditingFrom(null);
    // Sending a new message: jump to the bottom so the user sees the response.
    stickToBottomRef.current = true;

    // If this is a draft (not yet persisted), create it in the DB now
    // so messages can be stored. This only happens on the first send.
    let chatId = activeChatId;
    if (chatId === DRAFT_CHAT_ID) {
      try {
        chatId = await ensureChatPersisted(current.id);
      } catch {
        setSending(false);
        return;
      }
    }

    // Editing a previous prompt: remove it and everything after it (its old
    // response) locally + in the DB, so the edited prompt is re-sent cleanly.
    if (editing) {
      // Optimistic local truncation first, using the same timestamp rule.
      truncateFrom(editing);
      try {
        if (chatId !== DRAFT_CHAT_ID) {
          await api.messages.deleteFrom(chatId, editing);
        }
      } catch {
        // Non-fatal: local view is already correct; remote cleanup failed.
      }
    }

    // optimistic: show user msg immediately
    appendMessage({
      id: `local-${Date.now()}`,
      chat_id: chatId,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    });

    // gather history (exclude the just-added local msg)
    const history = messages
      .filter((m) => !m.id.startsWith("local-"))
      .filter((m) => !editing || m.created_at < editing)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    // Build file context from editor tabs so the AI sees actual file contents.
    const pathMap = buildPathMap(tree);
    const toCtx = (t: { fileId: string; name: string; content: string; language: string }): ActiveFileContext => ({
      name: t.name,
      path: pathMap.get(t.fileId) ?? t.name,
      language: t.language,
      content: t.content,
    });
    const activeTab = tabs.find((t) => t.fileId === activeFileId) ?? null;
    const activeFile = activeTab ? toCtx(activeTab) : null;
    // Send open tabs (excluding the active one to avoid duplication).
    const openTabs = tabs
      .filter((t) => t.fileId !== activeFileId)
      .map(toCtx)
      .slice(0, 5);
    // Explicitly attached files (from the + picker) — high priority context.
    const attached = attachedIds
      .map((id) => findNode(id))
      .filter((n): n is NonNullable<typeof n> => !!n && n.type === "file")
      .map((n) => toCtx({ fileId: n.id, name: n.name, content: n.content ?? "", language: "plaintext" }));

    // Code selected in the editor at send time — highest priority context.
    const sel = editorSelection;
    const selectedCtx: ActiveFileContext | null =
      sel && sel.text.trim().length > 0
        ? {
            name: sel.fileName,
            path: `${sel.fileName}:${sel.startLine}-${sel.endLine}`,
            language: activeTab?.language ?? "plaintext",
            content: sel.text,
          }
        : null;

    const seen = new Set<string>();
    const dedupe = (list: typeof openTabs) => list.filter((f) => !seen.has(f.path) && seen.add(f.path));
    const mergedOpenTabs = [
      ...(selectedCtx ? [selectedCtx] : []),
      ...dedupe(attached),
      ...openTabs,
    ];

    await send(
      { chatId, projectId: current.id, content, history, activeFile, openTabs: mergedOpenTabs },
      {
        onDelta: (full) => appendAssistantStreaming(chatId, full),
        onDone: (_full) => {
          finalizeStreaming(chatId);
          setSending(false);
          setAttachedIds([]); // attachments are one-shot
          // Count prompts; only start the cooldown after every Nth prompt.
          bumpPromptCount();
          setNow(Date.now());
        },
        onError: (err) => {
          appendAssistantStreaming(chatId, `⚠️ ${err}`);
          finalizeStreaming(chatId);
          setSending(false);
          bumpPromptCount();
          setNow(Date.now());
        },
      },
    );
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  /** Count a completed prompt; every Nth one starts the cooldown. */
  function bumpPromptCount() {
    setPromptsSinceCooldown((count) => {
      const next = count + 1;
      if (next >= PROMPTS_PER_COOLDOWN) {
        setLastSentAt(Date.now());
        return 0;
      }
      return next;
    });
  }

  /** Destructure store actions once for use in callbacks below. */
  const truncateFrom = useChatStore((s) => s.truncateFrom);

  if (!current) {
    return (
      <div className="flex h-full items-center justify-center bg-panel text-xs text-muted-2">
        No project
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-panel">
      {/* Header: chat title + history toggle + new chat */}
      <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border px-2">
        {viewMode === "history" ? (
          <button
            onClick={() => setViewMode("conversation")}
            className="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs hover:bg-panel-2"
            title="Back to conversation"
          >
            <ChevronLeft className="size-3.5 text-muted" />
            <span className="text-foreground">Back</span>
          </button>
        ) : (
          <button
            onClick={() => setViewMode("history")}
            className="flex flex-1 items-center gap-1.5 rounded px-1.5 py-1 text-xs hover:bg-panel-2"
            title="Chat history"
          >
            <MessageSquare className="size-3.5 text-accent" />
            <span className="flex-1 truncate text-left">{activeChat?.title ?? "New chat"}</span>
            <Clock className="size-3 text-muted" />
          </button>
        )}
        <button
          onClick={() => {
            current && createChat(current.id);
            setViewMode("conversation");
          }}
          className="rounded p-1 text-muted hover:bg-panel-2 hover:text-foreground"
          title="New chat"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {/* History view */}
      {viewMode === "history" && (
        <ChatHistory
          chats={chats}
          activeChatId={activeChatId}
          search={search}
          onSearch={setSearch}
          onSelect={(id) => {
            selectChat(id);
            setViewMode("conversation");
          }}
          onRename={(id, title) => renameChat(id, title)}
          onDelete={(id) => deleteChat(id)}
          onNew={() => {
            current && createChat(current.id);
            setViewMode("conversation");
          }}
        />
      )}

      {/* Conversation view */}
      {viewMode === "conversation" && (
        <>
          {/* Messages */}
          <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-auto px-3 py-3 flex flex-col">
            {messages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-1 py-8 text-center">
                <img
                  src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/openai.svg"
                  alt="OpenAI"
                  className="h-10 w-10 opacity-80 [filter:invert(1)_brightness(0.7)]"
                />
                <p className="text-xs text-muted-2">
                  Ask GPT anything about your HTML project.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {messages.map((m, i) => {
                  const isLastUser =
                    m.role === "user" &&
                    !sending &&
                    !editingFrom &&
                    !messages.slice(i + 1).some((later) => later.role === "user");
                  return (
                    <div key={m.id} className="flex flex-col gap-1">
                      <MessageItem role={m.role} content={m.content} />
                      {isLastUser && (
                        <button
                          type="button"
                          onClick={startEditLast}
                          className="self-start inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-2 transition hover:bg-panel-2 hover:text-accent"
                          title="Edit this prompt and re-send it"
                        >
                          <Pencil className="size-3" />
                          Edit prompt
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Composer or rate-limit message */}
          {rateLimited ? (
            <RateLimitNotice remainingMs={remainingMs} />
          ) : (
            <div className="shrink-0 border-t border-border bg-panel p-2.5">
              {editingFrom && !sending && (
                <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-accent/40 bg-accent-soft/70 px-3 py-1.5 text-[11px] text-foreground">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <Pencil className="size-3 text-accent" />
                    Editing your last prompt — re-sends on submit
                  </span>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-muted transition hover:bg-panel-2 hover:text-foreground"
                    title="Cancel edit"
                  >
                    <X className="size-3" />
                    Cancel
                  </button>
                </div>
              )}
              {attachedIds.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {attachedIds.map((id) => {
                    const node = findNode(id);
                    if (!node) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex max-w-[180px] items-center gap-1 rounded-md border border-accent/40 bg-accent-soft px-2 py-1 text-[11px] font-medium text-accent"
                      >
                        <Paperclip className="size-3 shrink-0" />
                        <span className="truncate">{node.name}</span>
                        <button
                          type="button"
                          onClick={() => setAttachedIds((prev) => prev.filter((a) => a !== id))}
                          aria-label={`Remove ${node.name}`}
                          title="Remove attachment"
                          className="rounded p-0.5 transition hover:bg-accent/25"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              {editorSelection && !sending && (
                <button
                  type="button"
                  onClick={() => {
                    // Deselect in the editor (collapse selection to cursor) — the badge disappears.
                    const editor = useEditorBridge.getState().editor as unknown as {
                      setSelection?: (sel: unknown) => void;
                    } | null;
                    editor?.setSelection?.({ startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 });
                  }}
                  className="mb-2 inline-flex max-w-full items-center gap-1.5 rounded-md border border-accent/40 bg-accent-soft px-2 py-1 text-[11px] font-medium text-accent transition hover:brightness-105"
                  title="Click to deselect (the selection is auto-attached to your next message)"
                >
                  <Code2 className="size-3 shrink-0" />
                  <span className="truncate">
                    Selected: {editorSelection.fileName} · lines {editorSelection.startLine}
                    {editorSelection.endLine !== editorSelection.startLine ? `–${editorSelection.endLine}` : ""}
                  </span>
                  <X className="size-3 shrink-0" />
                </button>
              )}
              <div
                className={cn(
                  "rounded-xl border border-border bg-background/70 shadow-sm transition-colors focus-within:border-accent/70 focus-within:bg-panel-2/40",
                  editingFrom && !sending && "border-accent/60 ring-1 ring-[hsl(var(--accent)/0.3)]",
                )}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Ask about your code…"
                  rows={2}
                  className="max-h-40 min-h-[2.6rem] w-full resize-none bg-transparent px-3 pb-1 pt-2.5 text-[13px] leading-relaxed text-foreground outline-none placeholder:text-muted-2"
                  disabled={sending}
                />
                <div className="flex items-center justify-between gap-2 px-2.5 pb-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      disabled={sending}
                      className="flex size-7 items-center justify-center rounded-lg border border-border bg-panel-2/70 text-muted transition hover:border-accent/50 hover:text-accent disabled:opacity-40"
                      title="Attach files as context"
                      aria-label="Attach files as context"
                    >
                      <Plus className="size-3.5" />
                    </button>
                    <span className="flex items-center gap-1 text-[10px] text-muted-2">
                      <kbd className="rounded border border-border bg-panel-2 px-1 py-px font-sans text-[9px] font-medium text-muted">
                        Enter
                      </kbd>
                      to send
                      <kbd className="ml-1 rounded border border-border bg-panel-2 px-1 py-px font-sans text-[9px] font-medium text-muted">
                        Shift
                      </kbd>
                      +
                      <kbd className="rounded border border-border bg-panel-2 px-1 py-px font-sans text-[9px] font-medium text-muted">
                        Enter
                      </kbd>
                      for a new line
                    </span>
                  </div>
                  {sending ? (
                    <button
                      onClick={() => {
                        abort();
                        setSending(false);
                      }}
                      className="flex h-7 items-center gap-1.5 rounded-lg border border-border bg-panel-2 px-3 text-xs font-medium text-foreground transition hover:bg-border"
                    >
                      <Square className="size-3" />
                      Stop
                    </button>
                  ) : (
                    <button
                      onClick={submit}
                      disabled={!input.trim()}
                      className={cn(
                        "flex h-7 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition active:scale-[0.97]",
                        input.trim()
                          ? "bg-accent text-accent-fg shadow-[0_1px_8px_rgba(0,179,255,0.3)] hover:brightness-110"
                          : "cursor-not-allowed bg-panel-2 text-muted-2",
                      )}
                    >
                      {editingFrom ? <RotateCcw className="size-3" /> : <Send className="size-3" />}
                      {editingFrom ? "Resend" : "Send"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <FileContextModal
        open={pickerOpen}
        tree={tree}
        selectedIds={attachedIds}
        onConfirm={(ids) => setAttachedIds(ids)}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}

function MessageItem({ role, content }: { role: string; content: string }) {
  if (role === "user") {
    return (
      <div className="rounded-md border border-border bg-panel-2 px-3 py-2 text-[13px] leading-relaxed text-foreground">
        {content}
      </div>
    );
  }
  return (
    <div className="rounded-md border border-accent/15 bg-background px-3 py-2">
      <Markdown content={content} />
    </div>
  );
}

function RateLimitNotice({ remainingMs }: { remainingMs: number }) {
  const totalSecs = Math.ceil(remainingMs / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const timeStr = mins > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : `${secs}s`;
  const pct = Math.max(0, Math.min(100, (1 - remainingMs / (2 * 60 * 1000)) * 100));

  return (
    <div className="shrink-0 border-t border-border p-2">
      <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-background px-4 py-4 text-center">
        <div className="flex size-10 items-center justify-center rounded-full bg-accent-soft">
          <Code2 className="size-5 text-accent" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Keep working on your code yourself!</p>
          <p className="text-xs text-muted-2">
            The next prompt will be available in <span className="font-mono text-muted">{timeStr}</span>
          </p>
        </div>
        {/* Thin progress bar that fills as the cooldown elapses */}
        <div className="h-1 w-full overflow-hidden rounded-full bg-panel-2">
          <div
            className="h-full rounded-full bg-accent transition-all duration-1000 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/** Format an ISO date as a relative-ish label (Today, Yesterday, or MMM D). */
function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const dayMs = 86_400_000;
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now.getTime() - dayMs);
  if (sameDay) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Group chats by date bucket for the history list. */
function groupByDate(chats: { id: string; title: string; updated_at: string }[]) {
  const buckets: { label: string; items: typeof chats }[] = [];
  const labelIdx = new Map<string, number>();
  for (const c of chats) {
    const label = formatDate(c.updated_at);
    let idx = labelIdx.get(label);
    if (idx === undefined) {
      idx = buckets.length;
      labelIdx.set(label, idx);
      buckets.push({ label, items: [] });
    }
    buckets[idx].items.push(c);
  }
  return buckets;
}

function ChatHistory({
  chats,
  activeChatId,
  search,
  onSearch,
  onSelect,
  onRename,
  onDelete,
  onNew,
}: {
  chats: { id: string; title: string; updated_at: string }[];
  activeChatId: string | null;
  search: string;
  onSearch: (s: string) => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? chats.filter((c) => c.title.toLowerCase().includes(q)) : chats;
    return list;
  }, [chats, search]);

  const buckets = useMemo(() => groupByDate(filtered), [filtered]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Search */}
      <div className="shrink-0 border-b border-border p-2">
        <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1 focus-within:border-accent">
          <Search className="size-3.5 text-muted-2" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search chats…"
            className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-2"
            autoFocus
          />
        </div>
      </div>

      {/* New chat button */}
      <button
        onClick={onNew}
        className="mx-2 mt-2 flex items-center gap-2 rounded-md border border-border bg-panel-2 px-2 py-1.5 text-xs text-foreground hover:border-accent/40"
      >
        <Plus className="size-3.5 text-accent" />
        New chat
      </button>

      {/* List */}
      <div className="flex-1 overflow-auto py-1">
        {buckets.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-muted-2">
            {search ? "No chats match your search." : "No chats yet."}
          </div>
        )}
        {buckets.map((bucket) => (
          <div key={bucket.label}>
            <div className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wide text-muted-2">
              {bucket.label}
            </div>
            {bucket.items.map((c) => (
              <ChatHistoryRow
                key={c.id}
                chat={c}
                active={c.id === activeChatId}
                onSelect={() => onSelect(c.id)}
                onRename={(title) => onRename(c.id, title)}
                onDelete={() => onDelete(c.id)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatHistoryRow({
  chat,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  chat: { id: string; title: string; updated_at: string };
  active: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(chat.title);
  const [confirming, setConfirming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commitRename = () => {
    const t = editVal.trim();
    if (t && t !== chat.title) onRename(t);
    else setEditVal(chat.title);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="mx-1 my-0.5 flex items-center gap-1 rounded px-2 py-1.5">
        <input
          ref={inputRef}
          value={editVal}
          onChange={(e) => setEditVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") {
              setEditVal(chat.title);
              setEditing(false);
            }
          }}
          onBlur={commitRename}
          className="flex-1 bg-background px-1 py-0.5 text-xs text-foreground outline-none ring-1 ring-accent/40 rounded"
        />
        <button onClick={commitRename} className="p-1 text-accent hover:bg-panel-2" title="Save">
          <Check className="size-3.5" />
        </button>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="mx-1 my-0.5 flex items-center gap-1 rounded border border-danger/40 bg-danger/5 px-2 py-1.5">
        <span className="flex-1 truncate text-xs text-foreground">Delete &ldquo;{chat.title}&rdquo;?</span>
        <button
          onClick={() => {
            onDelete();
            setConfirming(false);
          }}
          className="rounded bg-danger px-1.5 py-0.5 text-[10px] font-medium text-white hover:opacity-90"
        >
          Delete
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded bg-panel-2 px-1.5 py-0.5 text-[10px] text-foreground hover:bg-border"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div
      className={`group mx-1 my-0.5 flex items-center gap-1 rounded px-2 py-1.5 hover:bg-panel-2 ${active ? "bg-panel-2 ring-1 ring-accent/30" : ""}`}
    >
      <button onClick={onSelect} className="flex-1 truncate text-left text-xs text-foreground" title={chat.title}>
        {chat.title}
      </button>
      <button
        onClick={() => {
          setEditVal(chat.title);
          setEditing(true);
        }}
        className="hidden p-1 text-muted hover:text-accent group-hover:block"
        title="Rename"
      >
        <Pencil className="size-3" />
      </button>
      <button
        onClick={() => setConfirming(true)}
        className="hidden p-1 text-muted hover:text-danger group-hover:block"
        title="Delete chat"
      >
        <Trash2 className="size-3" />
      </button>
    </div>
  );
}