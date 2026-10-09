import { describe, expect, it } from "vitest";
import chat from "./chat";
import conversations from "./conversations";
import profile from "./profile";

const ctx = { params: {} } as unknown as Parameters<typeof conversations>[1];

describe("fonctions : garde d'authentification", () => {
  it("chat refuse sans JWT", async () => {
    const res = await chat(new Request("http://x/api/chat", { method: "POST", body: "{}" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("unauthenticated");
  });

  it("chat refuse les autres méthodes", async () => {
    const res = await chat(new Request("http://x/api/chat", { method: "GET" }));
    expect(res.status).toBe(405);
  });

  it("conversations et profile refusent sans JWT", async () => {
    expect((await conversations(new Request("http://x/api/conversations"), ctx)).status).toBe(401);
    expect((await profile(new Request("http://x/api/profile"))).status).toBe(401);
  });
});
