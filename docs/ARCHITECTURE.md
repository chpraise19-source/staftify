# Architecture and delivery scope

## Phase 1 foundation

Next.js 16 App Router serves responsive portals and JSON route handlers. TypeScript is strict. Tailwind 4 is initialized; the design system uses CSS variables and responsive components. Supabase Auth uses PKCE email links with server cookie sessions; the request proxy refreshes validated users. Server-only secrets are never imported into client components. The public root is explicitly a demo, not an authenticated facility workspace.

Supabase PostgreSQL is the source of truth. The initial migration defines facilities, profiles, shifts, applications, priority nurses, notifications, attendance codes, attempt counters, timesheets, audit events, and Stripe event receipts. Public sign-up always creates a nurse account. Facility and administrator roles cannot be selected through sign-up metadata. The first administrator must be provisioned through trusted database administration; later facility membership and nurse verification are administrator actions.

## MVP staffing workflows

Active/trialing facilities post shifts. Verified nurses with matching credentials apply. Facility acceptance locks the shift and nurse records, checks schedule overlap, assigns one nurse and closes other applications in the same transaction. Urgent blasts create in-app notifications for matching verified nurses without conflicting accepted shifts; priority nurses are marked and inserted first. Blasts have a 15-minute cooldown. This version does not send SMS or push notifications, or promise timed exclusive access to priority nurses.

A facility issues a cryptographically generated six-digit code valid for 10 minutes for an assigned shift within its attendance window. Only that shift's assigned nurse can redeem it; codes are hashed, single-use, and limited to five attempts per 15-minute window. A failed attempt returns normally so its counter is committed. Codes are displayed only to the issuing facility and must be shared with the nurse in person. Clock-out creates a completed shift; facility approval records who approved the timesheet. Pay is settled outside STAFTIFY.

## Security boundaries

All tables have row-level security. Clients have read grants only where appropriate, plus a restricted shift insertion grant. Sensitive transitions use one authenticated, role-checked transaction function, with a fixed search path and audit records. Subscription updates have a separate service-only function. There is no public administrator registration, no role-edit endpoint available to nurses/facilities, and no application payment collection. Database constraints supplement Zod API validation. POST routes reject mismatched browser origins. Webhooks validate Stripe signatures over the raw body.

Stripe Checkout uses a server-configured USD monthly price that must be exactly 39900 cents. Signed subscription events are deduplicated and older events ignored; the billing portal handles plan/account management. Checkout and customer access require facility authorization. The database service key is used only by the webhook handler.

## Deliberate boundaries and outstanding production work

The code and local database/browser flows are testable without production credentials. Real Supabase Auth, SMTP delivery, hosted RLS behavior, Stripe Checkout/Portal and webhook delivery require connected test accounts before they can be claimed working end to end. SMS, mobile push, automatic license-registry checks, geolocation, dispute resolution, payout rails and EHR/patient data are not included. Credential verification is a human administrator responsibility. Production use needs organization-specific privacy/legal policies, retention requirements and an operating support process. No HIPAA compliance claim is made; do not enter patient information.

The initial MVP uses a single shared dashboard component. Split feature modules and add pagination beyond the initial 100 shifts/200 resource records as usage grows. CSV reporting exports visible shift records, not a payroll ledger. Live subscriptions require Stripe test-mode validation before enabling real charges. No account, cloud database, or hosting resource is created without authorization.
