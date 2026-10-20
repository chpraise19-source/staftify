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

The application shows empty states for empty database tables and connection errors for failed queries. Standalone HTML exports, sample data, localStorage simulators and demo routes have been removed.

## Run and validate

Node.js 24. Standard scripts: `npm ci`, `npm run build`, `npm start` (or `npm run dev`). Configure Supabase through secure environment variables listed in `.env.example`. Never commit local environment files. Apply both SQL migrations in order to the intended STAFTIFY project. See [deployment](docs/DEPLOYMENT.md), [architecture](docs/ARCHITECTURE.md) and [verification](docs/VERIFICATION.md).

Checks: `npm test`, `npm run typecheck`, `npm run build`, `bash scripts/test-database.sh`, and `npm run test:browser` against the running app. PostgreSQL tests use an isolated disposable database and never seed the application database. CI runs these same check categories.

Publication requires facility verification plus an active/trialing subscription. Nurses require manually verified matching credentials and an unexpired license before applying or being booked. No UI toggle bypasses billing or verification.

## Development screen review

The application has explicit, opt-in screen-review routes at `/development/facility`, `/development/nurse`, and `/development/admin`. They render the **same Next.js workspace components** used by authenticated accounts, with clearly labeled fictional records. There is no standalone HTML application, localStorage business simulator, or automatic fallback in the live dashboard.

`npm run dev:review` or `npm run start:review` enables `STAFTIFY_ENABLE_PREVIEW=true`. The normal production default is disabled: the development routes return 404 and the sign-in review link is hidden. Preview mode permits navigation, filters, schedule browsing, real form validation, dialogs and explicitly named sample CSV exports; it blocks all API reads/writes from the sample workspace and never grants a sample identity access to `/dashboard` or authenticated APIs.

Supabase is required for real registration/sign-in, persistent shifts, applications/bookings, notifications, license/facility verification, OTP attendance and timesheet approvals. Stripe is required for actual facility billing. The “Live access requirements” dialog explains those boundaries on every preview portal.

Current screen captures from the running Next.js app are in [docs/screens](docs/screens). The preview routes require a running Next.js process, not static file hosting. Public port forwarding remains unavailable in this environment; no public website URL is claimed.

The welcome screen uses an original generated healthcare photograph, bundled locally for fast loading without third-party image requests. Reduced-motion settings are respected. Development review links appear only when `STAFTIFY_ENABLE_PREVIEW=true`; they never bypass authentication for production data.
