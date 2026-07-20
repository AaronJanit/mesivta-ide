"use client";

import { create } from "zustand";
import { api, type ProjectDTO } from "@/lib/api/client";

interface ProjectState {
  projects: ProjectDTO[];
  current: ProjectDTO | null;
  loading: boolean;
  loadProjects: () => Promise<void>;
  selectProject: (id: string) => void;
  createProject: (name: string) => Promise<ProjectDTO>;
  renameProject: (id: string, name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  current: null,
  loading: false,
  loadProjects: async () => {
    set({ loading: true });
    try {
      const { projects } = await api.projects.list();
      set({
        projects,
        current: get().current
          ? projects.find((p) => p.id === get().current!.id) ?? projects[0] ?? null
          : projects[0] ?? null,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },
  selectProject: (id) => {
    const p = get().projects.find((x) => x.id === id) ?? null;
    set({ current: p });
  },
  createProject: async (name) => {
    const { project } = await api.projects.create(name);
    set({ projects: [project, ...get().projects], current: project });
    return project;
  },
  renameProject: async (id, name) => {
    await api.projects.rename(id, name);
    set({
      projects: get().projects.map((p) => (p.id === id ? { ...p, name } : p)),
      current: get().current?.id === id ? { ...get().current!, name } : get().current,
    });
  },
  deleteProject: async (id) => {
    await api.projects.remove(id);
    const remaining = get().projects.filter((p) => p.id !== id);
    set({
      projects: remaining,
      current: get().current?.id === id ? remaining[0] ?? null : get().current,
    });
  },
}));