import { describe, expect, it, vi } from "vitest";

/* Mocks : Supabase et Anthropic remplacés pour tester le chemin complet du flux. */
const inserted: Array<{ table: string; row: Record<string, unknown> }> = [];

function table(name: string) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  Object.assign(chain, {
    select: self,
    eq: self,
    order: self,
    limit: async () => ({ data: [], error: null }),
    maybeSingle: async () => ({
      data: name === "conversations" ? { id: "11111111-1111-4111-8111-111111111111", user_id: "u1", task_key: "avis_google", title: "t" } : null,
      error: null,
    }),
    insert: (row: Record<string, unknown>) => {
      inserted.push({ table: name, row });
      const r = { select: () => ({ single: async () => ({ data: { id: `${name}-id` }, error: null }) }) };
      return Object.assign(Promise.resolve({ data: null, error: null }), r);
    },
    update: () => ({ eq: async () => ({ error: null }) }),
  });
  return chain;
}

vi.mock("../lib/supabase", () => ({
  requireUser: async () => ({
    user: { id: "u1", email: "a@b.fr" },
    profile: { id: "u1", email: "a@b.fr", plan: "trial" },
    db: { from: table },
  }),
  loadBusinessProfile: async () => ({ nom_entreprise: "Dubois", metier: "plombier", ville: "Sedan", ton: "tutoiement" }),
  loadUserCosts: async () => ({ lifetime_usd: 0.2, month_usd: 0.2 }),
  loadTrialMonthCost: async () => 10,
}));

vi.mock("../lib/anthropic", async (importOriginal) => {
  const original = await importOriginal<typeof import("../lib/anthropic")>();
  return {
    ...original,
    currentModel: () => "claude-sonnet-5-5",
    anthropicClient: () => ({
      messages: {
        stream: (params: Record<string, unknown>) => {
          lastParams = params;
          const handlers: Record<string, (d: string) => void> = {};
          return {
            on: (event: string, cb: (d: string) => void) => {
              handlers[event] = cb;
            },
            finalMessage: async () => {
              handlers.text?.("Merci ");
              handlers.text?.("Julie.");
              return {
                stop_reason: "end_turn",
                content: [{ type: "text", text: "Merci Julie." }],
                usage: { input_tokens: 300, output_tokens: 40, cache_creation_input_tokens: 0, cache_read_input_tokens: 1500 },
              };
            },
            abort: () => undefined,
          };
        },
      },
    }),
  };
});

let lastParams: Record<string, unknown> = {};

describe("chat : flux SSE complet", () => {
  it("streame le texte, enregistre le message et l'usage, met le bloc 1 en cache", async () => {
    const { default: chat } = await import("./chat");
    const res = await chat(
      new Request("http://x/api/chat", {
        method: "POST",
        headers: { authorization: "Bearer jwt" },
        body: JSON.stringify({ conversation_id: "11111111-1111-4111-8111-111111111111", content: "Avis : super boulot" }),
      }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const text = await res.text();

    expect(text).toContain("event: start");
    expect(text).toContain('event: text\ndata: "Merci "');
    expect(text).toContain("event: done");
    expect(text).toContain('"cache_read_input_tokens":1500');

    // Paramètres envoyés au modèle.
    expect(lastParams.model).toBe("claude-sonnet-5-5");
    expect(lastParams.max_tokens).toBe(2000);
    expect(lastParams.output_config).toEqual({ effort: "low" });
    expect(lastParams).not.toHaveProperty("thinking");
    const system = lastParams.system as Array<{ text: string; cache_control?: unknown }>;
    expect(system).toHaveLength(2);
    expect(system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(system[0].text).toContain("# Tâche : répondre à un avis Google");
    expect(system[1].cache_control).toBeUndefined();
    expect(system[1].text).toContain("Dubois");
    expect(system[1].text).toContain("Date du jour");

    // Enregistrements : message user, message assistant, usage.
    const tables = inserted.map((i) => i.table);
    expect(tables).toEqual(["messages", "messages", "usage_events"]);
    const usage = inserted[2].row;
    expect(usage.cost_usd).toBeCloseTo((300 * 2 + 40 * 10 + 1500 * 0.2) / 1e6, 10);
    expect(usage.plan_at_time).toBe("trial");
  });
});
