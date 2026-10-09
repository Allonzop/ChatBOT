/**
 * POST /api/waitlist — « Me prévenir » quand l'abonnement ouvre (sans Stripe).
 * L'email vient du JWT vérifié, pas du corps.
 */
import type { Config } from "@netlify/functions";
import { handleError, HttpError, json, methodNotAllowed } from "../lib/http";
import { requireUser } from "../lib/supabase";

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return methodNotAllowed(["POST"]);
  try {
    const { user, profile, db } = await requireUser(req);
    const email = (profile.email || user.email || "").toLowerCase();
    if (!email) throw new HttpError(400, "bad_request", "Aucun email sur ce compte.");
    const { error } = await db
      .from("waitlist")
      .upsert({ email, user_id: user.id }, { onConflict: "email", ignoreDuplicates: true });
    if (error) throw new HttpError(500, "db_error", error.message);
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
};

export const config: Config = {
  path: "/api/waitlist",
};
