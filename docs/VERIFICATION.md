# Verification

## Local checks performed

- Production build and strict TypeScript check.
- Three Node tests: valid shift/pay calculation, invalid shift inputs, fractional pay rounding.
- Five Chromium browser tests: facility demo post/search/CSV, nurse demo application, admin/auth configuration gating, mobile navigation and billing demo disclosure, cross-origin mutation rejection.
- PostgreSQL 17 migration execution and transactional integration tests: role defaults, denied privilege escalation, cross-facility isolation, subscription-gated insertion, unverified nurse rejection, unique applications, priority/blast notification creation and cooldown, shift acceptance, overlap prevention, OTP redemption, expiry, replay prevention and persisted brute-force attempt limits, timesheet completion/approval, admin actions and stale/duplicate Stripe events.
- Production dependency audit reported zero known vulnerabilities at installation time.

## Database test harness

`tests/db-bootstrap.sql` emulates Supabase's auth identity function and database roles on an isolated empty PostgreSQL database. It is only for tests; do not run it on Supabase. Apply the bootstrap, then the production migration, then `tests/database.sql` with `psql -v ON_ERROR_STOP=1`. Assertions fail the process; fixture changes roll back at completion. `scripts/test-database.sh` automates this using a disposable Docker PostgreSQL 17 container.

This validates PostgreSQL rules/functions under authenticated roles, not Supabase HTTP/Auth service integration. Hosted Supabase and Stripe calls remain unverified until credentials are supplied. The browser suite tests explicitly labeled demo state, not a pretend live backend.

## Connected demo update

- 11 Node tests now cover core validation, demo applications, acceptance, schedule overlaps, withdrawals, role checks, credential mismatches, attendance expiry/replay/attempt limits, timesheet approval, administrator actions, notifications, preferences, subscription simulation, cancellation and recovery of invalid saved state.
- Browser coverage now includes persistent posting/search/pagination/CSV, cross-portal apply/accept, withdrawals and credential gating, complete attendance/approval, priority lists/blasts/notifications/cancellation, admin directory creation/verification/pause/reactivation, reports/preferences/reset, mobile navigation/pricing/dialogs, protected live endpoints, cross-tab state synchronization, and the self-contained preview with external requests blocked.
- Demo UI defects discovered and fixed: badge text changing accessible navigation names; directory search leaking between sections; Settings being clipped on shorter screens; crypto.randomUUID unavailable on non-secure preview origins. Mobile shift listings now show the full rate/status without horizontal scrolling.

Tests exercise simulated local data. External Supabase, Stripe, Vercel and account integration work is deferred by request. SQL integration checks from the original foundation remain documented above; they were not needed to change the browser-only demo.
