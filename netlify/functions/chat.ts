/**
 * POST /api/chat  { conversation_id, content }
 *
 * 1. Vérifie le JWT, charge le profil, la fiche, la conversation et ses messages.
 * 2. Applique les quotas AVANT l'appel (402 avec un code lisible si refus).
 * 3. Construit le prompt : bloc 1 stable (base + tâche) en cache, bloc 2 fiche sans cache.
 * 4. Streame la réponse en SSE : `event: text` pour chaque morceau, `event: done` à la fin.
 * 5. À la fin : enregistre le message assistant et une ligne usage_events.
 */
import type { Config } from "@netlify/functions";
import type Anthropic from "@anthropic-ai/sdk";
import type { MessageStream } from "@anthropic-ai/sdk/lib/MessageStream";
import { anthropicClient, classifyProviderError, currentModel, MAX_OUTPUT_TOKENS, toHttpError } from "../lib/anthropic";
import { businessProfileBlock } from "../lib/business";
import { cleanString, errorResponse, handleError, HttpError, isUuid, methodNotAllowed, readJson } from "../lib/http";
import { costUsd } from "../lib/pricing";
import { stableSystemBlock } from "../lib/prompts";
import { decide, thresholdsFromEnv } from "../lib/quotas";
import {
  loadBusinessProfile,
  loadTrialMonthCost,
  loadUserCosts,
  requireUser,
  type ConversationRow,
  type MessageRow,
} from "../lib/supabase";

