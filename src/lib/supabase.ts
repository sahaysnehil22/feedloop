import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "placeholder";

function getUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL;
}
function getAnon() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_KEY;
}

/** Browser / dashboard client (anon key, RLS enforced). Safe to import anywhere. */
export function supabaseBrowser(): SupabaseClient {
  return createClient(getUrl(), getAnon());
}

/**
 * Server-only client with the service-role key. Bypasses RLS — use ONLY
 * inside API routes after validating the project's public key, rate limits, etc.
 */
export function supabaseAdmin(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || PLACEHOLDER_KEY;
  return createClient(getUrl(), key, { auth: { persistSession: false } });
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
