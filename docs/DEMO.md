# Connected demo walkthrough

STAFTIFY now opens directly in the facility demo. The Facility, Nurse, and Admin buttons switch sample personas. All demo actions use browser data, with no Supabase, Stripe, Vercel, credentials or external requests required. No real bookings, payments, messages, license checks or account changes occur.

## Follow a shift through the workflow

1. In Facility, post a future RN shift with a title, department, start/end time and hourly rate. Search and filters find it; the record persists after reloading.
2. Switch to Nurse (Sarah Mitchell, a verified RN), view the shift and apply. RN-only credential checks and schedule conflicts are enforced by the simulator.
3. Switch back to Facility → Applications. Accept Sarah's application. The shift becomes filled, other pending applications for it are declined, and it appears on Sarah's schedule.
4. In Facility → Timesheets, choose the assigned shift and generate a clock-in code. Switch to Nurse → Timesheets, choose that shift and enter the code. Repeat for clock-out, then return to Facility and approve the completed timesheet. Codes expire after 10 minutes and can be used once. Demo attendance works at any time to make the flow reviewable immediately.
5. Reports and CSV exports reflect your visible records. Facilities pay nurses directly; displayed amounts are estimates, not charges.

## Explore the other features

- Shift details: estimated pay, requirements, facility location, urgent blast and cancellation for open facility shifts.
- Schedule: previous/next week, Today, selectable dates and shift detail dialogs. Nurse schedules contain only assigned shifts.
- Nurse network: name/specialty search, verified/pending/priority filters, priority list toggles.
- Applications: pending/accepted/declined/withdrawn history; pending nurse applications can be withdrawn.
- Admin: verify/unverify sample nurses, add nurses/facilities, pause/reactivate facilities and view platform reports.
- Notifications: application, acceptance, staffing and attendance updates; unread filter and mark-read actions.
- Pricing: activate/pause a sample $399/month subscription; no payment page or connection is used.
- Settings: save the facility administrator name and sample notification preferences, or confirm a full reset of local sample data.
- Help & tour: a quick introduction to the connected flow.

Changes are shared across tabs on the same origin. Exported HTML and the Next.js server have separate storage origins, so their sample workspaces are independent. Browser policies may disable persistence; the app then states that changes will only last for the mounted session. This is a local simulation, not collaborative production storage.

## Preview artifact

`npm run preview:export` builds the app and generates `preview/dist/staftify-demo.html`. This file includes the complete interactive demo and can be opened in an ordinary browser without installing dependencies. It is also tested through an intercepted browser response with all external requests blocked. The managed testing browser blocks direct file-URL navigation, so file-URL behavior is not claimed as tested in that managed browser.

The cloud development server is running internally for engineering checks. The available tools do not provide public port forwarding or control of the user's in-app browser. No public preview URL is claimed; the self-contained HTML is the portable review option while hosting remains deferred.
