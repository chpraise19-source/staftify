# Supabase and application activation

Use only the STAFTIFY project. Fneox must remain untouched.

Secure settings: `NEXT_PUBLIC_SUPABASE_URL`, the project's public anon key as `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `APP_URL` set to the actual website origin. Server-only credentials such as `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` must never have a NEXT_PUBLIC prefix or be committed. Supabase management authorization (`SUPABASE_ACCESS_TOKEN`) is required for automated hosted migration/configuration through available management APIs.

Apply migrations `202610200001_foundation.sql` and `202610200002_real_workflows.sql` in order through trusted migration tooling. Do not apply any `tests/*.sql` file to the application project. Auth should require confirmed email, a password of at least 12 characters, the intended APP_URL Site URL and an allowed `/auth/callback` redirect. Configure SMTP and appropriate signup/email rate limits for production.

After the owner's authenticated identity exists, provision its administrator role through trusted project administration. Ordinary users cannot create administrators. Facility owners register and onboard themselves; admin review and a valid subscription are prerequisites for shift publication. Nurses register and submit professional profiles and current licenses for administrator verification. No subscription or credential bypass is included.

Stripe uses a USD $399 monthly recurring price and signed subscription webhooks. Billing activation remains separate from shift drafting. Configure `STRIPE_PRICE_ID`, server API/signing credentials, a billing portal and webhook subscriptions for customer.subscription.created/updated/deleted. The webhook endpoint is `/api/stripe/webhook`. Verify test billing and cancellation before live charging.

Build and run the actual Next.js project with its standard scripts. The root routes users to their real workspace or sign-in. No standalone HTML or sample-data fallback exists. Hosting and account authorization are separate from the local development process; do not claim a public URL until deployment is complete and checked.
