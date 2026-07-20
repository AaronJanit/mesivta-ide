"use client";

import { create } from "zustand";
import { api, type ChatDTO, type MessageDTO } from "@/lib/api/client";

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
  appendMessage: (msg: MessageDTO) => void;
  appendAssistantStreaming: (chatId: string, partial: string) => void;
  finalizeStreaming: (chatId: string) => void;
  clear: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  activeChatId: null,
  messages: [],
  loading: false,
  streaming: false,
  loadChats: async (projectId) => {
    set({ loading: true });
    try {
      const { chats } = await api.chats.list(projectId);
      const first = chats[0];
      set({ chats });
      if (first) {
        await get().selectChat(first.id);
      } else {
        // auto-create first chat
        const c = await get().createChat(projectId);
        set({ activeChatId: c.id, messages: [] });
      }
      set({ loading: false });
    } catch {
      set({ loading: false });
    }
  },
  selectChat: async (chatId) => {
    set({ activeChatId: chatId, messages: [] });
    try {
      const { messages } = await api.messages.list(chatId);
      set({ messages });
    } catch {
      // ignore
    }
  },
  createChat: async (projectId, title) => {
    const { chat } = await api.chats.create(projectId, title);
    set({ chats: [chat, ...get().chats], activeChatId: chat.id, messages: [] });
    return chat;
  },
  deleteChat: async (chatId) => {
    await api.chats.remove(chatId);
    const chats = get().chats.filter((c) => c.id !== chatId);
    set({ chats });
    if (get().activeChatId === chatId) {
      const next = chats[0];
      if (next) await get().selectChat(next.id);
      else set({ activeChatId: null, messages: [] });
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
    // Replace the streaming placeholder's id with a real one by fetching latest.
    // Simpler: just clear the "streaming" id marker.
    set({
      messages: get().messages.map((m) => (m.id === "streaming" ? { ...m, id: "final" } : m)),
    });
  },
  clear: () => set({ chats: [], activeChatId: null, messages: [] }),
}));