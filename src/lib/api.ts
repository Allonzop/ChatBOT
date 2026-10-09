import { supabase } from "./supabase";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

async function accessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiError(401, "unauthenticated", "Connexion requise.");
  return token;
}

async function parseError(res: Response): Promise<ApiError> {
  let payload: { error?: { code?: string; message?: string } & Record<string, unknown> } = {};
  try {
    payload = await res.json();
  } catch {
    /* corps vide */
  }
  const { code = "error", message = `Erreur ${res.status}`, ...extra } = payload.error ?? {};
  return new ApiError(res.status, code, message, extra);
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await accessToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}

/* ---------- Types partagés avec les fonctions ---------- */

export type Plan = "trial" | "pro" | "blocked";

export interface Conversation {
  id: string;
  task_key: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  /** Présent uniquement côté client pendant le streaming. */
  pending?: boolean;
}

export interface BusinessProfile {
  nom_entreprise: string;
  metier: string;
  ville: string;
  zone_intervention: string;
  horaires: string;
  tarifs_indicatifs: string;
  ton: "tutoiement" | "vouvoiement";
  signature: string;
  infos_libres: string;
}

export const EMPTY_PROFILE: BusinessProfile = {
  nom_entreprise: "",
  metier: "",
  ville: "",
  zone_intervention: "",
  horaires: "",
  tarifs_indicatifs: "",
  ton: "vouvoiement",
  signature: "",
  infos_libres: "",
};

export function isProfileEmpty(p: BusinessProfile | null | undefined): boolean {
  return !p || !(p.nom_entreprise || p.metier || p.ville);
}

export interface AccountInfo {
  account: {
    email: string;
    plan: Plan;
    created_at: string;
    stripe_subscription_status: string | null;
    is_admin: boolean;
  };
  usage: { lifetime_usd: number; month_usd: number; messages: number; model: string };
  quota: {
    allowed: boolean;
    code: string | null;
    message: string | null;
    remaining: { userUsd: number; trialPoolUsd: number };
    trial_soft_cap_usd: number;
    paid_monthly_cap_usd: number;
    trial_pool_budget_usd: number;
  };
  billing: { stripe_enabled: boolean };
}

/* ---------- Appels ---------- */

export const listConversations = () => api<{ conversations: Conversation[] }>("/api/conversations");
export const createConversation = (task_key: string, title: string) =>
  api<{ conversation: Conversation }>("/api/conversations", { method: "POST", body: JSON.stringify({ task_key, title }) });
export const getConversation = (id: string) => api<{ conversation: Conversation; messages: Message[] }>(`/api/conversations/${id}`);
export const renameConversation = (id: string, title: string) =>
  api<{ conversation: Conversation }>(`/api/conversations/${id}`, { method: "PATCH", body: JSON.stringify({ title }) });
export const deleteConversation = (id: string) => api<{ ok: true }>(`/api/conversations/${id}`, { method: "DELETE" });

export const getProfile = () => api<{ profile: BusinessProfile | null }>("/api/profile");
export const saveProfile = (profile: BusinessProfile) =>
  api<{ profile: BusinessProfile }>("/api/profile", { method: "PUT", body: JSON.stringify(profile) });

export const getAccount = () => api<AccountInfo>("/api/account");
export const deleteAccount = () => api<{ ok: true }>("/api/account", { method: "DELETE" });
export const joinWaitlist = () => api<{ ok: true }>("/api/waitlist", { method: "POST" });
export const startCheckout = () => api<{ url: string }>("/api/stripe-checkout", { method: "POST" });

/* ---------- Streaming du chat (SSE) ---------- */

export interface StreamHandlers {
  onStart?: (info: { user_message_id: string; model: string }) => void;
  onText: (delta: string) => void;
  onDone: (info: { assistant_message_id: string | null; refused: boolean; usage: Record<string, unknown> | null }) => void;
  onError: (err: ApiError) => void;
}

/**
 * Envoie un message et consomme le flux SSE. Les erreurs avant le flux
 * (quota 402, service 503) arrivent dans `onError` avec leur code.
 */
export async function streamChat(conversationId: string, content: string, handlers: StreamHandlers, signal?: AbortSignal): Promise<void> {
  let token: string;
  try {
    token = await accessToken();
  } catch (err) {
    handlers.onError(err as ApiError);
    return;
  }

  let res: Response;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ conversation_id: conversationId, content }),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    handlers.onError(new ApiError(0, "network", "Pas de connexion. Vérifie ton réseau et réessaie."));
    return;
  }

  if (!res.ok || !res.body) {
    handlers.onError(await parseError(res));
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finished = false;

  const dispatch = (event: string, raw: string) => {
    let data: unknown = raw;
    try {
      data = JSON.parse(raw);
    } catch {
      /* texte brut */
    }
    switch (event) {
      case "start":
        handlers.onStart?.(data as { user_message_id: string; model: string });
        break;
      case "text":
        handlers.onText(typeof data === "string" ? data : String(data ?? ""));
        break;
      case "done":
        finished = true;
        handlers.onDone(data as { assistant_message_id: string | null; refused: boolean; usage: Record<string, unknown> | null });
        break;
      case "error": {
        finished = true;
        const d = (data ?? {}) as { code?: string; message?: string };
        handlers.onError(new ApiError(503, d.code ?? "stream_error", d.message ?? "Le flux a été interrompu."));
        break;
      }
      default:
        break;
    }
  };

  const processBuffer = () => {
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      let event = "message";
      const dataLines: string[] = [];
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
      }
      if (dataLines.length) dispatch(event, dataLines.join("\n"));
    }
  };

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      processBuffer();
    }
    buffer += decoder.decode();
    processBuffer();
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    if (!finished) handlers.onError(new ApiError(0, "network", "La connexion a été coupée pendant la réponse."));
    return;
  }
  if (!finished) handlers.onError(new ApiError(0, "stream_incomplete", "La réponse s'est arrêtée avant la fin. Réessaie."));
}

/** Traduit un code d'erreur quota en un écran. */
export type PaywallKind = "soft" | "pool" | "hard" | "paid_cap" | "blocked" | null;

export function paywallKind(code: string | null | undefined): PaywallKind {
  switch (code) {
    case "trial_soft_cap":
      return "soft";
    case "trial_pool_exhausted":
      return "pool";
    case "hard_cap":
      return "hard";
    case "paid_monthly_cap":
      return "paid_cap";
    case "blocked":
      return "blocked";
    default:
      return null;
  }
}
