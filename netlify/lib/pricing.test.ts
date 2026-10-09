import { describe, expect, it } from "vitest";
import { costUsd, PRICING, resolveModel } from "./pricing";

describe("costUsd", () => {
  it("calcule le coût Sonnet 5.5 sur les quatre compteurs", () => {
    const cost = costUsd(
      {
        input_tokens: 1_000_000,
        output_tokens: 1_000_000,
        cache_creation_input_tokens: 1_000_000,
        cache_read_input_tokens: 1_000_000,
      },
      "claude-sonnet-5-5",
    );
    expect(cost).toBeCloseTo(2 + 10 + 2.5 + 0.2, 8);
  });

  it("calcule le coût Haiku 5.5", () => {
    const cost = costUsd(
      {
        input_tokens: 2_000_000,
        output_tokens: 1_000_000,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 4_000_000,
      },
      "claude-haiku-5-5",
    );
    expect(cost).toBeCloseTo(0.2 + 0.5 + 0.04, 8);
  });

  it("vaut zéro sans tokens", () => {
    expect(costUsd({ input_tokens: 0, output_tokens: 0 }, "claude-sonnet-5-5")).toBe(0);
  });

  it("tolère les compteurs de cache absents ou null", () => {
    const cost = costUsd(
      { input_tokens: 500, output_tokens: 200, cache_creation_input_tokens: null, cache_read_input_tokens: undefined },
      "claude-sonnet-5-5",
    );
    expect(cost).toBeCloseTo((500 * 2 + 200 * 10) / 1e6, 10);
  });

  it("retombe sur le tarif Sonnet pour un modèle inconnu", () => {
    const usage = { input_tokens: 1000, output_tokens: 1000 };
    expect(costUsd(usage, "modele-inconnu")).toBe(costUsd(usage, "claude-sonnet-5-5"));
  });

  it("un message typique coûte quelques millièmes de dollar", () => {
    // 1 500 tokens de prompt en cache lus, 300 tokens de fiche, 400 tokens de réponse.
    const cost = costUsd(
      { input_tokens: 300, output_tokens: 400, cache_creation_input_tokens: 0, cache_read_input_tokens: 1500 },
      "claude-sonnet-5-5",
    );
    expect(cost).toBeGreaterThan(0.004);
    expect(cost).toBeLessThan(0.006);
  });
});

describe("resolveModel", () => {
  it("renvoie Sonnet par défaut", () => {
    expect(resolveModel(undefined)).toBe("claude-sonnet-5-5");
    expect(resolveModel("")).toBe("claude-sonnet-5-5");
  });

  it("accepte Haiku", () => {
    expect(resolveModel("claude-haiku-5-5")).toBe("claude-haiku-5-5");
    expect(resolveModel("  claude-haiku-5-5 ")).toBe("claude-haiku-5-5");
  });

  it("refuse les identifiants avec suffixe de date", () => {
    expect(resolveModel("claude-sonnet-5-5-20261001")).toBe("claude-sonnet-5-5");
  });

  it("la table contient les deux modèles supportés", () => {
    expect(Object.keys(PRICING).sort()).toEqual(["claude-haiku-5-5", "claude-sonnet-5-5"]);
  });
});
