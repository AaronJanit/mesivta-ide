import { createAdminClient } from "@/lib/supabase/server";
import type { User } from "@/lib/db/types";

function client() {
  return createAdminClient();
}

// Users are created by the admin directly in Supabase (users table); each
// has a unique 4-digit `code` handed to the student in person.
export async function getUserByCode(code: string): Promise<User | null> {
  const { data, error } = await client()
    .from("users")
    .select("id, username, created_at")
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  return (data as User | null) ?? null;
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