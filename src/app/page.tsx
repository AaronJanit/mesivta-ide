"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useFileStore } from "@/stores/useFileStore";
import { useEditorStore } from "@/stores/useEditorStore";
import { useChatStore } from "@/stores/useChatStore";
import { Shell } from "@/components/ide/Shell";

export default function HomePage() {
  const router = useRouter();
  const { user, loading, loadUser, logout } = useAuthStore();
  const loadProjects = useProjectStore((s) => s.loadProjects);
  const current = useProjectStore((s) => s.current);
  const loadFiles = useFileStore((s) => s.loadFiles);
  const loadChats = useChatStore((s) => s.loadChats);
  const clearFiles = useFileStore((s) => s.clear);
  const clearEditor = useEditorStore((s) => s.clear);
  const clearChats = useChatStore((s) => s.clear);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    loadProjects();
  }, [user, loading, router, loadProjects]);

  useEffect(() => {
    if (!current) {
      clearFiles();
      clearEditor();
      clearChats();
      return;
    }
    loadFiles(current.id);
    loadChats(current.id);
    clearEditor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted">
        <span className="animate-pulse">Loading…</span>
      </div>
    );
  }

  return <Shell onLogout={logout} />;
}