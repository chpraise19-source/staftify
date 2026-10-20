import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
export async function POST(req: Request) {
  if (
    !process.env.STRIPE_SECRET_KEY ||
    !process.env.STRIPE_WEBHOOK_SECRET ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL
  )
    return Response.json({ error: "Webhook not configured" }, { status: 503 });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      await req.text(),
      req.headers.get("stripe-signature") ?? "",
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  try {
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as Stripe.Subscription;
      const fid = sub.metadata.facility_id;
      if (fid) {
        const { error } = await db.rpc("sync_subscription", {
          event_id: event.id,
          event_created: event.created,
          facility: fid,
          customer:
            typeof sub.customer === "string" ? sub.customer : sub.customer.id,
          subscription: sub.id,
          state: sub.status,
        });
        if (error) throw error;
      }
    }
    return Response.json({ received: true });
  } catch {
    return Response.json(
      { error: "Webhook processing failed; retry required" },
      { status: 500 },
    );
  }
}
