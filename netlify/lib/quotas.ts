/**
 * Règles de quotas, appliquées AVANT chaque appel à l'API Anthropic,
 * sur les compteurs existants. La mise à jour des compteurs se fait après
 * la réponse : une réponse peut donc dépasser un seuil de quelques centimes,
 * c'est accepté.
 *
 * Toutes les valeurs sont en dollars US. Le « mois » est le mois calendaire UTC.
 */

export type Plan = "trial" | "pro" | "blocked";

export type QuotaCode =
  | "hard_cap"
  | "trial_soft_cap"
  | "trial_pool_exhausted"
  | "paid_monthly_cap"
  | "blocked";

export interface QuotaThresholds {
  /** Crédit Anthropic disponible chaque mois (défaut 100). */
  monthlyCreditUsd: number;
  /** Part du crédit réservée aux abonnés (défaut 40). */
  paidReserveUsd: number;
  /** Paywall doux : coût cumulé à vie d'un essai (défaut 1). */
  trialSoftCapUsd: number;
  /** Plafond dur : coût cumulé à vie d'un essai (défaut 5). */
  hardCapUsd: number;
  /** Plafond mensuel d'un abonné (défaut 15). */
  paidMonthlyCapUsd: number;
}

export const DEFAULT_THRESHOLDS: QuotaThresholds = {
  monthlyCreditUsd: 100,
  paidReserveUsd: 40,
  trialSoftCapUsd: 1,
  hardCapUsd: 5,
  paidMonthlyCapUsd: 15,
};

export interface QuotaContext {
  plan: Plan;
  /** Coût cumulé à vie de l'utilisateur. */
  userLifetimeUsd: number;
  /** Coût de l'utilisateur sur le mois UTC courant. */
  userMonthUsd: number;
  /** Somme des coûts de tous les comptes `trial` sur le mois UTC courant. */
  trialPoolMonthUsd: number;
  thresholds?: Partial<QuotaThresholds>;
}

export type QuotaDecision =
  | { allowed: true; remaining: QuotaRemaining }
  | { allowed: false; code: QuotaCode; message: string; remaining: QuotaRemaining };

export interface QuotaRemaining {
  /** Reste avant le paywall doux (trial) ou le plafond mensuel (pro). */
  userUsd: number;
  /** Reste du crédit mensuel ouvert aux essais. */
  trialPoolUsd: number;
}

export const QUOTA_MESSAGES: Record<QuotaCode, string> = {
  hard_cap: "Ton compte a atteint le plafond d'utilisation. Contacte-nous pour continuer.",
  trial_soft_cap: "Ton essai est terminé, passe à l'abonnement pour continuer.",
  trial_pool_exhausted:
    "Les essais gratuits sont complets ce mois-ci, reviens le 1er ou abonne-toi.",
  paid_monthly_cap: "Quota du mois atteint. Il se remet à zéro le 1er du mois prochain.",
  blocked: "Ce compte est bloqué. Contacte-nous si tu penses que c'est une erreur.",
};

function readNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/** Lit les seuils depuis un objet d'environnement (process.env ou Netlify.env). */
export function thresholdsFromEnv(env: Record<string, string | undefined>): QuotaThresholds {
  return {
    monthlyCreditUsd: readNumber(env.MONTHLY_CREDIT_USD, DEFAULT_THRESHOLDS.monthlyCreditUsd),
    paidReserveUsd: readNumber(env.PAID_RESERVE_USD, DEFAULT_THRESHOLDS.paidReserveUsd),
    trialSoftCapUsd: readNumber(env.TRIAL_SOFT_CAP_USD, DEFAULT_THRESHOLDS.trialSoftCapUsd),
    hardCapUsd: readNumber(env.HARD_CAP_USD, DEFAULT_THRESHOLDS.hardCapUsd),
    paidMonthlyCapUsd: readNumber(env.PAID_MONTHLY_CAP_USD, DEFAULT_THRESHOLDS.paidMonthlyCapUsd),
  };
}

/** Budget mensuel ouvert aux essais : crédit moins réserve des abonnés. */
export function trialPoolBudget(t: QuotaThresholds): number {
  return Math.max(0, t.monthlyCreditUsd - t.paidReserveUsd);
}

/**
 * Décision pure, dans cet ordre :
 * 0. compte `blocked` : refus.
 * 1. plafond dur par utilisateur (trial, coût à vie) : refus sans discussion.
 * 2. paywall doux (trial, coût à vie) : écran d'abonnement.
 * 3. réserve des essais (somme des trial du mois) : essais bloqués jusqu'au mois suivant.
 * 4. plafond mensuel des abonnés (pro, coût du mois).
 */
export function decide(ctx: QuotaContext): QuotaDecision {
  const t: QuotaThresholds = { ...DEFAULT_THRESHOLDS, ...(ctx.thresholds ?? {}) };
  const poolBudget = trialPoolBudget(t);
  const poolRemaining = Math.max(0, poolBudget - ctx.trialPoolMonthUsd);

  if (ctx.plan === "blocked") {
    return refuse("blocked", { userUsd: 0, trialPoolUsd: poolRemaining });
  }

  if (ctx.plan === "trial") {
    const remaining = {
      userUsd: Math.max(0, t.trialSoftCapUsd - ctx.userLifetimeUsd),
      trialPoolUsd: poolRemaining,
    };
    if (ctx.userLifetimeUsd >= t.hardCapUsd) return refuse("hard_cap", { ...remaining, userUsd: 0 });
    if (ctx.userLifetimeUsd >= t.trialSoftCapUsd) return refuse("trial_soft_cap", { ...remaining, userUsd: 0 });
    if (ctx.trialPoolMonthUsd >= poolBudget) return refuse("trial_pool_exhausted", remaining);
    return { allowed: true, remaining };
  }

  // plan === "pro"
  const remaining = {
    userUsd: Math.max(0, t.paidMonthlyCapUsd - ctx.userMonthUsd),
    trialPoolUsd: poolRemaining,
  };
  if (ctx.userMonthUsd >= t.paidMonthlyCapUsd) return refuse("paid_monthly_cap", { ...remaining, userUsd: 0 });
  return { allowed: true, remaining };
}

function refuse(code: QuotaCode, remaining: QuotaRemaining): QuotaDecision {
  return { allowed: false, code, message: QUOTA_MESSAGES[code], remaining };
}
