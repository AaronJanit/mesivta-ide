import { createAdminClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/db/types";

function client() {
  return createAdminClient();
}

export async function listProjects(userId: string): Promise<Project[]> {
  const { data, error } = await client()
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as Project[]) ?? [];
}

export async function getProject(userId: string, id: string): Promise<Project | null> {
  const { data, error } = await client()
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Project) ?? null;
}

export async function createProject(userId: string, name: string): Promise<Project> {
  const { data, error } = await client()
    .from("projects")
    .insert({ user_id: userId, name })
    .select()
    .single();
  if (error) throw error;
  return data as Project;
}

export async function renameProject(userId: string, id: string, name: string): Promise<void> {
  const { error } = await client()
    .from("projects")
    .update({ name })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function deleteProject(userId: string, id: string): Promise<void> {
  const { error } = await client()
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}