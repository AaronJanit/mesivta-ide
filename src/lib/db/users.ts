import { createAdminClient } from "@/lib/supabase/server";
import type { User } from "@/lib/db/types";

function client() {
  return createAdminClient();
}

export async function getUserByUsername(username: string): Promise<(User & { password: string }) | null> {
  const { data, error } = await client()
    .from("users")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  return (data as (User & { password: string }) | null) ?? null;
}

export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await client()
    .from("users")
    .select("id, username, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as User) ?? null;
}

export async function createUser(username: string, passwordHash: string): Promise<User> {
  const { data, error } = await client()
    .from("users")
    .insert({ username, password: passwordHash })
    .select("id, username, created_at")
    .single();
  if (error) throw error;
  return data as User;
}