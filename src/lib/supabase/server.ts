import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createBrowserClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_KEY!;

/**
 * Admin client using the service-role key. Server-only.
 * Use for data operations after the session cookie has validated the user.
 * NOTE: this bypasses RLS — since we use custom auth + no RLS, that's fine.
 */
export function createAdminClient(): SupabaseClient {
  return createBrowserClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    // Node 20 has no native WebSocket — pass ws for realtime if ever needed.
    realtime: { transport: require("ws") as any },
  });
}

/**
 * Per-request cookie-aware client. Kept for completeness; admin client is used
 * for actual data access because auth is handled by our session cookie, not
 * Supabase Auth.
 */
export async function createCookieClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );
}