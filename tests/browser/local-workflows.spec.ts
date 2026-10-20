import { test, expect, type Page } from "@playwright/test";
async function nav(page: Page, tab: string) {
  const toggle = page.getByRole("button", { name: "Toggle navigation" });
  if (await toggle.isVisible()) await toggle.click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: tab, exact: true })
    .click();
}
async function portal(page: Page, role: string) {
  await page.getByRole("link", { name: role, exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Development preview" }),
  ).toBeVisible();
}
const med = "Registered Nurse · Med/Surg";
for (const mobile of [false, true])
  test(`complete persisted nurse-to-facility workflow${mobile ? " on mobile" : ""}`, async ({
    page,
    context,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    const apiCalls: string[] = [];
    context.on("request", (r) => {
      if (new URL(r.url()).pathname.startsWith("/api/")) apiCalls.push(r.url());
    });
    await page.goto("/");
    await page.getByRole("link", { name: "I'm a Nurse — Find Shifts" }).click();
    await expect(
      page.getByRole("heading", { name: "Find shifts", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: med, exact: true }).click();
    await page
      .getByRole("button", { name: "Apply for shift", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Your applications" }),
    ).toBeVisible();
    const request = page.locator(".application-card").filter({ hasText: med });
    await expect(request.locator(".badge")).toHaveText("pending");
    await page.reload();
    await expect(request.locator(".badge")).toHaveText("pending");
    await portal(page, "Facility");
    await nav(page, "Applications");
    const application = page
      .locator(".application-card")
      .filter({ hasText: "Sarah Mitchell" })
      .filter({ hasText: med });
    await application.getByRole("button", { name: "Approve & book" }).click();
    await expect(application.locator(".badge")).toHaveText("accepted");
    await portal(page, "Nurse");
    await nav(page, "My applications");
    await expect(
      page
        .locator(".application-card")
        .filter({ hasText: med })
        .locator(".badge"),
    ).toHaveText("accepted");
    await nav(page, "Schedule");
    await expect(
      page.getByRole("button", { name: new RegExp("Med/Surg") }),
    ).toBeVisible();
    const facility = await context.newPage();
    await facility.goto("/development/facility#Timesheets");
    await facility.getByLabel("Assigned shift").selectOption("preview-medsurg");
    await facility
      .getByRole("button", { name: "Generate clock-in code", exact: true })
      .click();
    const inCode = await facility.locator(".code-card strong").innerText();
    await nav(page, "Timesheets");
    await page.getByLabel("Assigned shift").selectOption("preview-medsurg");
    await page.getByLabel("Verification code").fill(inCode);
    await page.getByRole("button", { name: "Clock in", exact: true }).click();
    await expect(
      page.locator(".timesheet-card").filter({ hasText: med }),
    ).toContainText("In progress");
    await expect(
      facility.locator(".timesheet-card").filter({ hasText: med }),
    ).toContainText("In progress");
    await facility
      .getByRole("button", { name: "Generate clock-out code", exact: true })
      .click();
    await expect(facility.locator(".code-card")).toContainText(
      "CLOCK-OUT CODE",
    );
    const outCode = await facility.locator(".code-card strong").innerText();
    await page.getByLabel("Verification code").fill(outCode);
    await page.getByRole("button", { name: "Clock out", exact: true }).click();
    await expect(
      page.locator(".timesheet-card").filter({ hasText: med }),
    ).toContainText("Needs approval");
    const timesheet = facility
      .locator(".timesheet-card")
      .filter({ hasText: med });
    await timesheet.getByRole("button", { name: "Approve timesheet" }).click();
    await expect(timesheet.locator(".badge")).toHaveText("Approved");
    await expect(
      page
        .locator(".timesheet-card")
        .filter({ hasText: med })
        .locator(".badge"),
    ).toHaveText("Approved");
    await page.reload();
    await expect(
      page
        .locator(".timesheet-card")
        .filter({ hasText: med })
        .locator(".badge"),
    ).toHaveText("Approved");
    await facility
      .getByRole("button", { name: "Local activity", exact: true })
      .click();
    await expect(facility.getByRole("dialog")).toContainText(
      "Timesheet approved",
    );
    await facility.keyboard.press("Escape");
    await facility
      .getByRole("button", { name: "Reset local test data", exact: true })
      .click();
    await facility.getByRole("button", { name: "Keep local data" }).click();
    await expect(timesheet.locator(".badge")).toHaveText("Approved");
    await facility
      .getByRole("button", { name: "Reset local test data", exact: true })
      .click();
    await facility.getByRole("button", { name: "Confirm reset" }).click();
    await expect(timesheet).toHaveCount(0);
    await expect(
      page.locator(".timesheet-card").filter({ hasText: med }),
    ).toHaveCount(0);
    expect(apiCalls).toEqual([]);
  });
test("draft creation, editing, publishing, withdrawal, declining and cancellation persist across portals", async ({
  page,
}) => {
  await page.goto("/development/facility");
  await page.getByRole("button", { name: "Create shift", exact: true }).click();
  await page.getByLabel("Shift title").fill("Local workflow RN");
  await page.getByLabel("Hourly rate (USD)").fill("56");
  await page.getByLabel("Department", { exact: true }).fill("General Nursing");
  await page.getByLabel("Start date & time").fill("2030-01-10T07:00");
  await page.getByLabel("End date & time").fill("2030-01-10T19:00");
  await page.getByRole("button", { name: "Save draft shift" }).click();
  await nav(page, "Shifts");
  await page
    .getByRole("button", { name: "Local workflow RN", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit shift", exact: true }).click();
  await page.getByLabel("Hourly rate (USD)").fill("59");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page
    .getByRole("button", { name: "Local workflow RN", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("$59");
  await page
    .getByRole("button", { name: "Publish shift", exact: true })
    .click();
  await portal(page, "Nurse");
  await nav(page, "Find shifts");
  await page
    .getByRole("button", { name: "Local workflow RN", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Apply for shift", exact: true })
    .click();
  const app = page
    .locator(".application-card")
    .filter({ hasText: "Local workflow RN" });
  await app.getByRole("button", { name: "Withdraw", exact: true }).click();
  await expect(app.locator(".badge")).toHaveText("withdrawn");
  await app.getByRole("button", { name: "View shift" }).click();
  await page
    .getByRole("button", { name: "Apply for shift", exact: true })
    .click();
  await expect(app.locator(".badge")).toHaveText("pending");
  await portal(page, "Facility");
  await nav(page, "Applications");
  const facilityApp = page
    .locator(".application-card")
    .filter({ hasText: "Local workflow RN" });
  await facilityApp
    .getByRole("button", { name: "Decline", exact: true })
    .click();
  await expect(facilityApp.locator(".badge")).toHaveText("declined");
  await nav(page, "Shifts");
  await page
    .getByRole("button", { name: "Local workflow RN", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel shift", exact: true }).click();
  await page.getByRole("button", { name: "Confirm cancellation" }).click();
  await page.reload();
  await expect(
    page
      .locator(".shift-row")
      .filter({ hasText: "Local workflow RN" })
      .locator(".badge"),
  ).toHaveText("cancelled");
});
test("urgent blasts, priority lists, simulated billing, profile changes and administrator verification work", async ({
  page,
}) => {
  await page.goto("/development/facility#Nurse%20network");
  const nurse = page
    .locator(".nurse-card")
    .filter({ hasText: "Sarah Mitchell" });
  await nurse.getByRole("button", { name: "Remove priority" }).click();
  await expect(
    nurse.getByRole("button", { name: "Add priority" }),
  ).toBeVisible();
  await nurse.getByRole("button", { name: "Add priority" }).click();
  await nav(page, "Shifts");
  await page.getByRole("button", { name: med, exact: true }).click();
  await page.getByRole("button", { name: "Send urgent blast" }).click();
  await expect(page.getByRole("dialog").getByRole("status")).toContainText(
    "Simulated",
  );
  await page.keyboard.press("Escape");
  await nav(page, "Subscription");
  await page.getByRole("button", { name: "Manage subscription" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "never collects payment",
  );
  await page.getByRole("button", { name: "Pause test subscription" }).click();
  await expect(page.locator(".billing-panel")).toContainText("inactive");
  await page
    .getByRole("button", { name: "Activate subscription", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Activate test subscription" })
    .click();
  await expect(page.locator(".billing-panel")).toContainText("active");
  await portal(page, "Nurse");
  await page.getByRole("button", { name: /^Notifications/ }).click();
  const notification = page
    .locator(".notification-card")
    .filter({ hasText: "[Simulated] Urgent shift available" });
  await expect(notification).toContainText("priority list");
  await notification.getByRole("button", { name: "Mark read" }).click();
  await expect(
    notification.getByRole("button", { name: "Mark read" }),
  ).toHaveCount(0);
  await nav(page, "Profile");
  await page
    .getByLabel("License number", { exact: true })
    .fill("FICTIONAL-UPDATED-RN");
  await page.getByRole("button", { name: "Save professional profile" }).click();
  await expect(page.locator(".preferences-panel .badge")).toHaveText(
    "Review required",
  );
  await portal(page, "Admin");
  await nav(page, "Members");
  const member = page
    .locator(".member-review")
    .filter({ hasText: "Sarah Mitchell" });
  await expect(member).toContainText("FICTIONAL-UPDATED-RN");
  await member.getByRole("button", { name: "Verify credential" }).click();
  await expect(member.locator(".badge")).toHaveText("Verified");
  await member.getByRole("button", { name: "Suspend account" }).click();
  await portal(page, "Nurse");
  await nav(page, "My applications");
  await page.getByRole("button", { name: "Withdraw", exact: true }).click();
  await expect(page.locator(".form-error[role=alert]")).toContainText(
    "suspended",
  );
  await portal(page, "Admin");
  await nav(page, "Members");
  await page
    .locator(".member-review")
    .filter({ hasText: "Sarah Mitchell" })
    .getByRole("button", { name: "Restore account" })
    .click();
  await portal(page, "Nurse");
  await nav(page, "Profile");
  await expect(page.locator(".preferences-panel .badge")).toHaveText(
    "Verified",
  );
});
test("every portal navigation item opens a working view without client errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const role of ["facility", "nurse", "admin"]) {
    await page.goto("/development/" + role);
    await expect(page.locator(".loading-panel")).toHaveCount(0);
    const names = await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("button")
      .evaluateAll((buttons) =>
        buttons.map((b) => b.getAttribute("aria-label")!),
      );
    for (const name of names) {
      await nav(page, name);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        name === "Overview" ? new RegExp("Welcome,") : name,
      );
      await expect(
        page
          .locator(
            "main > .panel, main .resource-panel, main .schedule-panel, main .billing-panel, main .attendance-layout, main .hero",
          )
          .first(),
      ).toBeVisible();
    }
  }
  expect(errors).toEqual([]);
});
test("incompatible local data fails visibly and reset repairs it without live API calls", async ({
  page,
}) => {
  await page.goto("/development/nurse");
  await expect(page.locator(".loading-panel")).toHaveCount(0);
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("staftify-development-v1", 1);
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction("state", "readwrite");
          tx.objectStore("state").put(
            { version: 99, data: { profiles: [] } },
            "workspace",
          );
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onabort = () => {
            db.close();
            reject(tx.error);
          };
        };
        request.onerror = () => reject(request.error);
      }),
  );
  await page.reload();
  await expect(page.locator(".form-error[role=alert]")).toContainText(
    "incompatible",
  );
  await expect(
    page.getByRole("heading", { name: "Local test storage unavailable" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Reset local test data", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm reset" }).click();
  await expect(
    page.getByRole("heading", { name: "Shift marketplace" }),
  ).toBeVisible();
  await expect(page.locator(".form-error[role=alert]")).toHaveCount(0);
});
