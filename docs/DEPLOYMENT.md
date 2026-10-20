# Deployment and account activation

The application builds and starts without credentials for demo review. The running cloud process is an internal preview; it is not a publicly deployed website.

## Supabase

Connect the STAFTIFY Supabase project and provide `NEXT_PUBLIC_SUPABASE_URL`, its public anon key, and the server-only `SUPABASE_SERVICE_ROLE_KEY` through secure environment configuration. Set `APP_URL` to the actual website origin. Apply `supabase/migrations/202610200001_foundation.sql` once to a new project using its migration tooling. This is the production schema, not the local test bootstrap. Set the Auth Site URL to the website and allow its `/auth/callback` redirect; configure SMTP/email limits for the intended audience.

After the owner signs in, provision that known user's profile as `admin` through trusted project administration. Do not expose an admin bootstrap endpoint or accept an admin role in user metadata. The admin portal can then create facilities, assign existing users to facilities, and record independently verified nursing credentials. Nurses must be verified before applying.

## Stripe

Connect a Stripe test account first. Secure server variables: `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. Set `STRIPE_PRICE_ID` to a USD recurring $399/month price. Configure a billing portal and an HTTPS webhook at `/api/stripe/webhook` for `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`. Preserve signature verification and configure webhook retries. Facility subscriptions remain inactive until verified events arrive. STAFTIFY never takes nurse payments.

Validate a real test checkout, webhook activation, payment failure/cancellation, billing portal access, duplicate delivery and final subscription state before switching to live keys. Test checkout/portal links are not generated with invented credentials. Do not put any server secrets in `NEXT_PUBLIC_*` variables.

## Hosting

Vercel is the default proposed host for this Next.js app; a Node.js 24 host is also supported. Import the connected GitHub branch, configure secure environment variables, and build with the repository's standard scripts. A hosting account connection and authorization to deploy are required to publish a preview. Production release also requires approved account configuration, real identity/credential checks, policies and successful connected-service validation.

## What the owner needs to supply

- The Supabase project URL/connection authorization and secure bindings listed above.
- Stripe test-account authorization and secure server bindings.
- Hosting account connection and preview deployment authorization.

Never share secret values in chat or commit environment files. The engineer performs installation, migrations, tests and deployment through available authorized tools once access is connected; no local PowerShell/VS Code steps are required.
