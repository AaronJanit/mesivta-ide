import { createAdminClient } from "@/lib/supabase/server";

export interface ClubStats {
  members: number;
  projects: number;
  files: number;
  aiMessages: number;
}

/**
 * Whole-club aggregate counts for the Overview page.
 *
 * Uses head-only count queries (no rows returned, count only) — anonymous by
 * construction: no usernames, no project names, no per-user filters.
 * Returns zeros on failure so the page never 500s.
 */
export async function getClubStats(): Promise<ClubStats> {
  const empty: ClubStats = { members: 0, projects: 0, files: 0, aiMessages: 0 };
  try {
    const db = createAdminClient();

    const count = (table: string) =>
      db.from(table).select("*", { count: "exact", head: true });

    const [members, projects, files, messages] = await Promise.all([
      count("users"),
      count("projects"),
      count("files"),
      count("messages"),
    ]);

    return {
      members: members.count ?? 0,
      projects: projects.count ?? 0,
      files: files.count ?? 0,
      aiMessages: messages.count ?? 0,
    };
  } catch (err) {
    console.error("[stats] failed to load club stats:", err);
    return empty;
  }
}