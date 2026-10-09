/** Petits utilitaires HTTP pour les fonctions Netlify v2. */

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message ?? code);
  }
}

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers ?? {}) },
  });
}

export function errorResponse(status: number, code: string, message: string, extra?: Record<string, unknown>): Response {
  return json({ error: { code, message, ...(extra ?? {}) } }, { status });
}

export function handleError(err: unknown): Response {
  if (err instanceof HttpError) return errorResponse(err.status, err.code, err.message, err.extra);
  console.error("Erreur non gérée :", err);
  return errorResponse(500, "internal_error", "Erreur interne, réessaie dans un instant.");
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    const text = await req.text();
    if (!text) return {} as T;
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(400, "invalid_json", "Corps de requête invalide.");
  }
}

export function methodNotAllowed(allowed: string[]): Response {
  return errorResponse(405, "method_not_allowed", `Méthode non autorisée. Autorisées : ${allowed.join(", ")}`, {});
}

/** Borne et nettoie une chaîne envoyée par le client. */
export function cleanString(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\u0000/g, "").trim().slice(0, max);
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