const MAX_MESSAGE_CHARS = 6000;
const MAX_HISTORY_MESSAGES = 30;
const MAX_HISTORY_CHARS = 24_000;
const REFUSAL_TEXT = "Je ne peux pas aider sur ce point.";

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/** Garde les derniers messages, bornés en nombre et en caractères. */
function trimHistory(rows: MessageRow[]): Anthropic.MessageParam[] {
  const kept: MessageRow[] = [];
  let chars = 0;
  for (let i = rows.length - 1; i >= 0 && kept.length < MAX_HISTORY_MESSAGES; i -= 1) {
    const row = rows[i];
    if (chars + row.content.length > MAX_HISTORY_CHARS && kept.length > 0) break;
    kept.unshift(row);
    chars += row.content.length;
  }
  // L'API exige une alternance user/assistant commençant par user : on fusionne les doublons.
  const merged: Anthropic.MessageParam[] = [];
  for (const row of kept) {
    const last = merged[merged.length - 1];
    if (last && last.role === row.role) {
      last.content = `${last.content as string}\n\n${row.content}`;
    } else {
      merged.push({ role: row.role, content: row.content });
    }
  }
  while (merged.length && merged[0].role !== "user") merged.shift();
  return merged;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return methodNotAllowed(["POST"]);

  try {
    const { user, profile, db } = await requireUser(req);
    const body = await readJson<{ conversation_id?: unknown; content?: unknown }>(req);
    const content = cleanString(body.content, MAX_MESSAGE_CHARS);
    if (!isUuid(body.conversation_id)) throw new HttpError(400, "bad_request", "Conversation invalide.");
    if (!content) throw new HttpError(400, "bad_request", "Message vide.");
    const conversationId = body.conversation_id;

    const { data: conversation, error: convError } = await db
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle<ConversationRow>();
    if (convError) throw new HttpError(500, "db_error", convError.message);
    if (!conversation) throw new HttpError(404, "not_found", "Conversation introuvable.");

    // Quotas, sur les compteurs existants, avant tout appel.
    const [costs, trialPool, business] = await Promise.all([
      loadUserCosts(db, user.id),
      loadTrialMonthCost(db),
      loadBusinessProfile(db, user.id),
    ]);
    const decision = decide({
      plan: profile.plan,
      userLifetimeUsd: costs.lifetime_usd,
      userMonthUsd: costs.month_usd,
      trialPoolMonthUsd: trialPool,
      thresholds: thresholdsFromEnv(process.env),
    });
    if (!decision.allowed) {
      return errorResponse(402, decision.code, decision.message, { plan: profile.plan, remaining: decision.remaining });
    }

    const { data: historyRows, error: histError } = await db
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (histError) throw new HttpError(500, "db_error", histError.message);

    // Enregistre le message utilisateur avant l'appel.
    const { data: userMessage, error: insertError } = await db
      .from("messages")
      .insert({ conversation_id: conversationId, role: "user", content })
      .select("*")
      .single<MessageRow>();
    if (insertError || !userMessage) throw new HttpError(500, "db_error", insertError?.message ?? "Insertion impossible.");

    const messages = trimHistory([...(historyRows as MessageRow[]), userMessage]);
    const model = currentModel();

    const system: Anthropic.TextBlockParam[] = [
      // Bloc 1 : stable, mis en cache. Rien de volatil ici.
      { type: "text", text: stableSystemBlock(conversation.task_key), cache_control: { type: "ephemeral" } },
      // Bloc 2 : fiche entreprise + date du jour, jamais en cache.
      { type: "text", text: businessProfileBlock(business) },
    ];

    const client = anthropicClient();
    let stream: MessageStream;
    try {
      stream = client.messages.stream({
        model,
        max_tokens: MAX_OUTPUT_TOKENS,
        system,
        messages,
        output_config: { effort: "low" },
        // Pas de paramètre `thinking` : sur Sonnet 5.5 le mode `disabled` renvoie 400, l'omettre suffit.
      });
    } catch (err) {
      throw toHttpError(err);
    }

    const encoder = new TextEncoder();
    const planAtTime = profile.plan;

    const body$ = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (event: string, data: unknown) => {
          try {
            controller.enqueue(encoder.encode(sse(event, data)));
          } catch {
            /* le client a fermé la connexion */
          }
        };

        // Premier octet immédiat : le navigateur sait que la requête est acceptée.
        send("start", { conversation_id: conversationId, user_message_id: userMessage.id, model });

        stream.on("text", (delta: string) => send("text", delta));

        (async () => {
          let assistantText = "";
          let assistantId: string | null = null;
          let usageSummary: Record<string, unknown> | null = null;
          try {
            const final = await stream.finalMessage();
            const refused = final.stop_reason === "refusal";
            assistantText = refused
              ? REFUSAL_TEXT
              : final.content
                  .filter((b): b is Anthropic.TextBlock => b.type === "text")
                  .map((b) => b.text)
                  .join("")
                  .trim();
            if (refused) send("text", REFUSAL_TEXT);

            const cost = costUsd(final.usage, model);
            usageSummary = {
              input_tokens: final.usage.input_tokens,
              cache_creation_input_tokens: final.usage.cache_creation_input_tokens ?? 0,
              cache_read_input_tokens: final.usage.cache_read_input_tokens ?? 0,
              output_tokens: final.usage.output_tokens,
              cost_usd: cost,
              model,
              stop_reason: final.stop_reason,
            };

            const [{ data: saved, error: saveError }, { error: usageError }] = await Promise.all([
              db
                .from("messages")
                .insert({ conversation_id: conversationId, role: "assistant", content: assistantText || "…" })
                .select("id")
                .single<{ id: string }>(),
              db.from("usage_events").insert({
                user_id: user.id,
                conversation_id: conversationId,
                model,
                input_tokens: final.usage.input_tokens,
                cache_creation_input_tokens: final.usage.cache_creation_input_tokens ?? 0,
                cache_read_input_tokens: final.usage.cache_read_input_tokens ?? 0,
                output_tokens: final.usage.output_tokens,
                cost_usd: cost,
                plan_at_time: planAtTime,
              }),
            ]);
            if (saveError) console.error("Enregistrement du message assistant impossible :", saveError.message);
            if (usageError) console.error("Enregistrement de l'usage impossible :", usageError.message);
            assistantId = saved?.id ?? null;
            await db.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

            send("done", { assistant_message_id: assistantId, usage: usageSummary, refused });
          } catch (err) {
            const p = classifyProviderError(err);
            console.error("Erreur pendant le stream :", err);
            send("error", { code: p.code, message: p.message });
          } finally {
            try {
              controller.close();
            } catch {
              /* déjà fermé */
            }
          }
        })();
      },
      cancel() {
        stream.abort();
      },
    });

    return new Response(body$, {
      status: 200,
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "x-accel-buffering": "no",
      },
    });
  } catch (err) {
    return handleError(err);
  }
};

export const config: Config = {
  path: "/api/chat",
};
