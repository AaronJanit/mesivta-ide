"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, MessageSquare, Trash2, ChevronDown, Send, Square } from "lucide-react";
import { useChatStore } from "@/stores/useChatStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useEditorStore } from "@/stores/useEditorStore";
import { useFileStore } from "@/stores/useFileStore";
import { useStreamChat } from "@/hooks/useStreamChat";
import { api } from "@/lib/api/client";
import { Markdown } from "./Markdown";

export function AssistantPanel() {
  const current = useProjectStore((s) => s.current);
  const { chats, activeChatId, messages, loadChats, selectChat, createChat, deleteChat, appendMessage, appendAssistantStreaming, finalizeStreaming } =
    useChatStore();
  const { streaming, send, abort } = useStreamChat();
  const [input, setInput] = useState("");
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
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

    await send(
      { chatId: activeChatId, projectId: current.id, content, history },
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
      <div ref={scrollRef} className="flex-1 overflow-auto px-3 py-3">
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