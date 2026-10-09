/**
 * POST /api/stripe-webhook — vérifie la signature Stripe puis :
 *   checkout.session.completed, invoice.paid  → plan `pro`
 *   customer.subscription.deleted             → plan `trial`
 *   customer.subscription.updated             → met à jour le statut
 */
import type { Config } from "@netlify/functions";
import Stripe from "stripe";
import { env } from "../lib/env";
import { errorResponse, json, methodNotAllowed } from "../lib/http";
import { supabaseAdmin } from "../lib/supabase";

async function findUserId(stripe: Stripe, customerId: string | null, hinted?: string | null): Promise<string | null> {
  const db = supabaseAdmin();
  if (hinted) return hinted;
  if (!customerId) return null;
  const { data } = await db.from("profiles").select("id").eq("stripe_customer_id", customerId).maybeSingle<{ id: string }>();
  if (data?.id) return data.id;
  const customer = await stripe.customers.retrieve(customerId);
  if (!customer.deleted) {
    const fromMeta = customer.metadata?.supabase_user_id;
    if (fromMeta) return fromMeta;
    if (customer.email) {
      const { data: byEmail } = await db
        .from("profiles")
        .select("id")
        .ilike("email", customer.email)
        .maybeSingle<{ id: string }>();
      if (byEmail?.id) return byEmail.id;
    }
  }
  return null;
}

function customerIdOf(value: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return methodNotAllowed(["POST"]);
  const secret = env("STRIPE_SECRET_KEY");
  const webhookSecret = env("STRIPE_WEBHOOK_SECRET");
  if (!secret || !webhookSecret) return errorResponse(404, "stripe_disabled", "Stripe non configuré.");

  const stripe = new Stripe(secret);
  const signature = req.headers.get("stripe-signature");
  if (!signature) return errorResponse(400, "bad_signature", "Signature absente.");

  let event: Stripe.Event;
  try {
    const payload = await req.text();
    event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
  } catch (err) {
    console.error("Signature Stripe invalide :", err);
    return errorResponse(400, "bad_signature", "Signature invalide.");
  }

  const db = supabaseAdmin();
  const setPlan = async (userId: string, plan: "pro" | "trial", status: string | null, customerId: string | null) => {
    const update: Record<string, unknown> = { plan, stripe_subscription_status: status };
    if (customerId) update.stripe_customer_id = customerId;
    const { error } = await db.from("profiles").update(update).eq("id", userId);
    if (error) throw new Error(error.message);
  };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode !== "subscription") break;
        const customerId = customerIdOf(session.customer);
        const userId = await findUserId(stripe, customerId, session.client_reference_id ?? session.metadata?.supabase_user_id);
        if (userId) await setPlan(userId, "pro", "active", customerId);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object;
        const customerId = customerIdOf(invoice.customer);
        const userId = await findUserId(stripe, customerId);
        if (userId) await setPlan(userId, "pro", "active", customerId);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const customerId = customerIdOf(sub.customer);
        const userId = await findUserId(stripe, customerId, sub.metadata?.supabase_user_id);
        if (userId) {
          const active = sub.status === "active" || sub.status === "trialing";
          await setPlan(userId, active ? "pro" : "trial", sub.status, customerId);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const customerId = customerIdOf(sub.customer);
        const userId = await findUserId(stripe, customerId, sub.metadata?.supabase_user_id);
        if (userId) await setPlan(userId, "trial", "canceled", customerId);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Traitement du webhook Stripe échoué :", err);
    return errorResponse(500, "webhook_error", "Traitement échoué.");
  }

  return json({ received: true });
};

export const config: Config = {
  path: "/api/stripe-webhook",
};
