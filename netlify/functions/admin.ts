/**
 * /api/admin — réservé aux emails de ADMIN_EMAILS.
 *   GET  → coût du mois (essais, abonnés, total, reste avant la réserve),
 *          top 10 utilisateurs, comptes par plan, liste d'attente.
 *   POST { user_id, plan } → passe un compte en trial / pro / blocked.
 */
import type { Config } from "@netlify/functions";
import { isAdminEmail } from "../lib/env";
import { handleError, HttpError, isUuid, json, methodNotAllowed, readJson } from "../lib/http";
import { currentModel } from "../lib/anthropic";
import { thresholdsFromEnv, trialPoolBudget, type Plan } from "../lib/quotas";
import { requireUser } from "../lib/supabase";

const PLANS: Plan[] = ["trial", "pro", "blocked"];

export default async (req: Request): Promise<Response> => {
  try {
    const { profile, db } = await requireUser(req);
    if (!isAdminEmail(profile.email)) throw new HttpError(403, "forbidden", "Accès réservé.");

    if (req.method === "GET") {
      const thresholds = thresholdsFromEnv(process.env);
      const [byPlan, accounts, top, waitlist] = await Promise.all([
        db.rpc("month_costs_by_plan"),
        db.rpc("accounts_by_plan"),
        db
          .from("user_cost_overview")
          .select("user_id, email, plan, created_at, lifetime_usd, month_usd, events")
          .order("month_usd", { ascending: false })
          .limit(10),
        db.from("waitlist").select("email, created_at").order("created_at", { ascending: false }).limit(100),
      ]);
      for (const r of [byPlan, accounts, top, waitlist]) {
        if (r.error) throw new HttpError(500, "db_error", r.error.message);
      }
      const costRows = (byPlan.data ?? []) as Array<{ plan: Plan; cost_usd: number | string; events: number | string }>;
      const cost = (plan: Plan) => Number(costRows.find((r) => r.plan === plan)?.cost_usd ?? 0);
      const trial = cost("trial");
      const pro = cost("pro");
      const blocked = cost("blocked");
      const total = trial + pro + blocked;
      const poolBudget = trialPoolBudget(thresholds);

      return json({
        month: {
          trial_usd: trial,
          pro_usd: pro,
          other_usd: blocked,
          total_usd: total,
          credit_usd: thresholds.monthlyCreditUsd,
          paid_reserve_usd: thresholds.paidReserveUsd,
          trial_pool_budget_usd: poolBudget,
          trial_pool_remaining_usd: Math.max(0, poolBudget - trial),
          credit_remaining_usd: Math.max(0, thresholds.monthlyCreditUsd - total),
          events: costRows.reduce((acc, r) => acc + Number(r.events ?? 0), 0),
        },
        thresholds,
        model: currentModel(),
        accounts_by_plan: (accounts.data ?? []) as Array<{ plan: Plan; accounts: number }>,
        top_users: (top.data ?? []).map((u: Record<string, unknown>) => ({
          ...u,
          lifetime_usd: Number(u.lifetime_usd ?? 0),
          month_usd: Number(u.month_usd ?? 0),
          events: Number(u.events ?? 0),
        })),
        waitlist: waitlist.data ?? [],
      });
    }

    if (req.method === "POST") {
      const body = await readJson<{ user_id?: unknown; plan?: unknown }>(req);
      if (!isUuid(body.user_id)) throw new HttpError(400, "bad_request", "Identifiant utilisateur invalide.");
      if (!PLANS.includes(body.plan as Plan)) throw new HttpError(400, "bad_request", "Plan invalide.");
      const { data, error } = await db
        .from("profiles")
        .update({ plan: body.plan as Plan })
        .eq("id", body.user_id)
        .select("id, email, plan")
        .single();
      if (error || !data) throw new HttpError(500, "db_error", error?.message ?? "Mise à jour impossible.");
      return json({ profile: data });
    }

    return methodNotAllowed(["GET", "POST"]);
  } catch (err) {
    return handleError(err);
  }
};

export const config: Config = {
  path: "/api/admin",
};
