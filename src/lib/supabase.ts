import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anonKey);

/** Client navigateur : clé anon uniquement, session persistée en localStorage. */
export const supabase = createClient(url ?? "https://placeholder.supabase.co", anonKey ?? "anon", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});
