# Verification of the real application

## Automated checks

- Unit tests: shift/time/rate validation, pay calculation, account-role/password validation, facility onboarding and professional-license validation.
- Isolated PostgreSQL integration: initial booking/OTP/security checks, then the additive real-workflow migration. Assertions cover email confirmation, untrusted role metadata, idempotent facility onboarding, facility isolation, nurse private license access, draft/edit/publish/cancel, optimistic concurrency, subscription and verification gates, persistent applications/withdrawal/booking, credential-change reverification, cancellation notifications, user suspension and revoked legacy RPC access.
- Browser checks: real login/registration pages, mobile layout, account-type selection, protected routes/APIs and absence of retired demo routes. Connected-service tests are documented separately when run; none use fake response data to claim real persistence.
- Production build and strict TypeScript checks.

`scripts/test-database.sh` creates a disposable PostgreSQL 17 container, applies test auth-role scaffolding, runs original and new migration assertions, and removes the container. `tests/db-bootstrap.sql` is test-only and must never be applied to Supabase. Test fixtures roll back and are not part of the running application database.

## Scope limits

Cloud Supabase credentials are not yet provided. Until its migrations and authenticated operations have been exercised, no hosted registration, email delivery or cloud persistence claim is made. Local service validation, if available, is distinct from hosted validation. Stripe test Checkout, webhook delivery and subscription activation remain dependent on connected test account credentials. Production hosting and public port forwarding are not provided by the currently available tools.

## Initial foundation run outcome (historical)

Production build and TypeScript checks passed. Six unit tests and five unauthenticated browser checks passed. The isolated PostgreSQL integration scripts passed, including both migrations. The full real Auth/REST/browser scenario is implemented in `tests/browser/persistent-workflow.spec.ts` but has not executed: it requires an actual isolated Supabase service stack and is explicitly skipped without that configuration. The attempted local Supabase database image could not be extracted within the Docker storage limit, including a smaller supported PostgreSQL version attempt. No hosted credentials are present. This remains an integration-validation blocker, not a passing test or a simulated backend.

## Development screen-review increment (historical)

Nine unit tests pass, including fixture scoping/independence and explicit opt-in gating. Eleven browser checks pass across the real account screens and all three development views. They cover URL-backed navigation/history/reload, shift filters/details/CSV, production shift-form validation, blocked sample mutations, nursing profiles/applications/attendance, admin directories, mobile layout/navigation and continued protection of live routes/APIs. Tests observe requests to verify that preview actions send no live API calls.

A separate running server with the flag disabled returned 404 for `/development/facility`, hid the sign-in review link and continued to reject unauthenticated workspace requests. Both PostgreSQL migration/security integration suites passed again. The production build and TypeScript check pass. The full real Supabase Auth/REST workflow remains explicitly skipped because its external/local-service prerequisite is unresolved; preview checks do not replace that test.

## Opening-screen redesign (historical)

The root route now renders the actual Next.js welcome screen with original branding and a locally bundled original healthcare visual. Nine unit tests, twenty browser tests, strict TypeScript checks, the production build and both isolated PostgreSQL security/workflow suites pass. Browser coverage includes nurse/facility entry and role-preserving sign-in links; 320, 390, 412, 768 and 1440px layouts; image loading; touch target sizes; header alignment and caption visibility; keyboard skip navigation; reduced motion; and the separate administrator entry rejecting unauthenticated credentials. Existing workspace preview and protected-route tests continue to pass.

The real Supabase Auth/REST workflow remains the one explicitly skipped test, pending a configured backend. Successful administrator authentication against a live database has not been tested. The new administrator endpoint checks the authenticated user's existing database role and suspension status before entering the dashboard, and never creates administrator accounts. Updated captures from the running production Next.js build are `docs/screens/opening-desktop.png` and `docs/screens/opening-mobile.png`.

## Persistent local workflow increment

Fourteen unit tests pass, including the new typed local state transitions: request/approval/competing requests, withdrawal/reapplication, booking overlap rejection, facility ownership, subscription gates, role-scoped views, immutable failures, administrator verification/suspension, single-use/expired attendance codes and timesheet approval. Twenty-six browser checks pass against the production Next.js build with local development mode explicitly enabled. They include the complete cross-portal workflow on desktop and mobile, second-tab refresh, reload persistence, draft editing/publication/cancellation, withdrawal/decline, urgent notifications, priority lists, simulated subscription controls, license changes/reverification, every role's navigation items and recovery from an incompatible local snapshot. Tests observe requests to confirm that local test operations do not call live APIs.

Strict TypeScript checks and the production build pass. Both isolated PostgreSQL security/workflow suites pass unchanged. An independent normal-start server with review mode disabled returned 404 for `/development` and all three test portals, retained the actual registration links and protected `/dashboard`. The live Supabase Auth/REST workflow remains the single explicitly skipped browser test; local simulation is not a substitute for connected-service testing.

No new screenshots, standalone HTML files, public tunnels or website deployment were created for this increment. Browser tests execute the actual Next.js application. A hot-reloading development server is left running for continued work, with reusable startup instructions saved to the cloud environment draft. The currently available tools cannot expose an interactive browser session or forward its port to the user; no usable external preview URL is claimed.

The hot-reload server initially rejected development assets for the internal Chromium origin. The version-matched Next.js documentation identified `allowedDevOrigins`; adding only `127.0.0.1` fixed the restriction. The complete request → booking → OTP attendance → approved timesheet → reset browser scenario then passed against `npm run dev:review`. Image quality 85 is now explicitly allowed alongside the default 75. Next.js generated its version-matched `AGENTS.md` instructions during startup; those instructions are retained.
