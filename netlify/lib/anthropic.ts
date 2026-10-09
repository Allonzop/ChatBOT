import Anthropic from "@anthropic-ai/sdk";
import { env, requireEnv } from "./env";
import { HttpError } from "./http";
import { resolveModel, type ModelId } from "./pricing";

let cached: Anthropic | undefined;

export function anthropicClient(): Anthropic {
  if (!cached) {
    cached = new Anthropic({
      apiKey: requireEnv("ANTHROPIC_API_KEY"),
      maxRetries: 1,
      timeout: 60_000,
    });
  }
  return cached;
}

export function currentModel(): ModelId {
  return resolveModel(env("MODEL"));
}

export const MAX_OUTPUT_TOKENS = 2000;

export interface ProviderError {
  status: number;
  code: "provider_unavailable" | "provider_busy" | "provider_error";
  message: string;
}

/**
 * Traduit une erreur du SDK en erreur HTTP lisible par le front.
 * - 429 et 5xx (dont 529 surchargé) : « service saturé, réessaie dans une minute ».
 * - clé invalide, crédit épuisé, permission : 503 `provider_unavailable`.
 */
export function classifyProviderError(err: unknown): ProviderError {
  if (err instanceof Anthropic.RateLimitError || err instanceof Anthropic.InternalServerError) {
    return { status: 503, code: "provider_busy", message: "Service saturé, réessaie dans une minute." };
  }
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    return { status: 503, code: "provider_unavailable", message: "Service momentanément indisponible, les abonnés seront prévenus." };
  }
  if (err instanceof Anthropic.APIError) {
    const status = typeof err.status === "number" ? err.status : 0;
    const type = (err as { type?: string }).type ?? "";
    const text = String(err.message ?? "").toLowerCase();
    if (status === 402 || type === "billing_error" || text.includes("credit balance")) {
      return { status: 503, code: "provider_unavailable", message: "Service momentanément indisponible, les abonnés seront prévenus." };
    }
    if (status === 0 || status === 408 || status >= 500 || err instanceof Anthropic.APIConnectionError) {
      return { status: 503, code: "provider_busy", message: "Service saturé, réessaie dans une minute." };
    }
    return { status: 502, code: "provider_error", message: "Le service de rédaction a renvoyé une erreur. Réessaie." };
  }
  return { status: 500, code: "provider_error", message: "Erreur inattendue, réessaie." };
}

export function toHttpError(err: unknown): HttpError {
  const p = classifyProviderError(err);
  return new HttpError(p.status, p.code, p.message);
}
