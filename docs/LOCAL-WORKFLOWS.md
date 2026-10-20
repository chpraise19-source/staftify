# Local STAFTIFY workflow

This is the real Next.js application, using the same workspace components as production. It runs locally with `STAFTIFY_ENABLE_PREVIEW=true`; there is no standalone HTML application or deployment.

## Staffing walkthrough

1. On the opening screen, choose **I'm a Nurse — Find Shifts**. The development banner identifies Sarah Mitchell as a fictional nurse test account.
2. View **Registered Nurse · Med/Surg**, then **Apply for shift**. The application opens **My applications** with a pending request. Reloading preserves it.
3. Use the **Facility** portal switcher, then **Applications**. Approve Sarah’s Med/Surg request using **Approve & book**. Competing requests are declined; the shift is filled.
4. Return to **Nurse** to see the accepted application and confirmed **Schedule**.
5. In **Facility → Timesheets**, select the Med/Surg shift and generate a clock-in code. Keep this tab open or copy the fictional six-digit code before switching portals.
6. In **Nurse → Timesheets**, select the same shift, enter the code, then choose **Clock in**. An in-progress timesheet appears in both portals.
7. Generate a clock-out code in Facility, redeem it in Nurse, then approve the completed timesheet in Facility. The approval appears in both portals and remains after reload.

A second tab on the same browser origin updates automatically. Different browser profiles/devices or different origins have separate data. Private browsing and browser storage policies can restrict persistence.

## Other operations

Facilities can create/edit draft shifts, publish/cancel them, decline requests, send simulated in-app urgent blasts, manage priorities and approve hours. Nurses can search/filter shifts, view details, withdraw/reapply, edit professional profiles and view notifications, schedules and reports. Administrators can verify facilities/credentials and suspend/restore non-administrator test accounts. License changes remove local verification until an administrator reviews them. The subscription dialog simulates activation/pause; it never opens checkout or charges a card.

**Local activity** records the latest 100 successful operations. **Reset local test data** includes confirmation, clears all local test portals and restores fictional records. It also repairs an incompatible local snapshot. Storage errors remain visible instead of silently pretending that a save succeeded.

## Simulation boundaries

No fictional test identity signs into Supabase or acquires a real administrator session. No test mutation reaches the production APIs. The data is stored locally in IndexedDB and is not a live service or security boundary. Do not enter real credentials, license numbers, payment information or patient information.

To make future shifts testable immediately, local attendance ignores real shift windows; immediate clock-out records at least one simulated minute. Codes expire in ten minutes and cannot be reused. Production OTP security, time windows, rate limits and database timestamps are preserved in the separate Supabase implementation.

Actual registration, email confirmation, multi-user persistence, authoritative licensing checks and payments require connected services. The local workflow tests do not establish production readiness for those services.
