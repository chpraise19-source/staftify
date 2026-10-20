# STAFTIFY

Healthcare staffing platform built with Next.js App Router, TypeScript, Tailwind CSS, Supabase, and Stripe. Facilities pay nurses directly; STAFTIFY charges facilities **$399 USD/month**.

## Current application

- `/`: labeled interactive facility demo (sample data, no real bookings).
- `/demo/facility`, `/demo/nurse`, `/demo/admin`: responsive role previews.
- `/login`: Supabase email-link authentication.
- `/dashboard`: authenticated workspace; role comes from the database, never a user-selected URL.
- Facility: post shifts, review/accept applications, priority nurses, urgent in-app notifications, attendance codes, timesheet approval, reports, subscription checkout and billing portal.
- Nurse: browse shifts, apply, review applications, enter attendance codes, view timesheets.
- Admin: directory, facility creation/assignment, manual credential verification, subscription status, timesheets and reports.

## Development

Node.js 24 and npm. `npm ci`, `npm run dev`; production uses `npm run build` and `npm start`. Copy `.env.example` into an ignored local environment file only when configuring real services. With no credentials, demo pages work and live actions fail closed. Demo state is local to the mounted browser session and is intentionally not persisted.

`npm test` runs domain validation/pay calculations. `npm run typecheck` checks TypeScript. Browser tests run with `npx playwright test` against a running server; set `CHROMIUM_PATH` to use an existing Chromium binary, or install the Playwright-managed browser. See [verification](docs/VERIFICATION.md) for database tests and actual results.

See [architecture](docs/ARCHITECTURE.md) and [deployment](docs/DEPLOYMENT.md) for security boundaries, infrastructure, and remaining activation steps. No source from another project was used or changed.
