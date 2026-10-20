# Verification of the real application

## Automated checks

- Unit tests: shift/time/rate validation, pay calculation, account-role/password validation, facility onboarding and professional-license validation.
- Isolated PostgreSQL integration: initial booking/OTP/security checks, then the additive real-workflow migration. Assertions cover email confirmation, untrusted role metadata, idempotent facility onboarding, facility isolation, nurse private license access, draft/edit/publish/cancel, optimistic concurrency, subscription and verification gates, persistent applications/withdrawal/booking, credential-change reverification, cancellation notifications, user suspension and revoked legacy RPC access.
- Browser checks: real login/registration pages, mobile layout, account-type selection, protected routes/APIs and absence of retired demo routes. Connected-service tests are documented separately when run; none use fake response data to claim real persistence.
- Production build and strict TypeScript checks.

`scripts/test-database.sh` creates a disposable PostgreSQL 17 container, applies test auth-role scaffolding, runs original and new migration assertions, and removes the container. `tests/db-bootstrap.sql` is test-only and must never be applied to Supabase. Test fixtures roll back and are not part of the running application database.

## Scope limits

Cloud Supabase credentials are not yet provided. Until its migrations and authenticated operations have been exercised, no hosted registration, email delivery or cloud persistence claim is made. Local service validation, if available, is distinct from hosted validation. Stripe test Checkout, webhook delivery and subscription activation remain dependent on connected test account credentials. Production hosting and public port forwarding are not provided by the currently available tools.

## Current run outcome

Production build and TypeScript checks passed. Six unit tests and five unauthenticated browser checks passed. The isolated PostgreSQL integration scripts passed, including both migrations. The full real Auth/REST/browser scenario is implemented in `tests/browser/persistent-workflow.spec.ts` but has not executed: it requires an actual isolated Supabase service stack and is explicitly skipped without that configuration. The attempted local Supabase database image could not be extracted within the Docker storage limit, including a smaller supported PostgreSQL version attempt. No hosted credentials are present. This remains an integration-validation blocker, not a passing test or a simulated backend.
