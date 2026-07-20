"use client";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseBrowser = createClient(url, anon, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// NOTE: This browser client is only used for read-only anon queries if ever
// needed. All authenticated data access goes through our API routes which
// use the server-side admin client.