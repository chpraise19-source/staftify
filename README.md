# STAFTIFY

A Next.js, TypeScript, Tailwind CSS and Supabase healthcare staffing application. Facilities pay nurses directly; STAFTIFY collects facility subscription fees through Stripe.

## Real application routes

- `/` opens the responsive STAFTIFY welcome screen, with role-specific nurse/facility registration and sign-in paths. Returning users sign in and enter `/dashboard`, which resolves their trusted database role.
- `/admin/login` is a separate administrator entry. The server checks the existing administrator role and suspension status; public registration never grants administrator access.
- `/register`: facility or nurse email/password registration with email confirmation.
- `/login`: real Supabase authentication; no sample accounts or role switching.
- `/onboarding`: confirmed account setup. Facility registration creates a facility owned by that user. Nurse registration creates a professional account. Administrator access is never public.
- `/dashboard`: role-specific workspace loaded from PostgreSQL through authenticated APIs and row-level security.

Facility workflows include draft shift creation/editing, publication, cancellation, application approval/booking, urgent in-app blasts, priority nurses, OTP attendance codes and timesheet approval. Nurse workflows include professional profiles, private licensing details, shift search, applications, confirmed schedules, attendance and timesheets. Administrators review facilities and licenses and can suspend non-administrator accounts.

The authenticated application shows empty states for empty database tables and connection errors for failed queries. It never substitutes test data after a connection failure. Local test workflows are available only in the separately labeled, opt-in development workspace inside the same Next.js app.

## Run and validate

Node.js 24. Standard scripts: `npm ci`, `npm run build`, `npm start` (or `npm run dev`). Configure Supabase through secure environment variables listed in `.env.example`. Never commit local environment files. Apply both SQL migrations in order to the intended STAFTIFY project. See [deployment](docs/DEPLOYMENT.md), [architecture](docs/ARCHITECTURE.md) and [verification](docs/VERIFICATION.md).

Checks: `npm test`, `npm run typecheck`, `npm run build`, `bash scripts/test-database.sh`, and `npm run test:browser` against the running app. PostgreSQL tests use an isolated disposable database and never seed the application database. CI runs these same check categories.

Publication requires facility verification plus an active/trialing subscription. Nurses require manually verified matching credentials and an unexpired license before applying or being booked. No UI toggle bypasses billing or verification.

## Persistent local development workspace

`npm run dev:review` starts the actual Next.js application with hot reload and enables `STAFTIFY_ENABLE_PREVIEW=true`. `npm run start:review` runs a retained production build with the same explicit opt-in. Normal startup leaves all `/development` routes disabled (404).

In review mode, the opening screen’s nurse/facility buttons enter the corresponding test portal. Sign In and Create Account open `/development`, which clearly identifies the fictional test accounts and explains the workflow. Real Supabase registration/sign-in remain at `/register` and `/login`; administrator sign-in remains separate at `/admin/login`. Ordinary startup retains the real account entry routes.

The three `/development/facility`, `/development/nurse`, and `/development/admin` portals render the **same workspace components** as the production dashboard. A shared IndexedDB database stores fictional local shifts, applications, bookings, notifications, profiles, attendance codes, timesheets, verification and subscription states. Atomic transactions prevent partial updates; BroadcastChannel refreshes other open portal tabs. Data survives reloads and portal navigation on the same browser origin. Other browsers/devices do not share this local database. Browser storage clearing or an explicit reset removes it. Use fictional information only.

A nurse can find a shift, request it, view its pending status, switch to Facility to approve it, and return to the confirmed application/schedule. Facility-issued test codes support clock-in/out followed by timesheet approval. Local attendance deliberately ignores real shift-time windows and records at least one simulated minute for immediate clock-out, so the whole workflow can be exercised immediately. Test codes expire after ten minutes and are single-use. These controls do not validate real attendance, pay, identity or professional credentials.

Shift create/edit/publish/cancel, application withdrawal/decline, urgent in-app blasts, priority lists, notification read actions, professional profile changes, administrator verification/suspension and simulated subscription activation/pause all persist locally. “Local activity” lists operations; “Reset local test data” asks for confirmation and resets all three test portals in this browser. Storage failures are reported and can be repaired with reset. [Local workflow notes](docs/LOCAL-WORKFLOWS.md) describe the behavior and boundaries.

No development workspace operations call production APIs, sign in a fictional user, contact Stripe or change Supabase data. `/dashboard` and all live APIs retain real authentication and RLS. Real multi-user access, email, cloud persistence and production authentication still require Supabase; real billing requires Stripe. Those connections do not block local development.

The current tool surface does not provide interactive preview forwarding or control of the user’s browser. The application can run and be exercised internally, but no externally usable preview URL is claimed. No public tunnel or website deployment is created for this workflow.
