/**
 * /api/account
 *   GET    → plan, consommation, reste, options d'encaissement
 *   DELETE → suppression du compte (conversations, messages, fiche, profil, auth) ;
 *            les usage_events restent, anonymisés.
 */
import type { Config } from "@netlify/functions";
import { isAdminEmail, stripeEnabled } from "../lib/env";
import { handleError, HttpError, json, methodNotAllowed } from "../lib/http";
import { currentModel } from "../lib/anthropic";
import { decide, thresholdsFromEnv, trialPoolBudget } from "../lib/quotas";
import { loadTrialMonthCost, loadUserCosts, requireUser } from "../lib/supabase";

export default async (req: Request): Promise<Response> => {
  try {
    const { user, profile, db } = await requireUser(req);

    if (req.method === "GET") {
      const [costs, trialPool] = await Promise.all([loadUserCosts(db, user.id), loadTrialMonthCost(db)]);
      const thresholds = thresholdsFromEnv(process.env);
      const decision = decide({
        plan: profile.plan,
        userLifetimeUsd: costs.lifetime_usd,
        userMonthUsd: costs.month_usd,
        trialPoolMonthUsd: trialPool,
        thresholds,
      });
      const { count } = await db
        .from("usage_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      return json({
        account: {
          email: profile.email,
          plan: profile.plan,
          created_at: profile.created_at,
          stripe_subscription_status: profile.stripe_subscription_status,
          is_admin: isAdminEmail(profile.email),
        },
        usage: {
          lifetime_usd: costs.lifetime_usd,
          month_usd: costs.month_usd,
          messages: count ?? 0,
          model: currentModel(),
        },
        quota: {
          allowed: decision.allowed,
          code: decision.allowed ? null : decision.code,
          message: decision.allowed ? null : decision.message,
          remaining: decision.remaining,
          trial_soft_cap_usd: thresholds.trialSoftCapUsd,
          paid_monthly_cap_usd: thresholds.paidMonthlyCapUsd,
          trial_pool_budget_usd: trialPoolBudget(thresholds),
        },
        billing: {
          stripe_enabled: stripeEnabled(),
        },
      });
    }

    if (req.method === "DELETE") {
      const { error } = await db.rpc("delete_account", { p_user_id: user.id });
      if (error) throw new HttpError(500, "db_error", error.message);
      // Au cas où la fonction SQL n'a pas pu toucher auth.users (droits), on tente l'API admin.
      await db.auth.admin.deleteUser(user.id).catch(() => undefined);
      return json({ ok: true });
    }

    return methodNotAllowed(["GET", "DELETE"]);
  } catch (err) {
    return handleError(err);
  }
};

export const config: Config = {
  path: "/api/account",
};
