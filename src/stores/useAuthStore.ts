"use client";

import { create } from "zustand";
import { api, type UserDTO } from "@/lib/api/client";

interface AuthState {
  user: UserDTO | null;
  loading: boolean;
  loadUser: () => Promise<void>;
  login: (u: string, p: string) => Promise<void>;
  register: (u: string, p: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  loadUser: async () => {
    set({ loading: true });
    try {
      const { user } = await api.auth.me();
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
  login: async (username, password) => {
    const { user } = await api.auth.login(username, password);
    set({ user });
  },
  register: async (username, password) => {
    const { user } = await api.auth.register(username, password);
    set({ user });
  },
  logout: async () => {
    await api.auth.logout();
    set({ user: null });
  },
}));