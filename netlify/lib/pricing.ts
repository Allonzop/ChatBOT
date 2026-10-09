/**
 * Table des prix Anthropic par million de tokens, en dollars US.
 * Valeurs au 09/10/2026, à maintenir à la main quand Anthropic change ses tarifs :
 * https://www.anthropic.com/pricing
 *
 * Les identifiants de modèle ne portent jamais de suffixe de date.
 */

export type ModelId = "claude-sonnet-5-5" | "claude-haiku-5-5";

export interface ModelPricing {
  /** Tokens d'entrée non mis en cache. */
  input: number;
  /** Tokens de sortie. */
  output: number;
  /** Écriture dans le cache de prompt (ephemeral, 5 minutes). */
  cacheWrite: number;
  /** Lecture depuis le cache de prompt. */
  cacheRead: number;
}

export const PRICING: Record<ModelId, ModelPricing> = {
  "claude-sonnet-5-5": { input: 2.0, output: 10.0, cacheWrite: 2.5, cacheRead: 0.2 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheWrite: 0.125, cacheRead: 0.01 },
};

export const DEFAULT_MODEL: ModelId = "claude-sonnet-5-5";

/** Sous-ensemble de `usage` renvoyé par l'API Messages. */
export interface UsageLike {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

export function isKnownModel(model: string): model is ModelId {
  return Object.prototype.hasOwnProperty.call(PRICING, model);
}

/**
 * Résout le modèle à utiliser à partir de la variable d'environnement `MODEL`.
 * Une valeur inconnue retombe sur le modèle par défaut.
 */
export function resolveModel(envValue: string | undefined): ModelId {
  const trimmed = (envValue ?? "").trim();
  return isKnownModel(trimmed) ? trimmed : DEFAULT_MODEL;
}

const MILLION = 1_000_000;

/**
 * Coût d'un appel en dollars, à partir des compteurs `usage` et du modèle.
 * Fonction pure : aucune lecture d'environnement, arrondi à 8 décimales
 * pour rester stable en base (numeric(12,8)).
 */
export function costUsd(usage: UsageLike, model: string): number {
  const pricing = isKnownModel(model) ? PRICING[model] : PRICING[DEFAULT_MODEL];
  const input = Math.max(0, usage.input_tokens ?? 0);
  const output = Math.max(0, usage.output_tokens ?? 0);
  const cacheWrite = Math.max(0, usage.cache_creation_input_tokens ?? 0);
  const cacheRead = Math.max(0, usage.cache_read_input_tokens ?? 0);

  const raw =
    (input * pricing.input +
      output * pricing.output +
      cacheWrite * pricing.cacheWrite +
      cacheRead * pricing.cacheRead) /
    MILLION;

  return Math.round(raw * 1e8) / 1e8;
}
