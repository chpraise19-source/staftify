# STAFTIFY

A Next.js, TypeScript, Tailwind CSS and Supabase healthcare staffing application. Facilities pay nurses directly; STAFTIFY collects facility subscription fees through Stripe.

## Real application routes

- `/` opens the authenticated workspace or redirects to sign-in.
- `/register`: facility or nurse email/password registration with email confirmation.
- `/login`: real Supabase authentication; no sample accounts or role switching.
- `/onboarding`: confirmed account setup. Facility registration creates a facility owned by that user. Nurse registration creates a professional account. Administrator access is never public.
- `/dashboard`: role-specific workspace loaded from PostgreSQL through authenticated APIs and row-level security.

Facility workflows include draft shift creation/editing, publication, cancellation, application approval/booking, urgent in-app blasts, priority nurses, OTP attendance codes and timesheet approval. Nurse workflows include professional profiles, private licensing details, shift search, applications, confirmed schedules, attendance and timesheets. Administrators review facilities and licenses and can suspend non-administrator accounts.

The application shows empty states for empty database tables and connection errors for failed queries. Standalone HTML exports, sample data, localStorage simulators and demo routes have been removed.

## Run and validate

Node.js 24. Standard scripts: `npm ci`, `npm run build`, `npm start` (or `npm run dev`). Configure Supabase through secure environment variables listed in `.env.example`. Never commit local environment files. Apply both SQL migrations in order to the intended STAFTIFY project. See [deployment](docs/DEPLOYMENT.md), [architecture](docs/ARCHITECTURE.md) and [verification](docs/VERIFICATION.md).

Checks: `npm test`, `npm run typecheck`, `npm run build`, `bash scripts/test-database.sh`, and `npm run test:browser` against the running app. PostgreSQL tests use an isolated disposable database and never seed the application database. CI runs these same check categories.

Publication requires facility verification plus an active/trialing subscription. Nurses require manually verified matching credentials and an unexpired license before applying or being booked. No UI toggle bypasses billing or verification.
