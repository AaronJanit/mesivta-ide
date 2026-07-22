"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, MessageSquare, Trash2, ChevronDown, Send, Square } from "lucide-react";
import { useChatStore } from "@/stores/useChatStore";
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
  const { chats, activeChatId, messages, loadChats, selectChat, createChat, deleteChat, appendMessage, appendAssistantStreaming, finalizeStreaming } =
    useChatStore();
  const { streaming, send, abort } = useStreamChat();
  const tabs = useEditorStore((s) => s.tabs);
  const activeFileId = useEditorStore((s) => s.activeFileId);
  const tree = useFileStore((s) => s.tree);
  const [input, setInput] = useState("");
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [sending, setSending] = useState(false);
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

    // optimistic: show user msg immediately
    appendMessage({
      id: `local-${Date.now()}`,
      chat_id: activeChatId,
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
      { chatId: activeChatId, projectId: current.id, content, history, activeFile, openTabs },
      {
        onDelta: (full) => appendAssistantStreaming(activeChatId, full),
        onDone: (_full) => {
          finalizeStreaming(activeChatId);
          setSending(false);
        },
        onError: (err) => {
          appendAssistantStreaming(activeChatId, `⚠️ ${err}`);
          finalizeStreaming(activeChatId);
          setSending(false);
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
      {/* Header: chat switcher */}
      <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border px-2">
        <button
          onClick={() => setChatMenuOpen((v) => !v)}
          className="flex flex-1 items-center gap-1.5 rounded px-1.5 py-1 text-xs hover:bg-panel-2"
        >
          <MessageSquare className="size-3.5 text-accent" />
          <span className="flex-1 truncate text-left">{activeChat?.title ?? "New chat"}</span>
          <ChevronDown className="size-3 text-muted" />
        </button>
        <button
          onClick={() => current && createChat(current.id)}
          className="rounded p-1 text-muted hover:bg-panel-2 hover:text-foreground"
          title="New chat"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {/* Chat dropdown */}
      {chatMenuOpen && (
        <ChatMenu
          chats={chats}
          activeChatId={activeChatId}
          onSelect={(id) => {
            selectChat(id);
            setChatMenuOpen(false);
          }}
          onDelete={(id) => deleteChat(id)}
          onClose={() => setChatMenuOpen(false)}
        />
      )}

      {/* Messages */}
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-auto px-3 py-3">
        {messages.length === 0 ? (
          <div className="px-1 py-8 text-center text-xs text-muted-2">
            Ask anything about your project.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => (
              <MessageItem key={m.id} role={m.role} content={m.content} />
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
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

function ChatMenu({
  chats,
  activeChatId,
  onSelect,
  onDelete,
  onClose,
}: {
  chats: { id: string; title: string }[];
  activeChatId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onDown = () => onClose();
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onClose]);

  return (
    <div className="absolute z-50 mt-9 w-[calc(100%-1px)] border-b border-border bg-panel shadow-pop" onMouseDown={(e) => e.stopPropagation()}>
      <div className="max-h-64 overflow-auto py-1">
        {chats.length === 0 && <div className="px-3 py-2 text-xs text-muted-2">No chats</div>}
        {chats.map((c) => (
          <div
            key={c.id}
            className={`group flex items-center gap-1 px-2 py-1 hover:bg-panel-2 ${c.id === activeChatId ? "bg-panel-2" : ""}`}
          >
            <button onClick={() => onSelect(c.id)} className="flex-1 truncate text-left text-xs text-foreground">
              {c.title}
            </button>
            <button
              onClick={() => onDelete(c.id)}
              className="hidden p-1 text-muted hover:text-danger group-hover:block"
              title="Delete chat"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}