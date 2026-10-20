# STAFTIFY application architecture

## Identity and onboarding

Next.js App Router serves the application and authenticated route handlers. Supabase Auth handles real email/password registration, email confirmation and cookie sessions. The request proxy refreshes server-validated sessions and rejects mismatched browser origins on mutations. Initial roles always default to nurse, regardless of untrusted sign-up metadata. Confirmed new users complete an atomic onboarding function: a facility account creates its own isolated facility, or a nurse completes account registration. Onboarding is idempotent. It cannot create an administrator or transfer ownership of another facility.

Administrators are provisioned only through trusted project administration for a known owner identity. There is no first-user-admin rule, public administrator registration or role editing by ordinary users.

## Facility and shift lifecycle

`manage_shift` is the only facility write interface for shift creation/editing/publication/cancellation. It verifies the authenticated caller, facility ownership, active account, input validity and shift lifecycle under row locks. New shifts are drafts. Publication requires a verified facility and active/trialing subscription. Optimistic version checks prevent stale edits. Pending applications freeze shift terms; accepted shifts cannot be edited. Cancellation notifies affected applicants, preserves history and refuses shifts with attendance.

Direct client insertion is revoked. All shift mutations are transactional and audited. A before-update trigger changes the version timestamp after booking and attendance as well as edits.

## Nursing, booking, attendance and administration

Professional profiles persist clinical specialties, location, experience and bios separately from private license records. Only the nurse and administrators may read license numbers. A changed credential or license removes verification. Applying and accepting require a verified, current matching credential. Booking locks the shift and nurse, rejects overlapping assignments and closes competing applications atomically. Withdrawal/decline lock shift then application consistently with acceptance.

Urgent blasts are in-app notifications, with the original cooldown and priority-nurse marking. No SMS or push provider is claimed. Attendance uses facility-issued, hashed, expiring, single-use codes in the real shift window. Failed attempts are persisted and rate limited; only the assigned nurse may redeem the code. Database timestamps record clock-in/out; facilities approve completed timesheets. Facilities arrange nurse payment directly.

Administrator controls verify/reject facilities, verify nursing credentials after independent checks, and suspend non-administrator accounts. Suspension is enforced by restrictive RLS policies and mutation functions, including direct PostgREST requests. Legacy booking/attendance internals remain callable only by the hardened server-side function, not by authenticated clients directly.

## Application UI and API

`Workspace` fetches authenticated PostgreSQL resources and refreshes while visible. It never substitutes fabricated records after failures. The UI has role-specific navigation, empty/loading/error states, drafts and status filters, schedule views, application review, nursing profiles, attendance, notification read actions, CSV reports and administration. The API initially caps resource reads at 500 rows, disclosed in reports/list views. Backend pagination and specialized reporting are subsequent scaling work.

Secure cloud bindings and deployment are operational prerequisites separate from implementation. Local PostgreSQL integration tests validate database logic; hosted Auth/email, Supabase HTTP and Stripe operations must be tested through connected services before production readiness is claimed. No patient information belongs in shift notes or profiles.

## Explicit development screen review

The current review mode is an opt-in rendering adapter, not a replacement for the application. `/development/[role]` checks the server-only `STAFTIFY_ENABLE_PREVIEW` flag, validates the three permitted review roles and supplies fictional typed records to the existing Workspace component. The normal dashboard still loads real authenticated PostgreSQL resources and never uses fixtures. A shared client request guard prevents review actions from sending API writes, including profile/verification/billing/attendance actions. Sample workspaces do not poll live APIs, do not create or alter authentication sessions and do not save or simulate business transitions. Data is recreated per request.

The development header and persistent preview indicator identify the mode. An access-requirements dialog explains live prerequisites. Sample CSV files include a data-source column and a development-sample filename. Default production settings disable the review route and hide its sign-in link; administrators cannot be authenticated by choosing a development role.

Design improvements are shared with production: attention queues, next-assigned-shift summaries, admin community metrics, stronger typography/status contrast, URL-backed tab navigation with browser history, focused page headings, mobile drawer keyboard containment/Escape handling and background interaction prevention. No Supabase mutation or permission function was changed for review mode.
