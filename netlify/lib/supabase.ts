import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { requireEnv } from "./env";
import { HttpError } from "./http";
import type { Plan } from "./quotas";

export interface ProfileRow {
  id: string;
  email: string;
  plan: Plan;
  stripe_customer_id: string | null;
  stripe_subscription_status: string | null;
  created_at: string;
}

export interface BusinessProfileRow {
  user_id: string;
  nom_entreprise: string;
  metier: string;
  ville: string;
  zone_intervention: string;
  horaires: string;
  tarifs_indicatifs: string;
  ton: "tutoiement" | "vouvoiement";
  signature: string;
  infos_libres: string;
  updated_at: string;
}

export interface ConversationRow {
  id: string;
  user_id: string;
  task_key: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

let cached: SupabaseClient | undefined;

/** Client service role : contourne la RLS, à n'utiliser qu'après vérification du JWT. */
export function supabaseAdmin(): SupabaseClient {
  if (!cached) {
    cached = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
  }
  return cached;
}

export interface AuthContext {
  user: User;
  profile: ProfileRow;
  db: SupabaseClient;
}

/**
 * Vérifie le JWT porté par `Authorization: Bearer` avec le service role
 * (`auth.getUser`) et charge le profil. L'identifiant utilisateur vient
 * toujours du JWT vérifié, jamais du corps de la requête.
 */
export async function requireUser(req: Request): Promise<AuthContext> {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) throw new HttpError(401, "unauthenticated", "Connexion requise.");
  const token = match[1].trim();

  const db = supabaseAdmin();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "unauthenticated", "Session expirée, reconnecte-toi.");

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle<ProfileRow>();
  if (profileError) throw new HttpError(500, "db_error", profileError.message);

  if (!profile) {
    // Filet de sécurité si le trigger n'a pas tourné (projet créé avant la migration).
    const { data: created, error: insertError } = await db
      .from("profiles")
      .upsert({ id: data.user.id, email: data.user.email ?? "" }, { onConflict: "id" })
      .select("*")
      .single<ProfileRow>();
    if (insertError || !created) throw new HttpError(500, "db_error", insertError?.message ?? "Profil introuvable.");
    await db.from("business_profiles").upsert({ user_id: data.user.id }, { onConflict: "user_id", ignoreDuplicates: true });
    return { user: data.user, profile: created, db };
  }

  return { user: data.user, profile, db };
}

export async function loadBusinessProfile(db: SupabaseClient, userId: string): Promise<BusinessProfileRow | null> {
  const { data, error } = await db
    .from("business_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<BusinessProfileRow>();
  if (error) throw new HttpError(500, "db_error", error.message);
  return data;
}

export interface UserCosts {
  lifetime_usd: number;
  month_usd: number;
}

export async function loadUserCosts(db: SupabaseClient, userId: string): Promise<UserCosts> {
  const { data, error } = await db.rpc("user_costs", { p_user_id: userId });
  if (error) throw new HttpError(500, "db_error", error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return {
    lifetime_usd: Number(row?.lifetime_usd ?? 0),
    month_usd: Number(row?.month_usd ?? 0),
  };
}

export async function loadTrialMonthCost(db: SupabaseClient): Promise<number> {
  const { data, error } = await db.rpc("trial_month_cost");
  if (error) throw new HttpError(500, "db_error", error.message);
  return Number(data ?? 0);
}
