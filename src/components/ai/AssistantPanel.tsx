"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Plus, MessageSquare, Trash2, ChevronLeft, Send, Square, Search, Check, Pencil, Clock, Code2 } from "lucide-react";
import { useChatStore, DRAFT_CHAT_ID } from "@/stores/useChatStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useEditorStore } from "@/stores/useEditorStore";
import { useFileStore } from "@/stores/useFileStore";
import { useStreamChat, type ActiveFileContext } from "@/hooks/useStreamChat";
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
  const [input, setInput] = useState("");
  const [viewMode, setViewMode] = useState<"conversation" | "history">("conversation");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  // ── Rate limiting ─────────────────────────────────────────────────────
  // Users must wait RATE_LIMIT_MS between prompts to the AI.
  const RATE_LIMIT_MS = 2 * 60 * 1000; // 2 minutes
  const [lastSentAt, setLastSentAt] = useState(0);
  const [now, setNow] = useState(0);
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

  async function submit() {
    const content = input.trim();
    if (!content || !current || !activeChatId || sending) return;
    setInput("");
    setSending(true);
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

    await send(
      { chatId, projectId: current.id, content, history, activeFile, openTabs },
      {
        onDelta: (full) => appendAssistantStreaming(chatId, full),
        onDone: (_full) => {
          finalizeStreaming(chatId);
          setSending(false);
          // Start the rate-limit cooldown after the AI response completes.
          setLastSentAt(Date.now());
          setNow(Date.now());
        },
        onError: (err) => {
          appendAssistantStreaming(chatId, `⚠️ ${err}`);
          finalizeStreaming(chatId);
          setSending(false);
          setLastSentAt(Date.now());
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
                {messages.map((m) => (
                  <MessageItem key={m.id} role={m.role} content={m.content} />
                ))}
              </div>
            )}
          </div>

          {/* Composer or rate-limit message */}
          {rateLimited ? (
            <RateLimitNotice remainingMs={remainingMs} />
          ) : (
            <div className="shrink-0 border-t border-border p-2">
              <div className="flex items-end gap-2 rounded-md border border-border bg-background px-2 py-1.5 focus-within:border-accent">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Message AI Assistant…  (Enter to send, Shift+Enter for newline)"
                  rows={2}
                  className="flex-1 resize-none bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-2"
                  disabled={sending}
                />
                {sending ? (
                  <button
                    onClick={() => {
                      abort();
                      setSending(false);
                    }}
                    className="flex items-center gap-1 rounded bg-panel-2 px-2 py-1 text-xs text-foreground hover:bg-border"
                  >
                    <Square className="size-3" />
                    Stop
                  </button>
                ) : (
                  <button
                    onClick={submit}
                    disabled={!input.trim()}
                    className="flex items-center gap-1 rounded bg-accent px-2 py-1 text-xs font-medium text-accent-fg hover:opacity-90 disabled:opacity-40"
                  >
                    <Send className="size-3" />
                    Send
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
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