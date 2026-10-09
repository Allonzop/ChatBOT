/**
 * /api/profile — la fiche entreprise.
 *   GET  → { profile }
 *   PUT  → { profile } (tous les champs texte, bornés)
 */
import type { Config } from "@netlify/functions";
import { cleanString, handleError, HttpError, json, methodNotAllowed, readJson } from "../lib/http";
import { loadBusinessProfile, requireUser, type BusinessProfileRow } from "../lib/supabase";

const LIMITS: Record<Exclude<keyof BusinessProfileRow, "user_id" | "updated_at" | "ton">, number> = {
  nom_entreprise: 120,
  metier: 120,
  ville: 80,
  zone_intervention: 300,
  horaires: 300,
  tarifs_indicatifs: 1500,
  signature: 300,
  infos_libres: 2000,
};

export default async (req: Request): Promise<Response> => {
  try {
    const { user, db } = await requireUser(req);

    if (req.method === "GET") {
      const profile = await loadBusinessProfile(db, user.id);
      return json({ profile });
    }

    if (req.method === "PUT") {
      const body = await readJson<Partial<Record<keyof BusinessProfileRow, unknown>>>(req);
      const update: Record<string, string> = {};
      for (const [key, max] of Object.entries(LIMITS)) {
        if (key in body) update[key] = cleanString(body[key as keyof BusinessProfileRow], max);
      }
      if ("ton" in body) {
        update.ton = body.ton === "tutoiement" ? "tutoiement" : "vouvoiement";
      }
      const { data, error } = await db
        .from("business_profiles")
        .upsert({ user_id: user.id, ...update }, { onConflict: "user_id" })
        .select("*")
        .single<BusinessProfileRow>();
      if (error || !data) throw new HttpError(500, "db_error", error?.message ?? "Enregistrement impossible.");
      return json({ profile: data });
    }

    return methodNotAllowed(["GET", "PUT"]);
  } catch (err) {
    return handleError(err);
  }
};

export const config: Config = {
  path: "/api/profile",
};
