import Stripe from "stripe";
import { requireUser, apiError } from "@/lib/auth";
export async function POST(req: Request) {
  try {
    const { db, profile } = await requireUser(["facility"]);
    if (
      !process.env.STRIPE_SECRET_KEY ||
      !process.env.STRIPE_PRICE_ID ||
      !process.env.APP_URL
    )
      return Response.json(
        { error: "Billing requires a connected Stripe account." },
        { status: 503 },
      );
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { data: facility, error } = await db
      .from("facilities")
      .select("*")
      .eq("id", profile.facility_id)
      .single();
    if (error) throw error;
    const body = await req.json();
    if (body.portal) {
      if (!facility.stripe_customer_id)
        throw new Error("No billing customer exists yet");
      const portal = await stripe.billingPortal.sessions.create({
        customer: facility.stripe_customer_id,
        return_url: process.env.APP_URL + "/dashboard",
      });
      return Response.json({ url: portal.url });
    }
    if (["active", "trialing"].includes(facility.subscription_status))
      throw new Error(
        "Your subscription is already active. Use Manage billing.",
      );
    const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID);
    if (
      price.unit_amount !== 39900 ||
      price.currency !== "usd" ||
      price.recurring?.interval !== "month" ||
      price.recurring.interval_count !== 1
    )
      throw new Error("Configured Stripe price must be $399 USD per month");
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        line_items: [{ price: price.id, quantity: 1 }],
        ...(facility.stripe_customer_id
          ? { customer: facility.stripe_customer_id }
          : {}),
        client_reference_id: facility.id,
        metadata: { facility_id: facility.id },
        subscription_data: { metadata: { facility_id: facility.id } },
        success_url: process.env.APP_URL + "/dashboard?billing=success",
        cancel_url: process.env.APP_URL + "/dashboard?billing=cancelled",
      },
      {
        idempotencyKey:
          "checkout-" + facility.id + "-" + Math.floor(Date.now() / 300000),
      },
    );
    return Response.json({ url: session.url });
  } catch (e) {
    return apiError(e);
  }
}
