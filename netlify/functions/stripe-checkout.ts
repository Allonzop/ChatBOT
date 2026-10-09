/**
 * POST /api/stripe-checkout — crée une session Checkout en mode abonnement.
 * Actif seulement si STRIPE_SECRET_KEY et STRIPE_PRICE_ID sont définis ;
 * sinon 404 `stripe_disabled` et le front affiche « Me prévenir ».
 */
import type { Config } from "@netlify/functions";
import Stripe from "stripe";
import { env } from "../lib/env";
import { handleError, HttpError, json, methodNotAllowed } from "../lib/http";
import { requireUser } from "../lib/supabase";

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return methodNotAllowed(["POST"]);
  try {
    const secret = env("STRIPE_SECRET_KEY");
    const priceId = env("STRIPE_PRICE_ID");
    if (!secret || !priceId) throw new HttpError(404, "stripe_disabled", "Le paiement en ligne n'est pas encore ouvert.");

    const { user, profile, db } = await requireUser(req);
    const stripe = new Stripe(secret);

    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email || user.email || undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await db.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

    const origin = req.headers.get("origin") ?? new URL(req.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/app/compte?checkout=success`,
      cancel_url: `${origin}/app/compte?checkout=cancel`,
      client_reference_id: user.id,
      metadata: { supabase_user_id: user.id },
      subscription_data: { metadata: { supabase_user_id: user.id } },
      locale: "fr",
      allow_promotion_codes: true,
    });

    if (!session.url) throw new HttpError(502, "stripe_error", "Stripe n'a pas renvoyé d'URL.");
    return json({ url: session.url });
  } catch (err) {
    return handleError(err);
  }
};

export const config: Config = {
  path: "/api/stripe-checkout",
};
