import { describe, expect, it } from "vitest";
import { decide, DEFAULT_THRESHOLDS, thresholdsFromEnv, trialPoolBudget, type QuotaContext } from "./quotas";

const base: QuotaContext = {
  plan: "trial",
  userLifetimeUsd: 0,
  userMonthUsd: 0,
  trialPoolMonthUsd: 0,
};

describe("decide — essais", () => {
  it("autorise un nouvel essai", () => {
    const d = decide(base);
    expect(d.allowed).toBe(true);
    if (d.allowed) {
      expect(d.remaining.userUsd).toBe(1);
      expect(d.remaining.trialPoolUsd).toBe(60);
    }
  });

  it("applique le paywall doux à 1 $ à vie", () => {
    const d = decide({ ...base, userLifetimeUsd: 1 });
    expect(d).toMatchObject({ allowed: false, code: "trial_soft_cap" });
  });

  it("laisse passer juste sous le paywall doux", () => {
    expect(decide({ ...base, userLifetimeUsd: 0.99 }).allowed).toBe(true);
  });

  it("applique le plafond dur à 5 $ à vie, avant le paywall doux", () => {
    const d = decide({ ...base, userLifetimeUsd: 5 });
    expect(d).toMatchObject({ allowed: false, code: "hard_cap" });
    expect(decide({ ...base, userLifetimeUsd: 12 })).toMatchObject({ code: "hard_cap" });
  });

  it("bloque les essais quand la réserve des essais du mois est consommée", () => {
    // 100 - 40 = 60 $ ouverts aux essais
    const d = decide({ ...base, trialPoolMonthUsd: 60 });
    expect(d).toMatchObject({ allowed: false, code: "trial_pool_exhausted" });
    expect(decide({ ...base, trialPoolMonthUsd: 59.9 }).allowed).toBe(true);
  });

  it("le paywall doux prime sur la réserve épuisée", () => {
    const d = decide({ ...base, userLifetimeUsd: 2, trialPoolMonthUsd: 80 });
    expect(d).toMatchObject({ code: "trial_soft_cap" });
  });

  it("le coût du mois d'un essai ne compte pas, seul le cumul à vie", () => {
    expect(decide({ ...base, userMonthUsd: 40 }).allowed).toBe(true);
  });
});

describe("decide — abonnés", () => {
  const pro: QuotaContext = { ...base, plan: "pro" };

  it("autorise un abonné sous le plafond mensuel", () => {
    const d = decide({ ...pro, userMonthUsd: 14.99, userLifetimeUsd: 300 });
    expect(d.allowed).toBe(true);
    if (d.allowed) expect(d.remaining.userUsd).toBeCloseTo(0.01, 8);
  });

  it("applique le plafond mensuel à 15 $", () => {
    expect(decide({ ...pro, userMonthUsd: 15 })).toMatchObject({ allowed: false, code: "paid_monthly_cap" });
  });

  it("ignore la réserve des essais et les plafonds d'essai", () => {
    expect(decide({ ...pro, userLifetimeUsd: 50, trialPoolMonthUsd: 999 }).allowed).toBe(true);
  });
});

describe("decide — bloqué", () => {
  it("refuse toujours un compte bloqué", () => {
    expect(decide({ ...base, plan: "blocked" })).toMatchObject({ allowed: false, code: "blocked" });
  });
});

describe("seuils", () => {
  it("lit les seuils depuis l'environnement avec repli sur les défauts", () => {
    const t = thresholdsFromEnv({
      MONTHLY_CREDIT_USD: "200",
      PAID_RESERVE_USD: "abc",
      TRIAL_SOFT_CAP_USD: "",
      HARD_CAP_USD: "-3",
      PAID_MONTHLY_CAP_USD: "25",
    });
    expect(t).toEqual({ ...DEFAULT_THRESHOLDS, monthlyCreditUsd: 200, paidMonthlyCapUsd: 25 });
    expect(trialPoolBudget(t)).toBe(160);
  });

  it("applique des seuils personnalisés dans decide", () => {
    const d = decide({ ...base, userLifetimeUsd: 2, thresholds: { trialSoftCapUsd: 3 } });
    expect(d.allowed).toBe(true);
  });

  it("une réserve supérieure au crédit donne un budget d'essai nul", () => {
    const t = { ...DEFAULT_THRESHOLDS, paidReserveUsd: 500 };
    expect(trialPoolBudget(t)).toBe(0);
    expect(decide({ ...base, thresholds: t })).toMatchObject({ code: "trial_pool_exhausted" });
  });
});
