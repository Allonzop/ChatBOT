/**
 * /api/conversations
 *   GET    /api/conversations           liste (sans messages)
 *   POST   /api/conversations           { task_key, title? } → conversation
 *   GET    /api/conversations/:id       conversation + messages
 *   PATCH  /api/conversations/:id       { title }
 *   DELETE /api/conversations/:id
 */
import type { Config, Context } from "@netlify/functions";
import { cleanString, handleError, HttpError, isUuid, json, methodNotAllowed, readJson } from "../lib/http";
import { DEFAULT_TASK_KEY, isTaskKey } from "../lib/prompts";
import { requireUser, type ConversationRow, type MessageRow } from "../lib/supabase";

const MAX_TITLE = 80;

export default async (req: Request, context: Context): Promise<Response> => {
  try {
    const { user, db } = await requireUser(req);
    const id = context.params?.id;

    if (!id) {
      if (req.method === "GET") {
        const { data, error } = await db
          .from("conversations")
          .select("id, task_key, title, created_at, updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(200);
        if (error) throw new HttpError(500, "db_error", error.message);
        return json({ conversations: data ?? [] });
      }
      if (req.method === "POST") {
        const body = await readJson<{ task_key?: unknown; title?: unknown }>(req);
        const taskKey = isTaskKey(body.task_key) ? body.task_key : DEFAULT_TASK_KEY;
        const title = cleanString(body.title, MAX_TITLE) || "Nouvelle conversation";
        const { data, error } = await db
          .from("conversations")
          .insert({ user_id: user.id, task_key: taskKey, title })
          .select("*")
          .single<ConversationRow>();
        if (error || !data) throw new HttpError(500, "db_error", error?.message ?? "Création impossible.");
        return json({ conversation: data }, { status: 201 });
      }
      return methodNotAllowed(["GET", "POST"]);
    }

    if (!isUuid(id)) throw new HttpError(400, "bad_request", "Identifiant invalide.");

    const { data: conversation, error: convError } = await db
      .from("conversations")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle<ConversationRow>();
    if (convError) throw new HttpError(500, "db_error", convError.message);
    if (!conversation) throw new HttpError(404, "not_found", "Conversation introuvable.");

    if (req.method === "GET") {
      const { data: messages, error } = await db
        .from("messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true })
        .limit(500);
      if (error) throw new HttpError(500, "db_error", error.message);
      return json({ conversation, messages: (messages ?? []) as MessageRow[] });
    }

    if (req.method === "PATCH") {
      const body = await readJson<{ title?: unknown }>(req);
      const title = cleanString(body.title, MAX_TITLE);
      if (!title) throw new HttpError(400, "bad_request", "Titre vide.");
      const { data, error } = await db
        .from("conversations")
        .update({ title })
        .eq("id", id)
        .eq("user_id", user.id)
        .select("*")
        .single<ConversationRow>();
      if (error || !data) throw new HttpError(500, "db_error", error?.message ?? "Mise à jour impossible.");
      return json({ conversation: data });
    }

    if (req.method === "DELETE") {
      const { error } = await db.from("conversations").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw new HttpError(500, "db_error", error.message);
      return json({ ok: true });
    }

    return methodNotAllowed(["GET", "PATCH", "DELETE"]);
  } catch (err) {
    return handleError(err);
  }
};

export const config: Config = {
  path: ["/api/conversations", "/api/conversations/:id"],
};
