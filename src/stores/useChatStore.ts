"use client";

import { create } from "zustand";
import { api, type ChatDTO, type MessageDTO } from "@/lib/api/client";

/** Sentinel id for a not-yet-persisted draft chat. Real chats have UUID ids. */
export const DRAFT_CHAT_ID = "draft";

interface ChatState {
  chats: ChatDTO[];
  activeChatId: string | null;
  messages: MessageDTO[];
  loading: boolean;
  streaming: boolean;
  loadChats: (projectId: string) => Promise<void>;
  selectChat: (chatId: string) => Promise<void>;
  createChat: (projectId: string, title?: string) => Promise<ChatDTO>;
  deleteChat: (chatId: string) => Promise<void>;
  renameChat: (chatId: string, title: string) => Promise<void>;
  /** If the active chat is a draft, persist it to the DB and return the real id. */
  ensureChatPersisted: (projectId: string) => Promise<string>;
  appendMessage: (msg: MessageDTO) => void;
  appendAssistantStreaming: (chatId: string, partial: string) => void;
  finalizeStreaming: (chatId: string) => void;
  clear: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  renameChat: async (chatId, title) => {
    await api.chats.rename(chatId, title);
    set({ chats: get().chats.map((c) => (c.id === chatId ? { ...c, title } : c)) });
  },
  chats: [],
  activeChatId: null,
  messages: [],
  loading: false,
  streaming: false,
  loadChats: async (projectId) => {
    set({ loading: true });
    try {
      const { chats } = await api.chats.list(projectId);
      set({ chats });
      const first = chats[0];
      if (first) {
        await get().selectChat(first.id);
      } else {
        // No chats yet — start with a local draft (not persisted until first message).
        set({ activeChatId: DRAFT_CHAT_ID, messages: [] });
      }
      set({ loading: false });
    } catch {
      set({ loading: false });
    }
  },
  selectChat: async (chatId) => {
    if (chatId === DRAFT_CHAT_ID) {
      set({ activeChatId: DRAFT_CHAT_ID, messages: [] });
      return;
    }
    set({ activeChatId: chatId, messages: [] });
    try {
      const { messages } = await api.messages.list(chatId);
      set({ messages });
    } catch {
      // ignore
    }
  },
  createChat: async (projectId, title) => {
    // Local-only draft — not persisted to the DB until the first message is sent.
    // This prevents empty chats from cluttering the history list.
    set({ activeChatId: DRAFT_CHAT_ID, messages: [] });
    return {
      id: DRAFT_CHAT_ID,
      project_id: projectId,
      title: title ?? "New chat",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  },
  ensureChatPersisted: async (projectId) => {
    const id = get().activeChatId;
    if (id && id !== DRAFT_CHAT_ID) return id;
    // Persist the draft to the DB so messages can be stored.
    const { chat } = await api.chats.create(projectId);
    set({ chats: [chat, ...get().chats], activeChatId: chat.id });
    return chat.id;
  },
  deleteChat: async (chatId) => {
    if (chatId === DRAFT_CHAT_ID) {
      // Just reset to a fresh draft.
      set({ activeChatId: DRAFT_CHAT_ID, messages: [] });
      return;
    }
    await api.chats.remove(chatId);
    const chats = get().chats.filter((c) => c.id !== chatId);
    set({ chats });
    if (get().activeChatId === chatId) {
      const next = chats[0];
      if (next) await get().selectChat(next.id);
      else set({ activeChatId: DRAFT_CHAT_ID, messages: [] });
    }
  },
  appendMessage: (msg) => set({ messages: [...get().messages, msg] }),
  appendAssistantStreaming: (chatId, partial) => {
    if (get().activeChatId !== chatId) return;
    const msgs = get().messages;
    const last = msgs[msgs.length - 1];
    if (last && last.role === "assistant" && last.id === "streaming") {
      // update existing streaming placeholder
      const updated = [...msgs];
      updated[updated.length - 1] = { ...last, content: partial };
      set({ messages: updated });
    } else {
      set({
        messages: [
          ...msgs,
          { id: "streaming", chat_id: chatId, role: "assistant", content: partial, created_at: new Date().toISOString() },
        ],
      });
    }
  },
  finalizeStreaming: (chatId) => {
    // Give the finalized streaming placeholder a unique id so multiple
    // finalized messages in the same chat don't collide as React keys
    // (previously every finalized message got id "final", causing
    // "Encountered two children with the same key, `final`").
    const stamp = Date.now();
    set({
      messages: get().messages.map((m) => (m.id === "streaming" ? { ...m, id: `final-${stamp}` } : m)),
    });
  },
  clear: () => set({ chats: [], activeChatId: null, messages: [] }),
}));