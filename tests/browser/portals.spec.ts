import { test, expect, type Page } from "@playwright/test";
async function portal(page: Page, name: "Facility" | "Nurse" | "Admin") {
  await page.getByRole("button", { name, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    name === "Facility" ? "Alex" : name === "Nurse" ? "Sarah" : "Jordan",
  );
}
async function nav(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name, exact: true })
    .click();
}
async function openShift(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
}
test("facility posts a persistent shift, searches, paginates and exports", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Good morning, Alex" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Post a shift", exact: true }).click();
  await page.getByLabel("Shift title").fill("Cardiac care RN");
  await page.getByLabel("Department", { exact: true }).fill("Cardiology");
  await page.getByLabel("Start date and time").fill("2030-01-01T07:00");
  await page.getByLabel("End date and time").fill("2030-01-01T19:00");
  await page.getByRole("button", { name: "Add demo shift" }).click();
  await expect(page.getByRole("status")).toContainText("No real shift");
  await page.getByLabel("Search shifts").fill("Cardiac");
  await expect(
    page.getByRole("button", { name: "Cardiac care RN", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByLabel("Search shifts").fill("Cardiac");
  await expect(
    page.getByRole("button", { name: "Cardiac care RN", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Search shifts").fill("");
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.getByText("2 / 2", { exact: true })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export report" }).click();
  expect((await download).suggestedFilename()).toBe(
    "staftify-shift-report.csv",
  );
});
test("nurse applies, facility accepts, schedule and application update across portals", async ({
  page,
}) => {
  await page.goto("/demo/nurse");
  await openShift(page, "Registered Nurse · Med/Surg");
  await page
    .getByRole("button", { name: "Apply for shift", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("No real application");
  await nav(page, "My applications");
  await expect(
    page.getByText("Registered Nurse · Med/Surg", { exact: true }),
  ).toBeVisible();
  await portal(page, "Facility");
  await nav(page, "Applications");
  const card = page
    .locator(".application-card")
    .filter({ hasText: "Sarah Mitchell" });
  await card.getByRole("button", { name: "Accept application" }).click();
  await expect(card.getByText("accepted", { exact: true })).toBeVisible();
  await portal(page, "Nurse");
  await nav(page, "My applications");
  await expect(page.getByText("accepted", { exact: true })).toBeVisible();
  await nav(page, "Schedule");
  await page.getByRole("button", { name: "Next week" }).click();
  await page.getByRole("button", { name: "Previous week" }).click();
  await expect(
    page.getByText("Staffing calendar", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "My schedule" }),
  ).toBeVisible();
});
test("application withdrawal persists and credential mismatch prevents applying", async ({
  page,
}) => {
  await page.goto("/demo/nurse");
  await openShift(page, "Licensed Practical Nurse");
  await expect(
    page.getByRole("button", { name: "Apply for shift", exact: true }),
  ).toBeDisabled();
  await expect(page.getByText(/requires a LPN credential/)).toBeVisible();
  await page.getByRole("button", { name: "Close details" }).click();
  await openShift(page, "Registered Nurse · Med/Surg");
  await page
    .getByRole("button", { name: "Apply for shift", exact: true })
    .click();
  await nav(page, "My applications");
  await page.getByRole("button", { name: "Withdraw", exact: true }).click();
  await expect(page.getByText("withdrawn", { exact: true })).toBeVisible();
  await page.reload();
  await nav(page, "My applications");
  await expect(page.getByText("withdrawn", { exact: true })).toBeVisible();
});
test("attendance goes through generated codes, clock in/out and facility approval", async ({
  page,
}) => {
  await page.goto("/");
  await nav(page, "Timesheets");
  await page
    .getByRole("button", { name: "Generate clock-in code", exact: true })
    .click();
  const inCode = await page.locator(".code-card strong").first().innerText();
  expect(inCode).toMatch(/^\d{6}$/);
  await portal(page, "Nurse");
  await nav(page, "Timesheets");
  await page.getByLabel("Attendance code").fill(inCode);
  await page.getByRole("button", { name: "Clock in", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("clock-in recorded");
  await portal(page, "Facility");
  await nav(page, "Timesheets");
  await page
    .getByRole("button", { name: "Generate clock-out code", exact: true })
    .click();
  const outCode = await page
    .locator(".code-card")
    .filter({ hasText: "CLOCK-OUT" })
    .locator("strong")
    .innerText();
  await portal(page, "Nurse");
  await nav(page, "Timesheets");
  await page.getByLabel("Attendance code").fill(outCode);
  await page.getByRole("button", { name: "Clock out", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("clock-out recorded");
  await portal(page, "Facility");
  await nav(page, "Timesheets");
  const card = page
    .locator(".timesheet-card")
    .filter({ hasText: "Cardiology" });
  await card.getByRole("button", { name: "Approve timesheet" }).click();
  await expect(card.getByText("Approved", { exact: true })).toBeVisible();
});
test("priority network, urgent blasts, notifications and cancellation work", async ({
  page,
}) => {
  await page.goto("/");
  await nav(page, "Nurse network");
  const nurse = page.locator(".nurse-card").filter({ hasText: "James Wilson" });
  await nurse.getByRole("button", { name: "Add to priority" }).click();
  await nurse.getByRole("button", { name: "Remove priority" }).click();
  await expect(
    nurse.getByRole("button", { name: "Add to priority" }),
  ).toBeVisible();
  await nav(page, "Shifts");
  await openShift(page, "Registered Nurse · Med/Surg");
  await page.getByRole("button", { name: "Send urgent blast" }).click();
  await expect(page.getByRole("dialog").getByRole("status")).toContainText(
    "urgent blast",
  );
  await page.getByRole("button", { name: "Close details" }).click();
  await portal(page, "Nurse");
  await page.getByRole("button", { name: /^Notifications/ }).click();
  await expect(
    page.getByText("Urgent staffing request", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mark all read" }).click();
  await expect(
    page.getByText("0 unread updates in this demo portal."),
  ).toBeVisible();
  await portal(page, "Facility");
  await nav(page, "Shifts");
  await openShift(page, "Registered Nurse · Med/Surg");
  await page.getByRole("button", { name: "Cancel shift", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("cancelled");
  await nav(page, "Applications");
  await expect(page.getByText("declined", { exact: true })).toBeVisible();
});
test("admin verifies nurses, creates directory records, and pauses facilities", async ({
  page,
}) => {
  await page.goto("/demo/admin");
  await nav(page, "Members");
  const nurse = page
    .locator(".nurse-card")
    .filter({ hasText: "Daniel Brooks" });
  await nurse.getByRole("button", { name: "Verify demo credential" }).click();
  await expect(nurse.getByText("Verified", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add nurse", exact: true }).click();
  await page.getByLabel("Full name").fill("Maria Santos");
  await page.getByLabel("Specialty", { exact: true }).fill("Pediatrics");
  await page.getByRole("button", { name: "Add demo nurse" }).click();
  await page.getByLabel("Search nurses").fill("Maria");
  await expect(
    page.getByRole("heading", { name: "Maria Santos" }),
  ).toBeVisible();
  await nav(page, "Facilities");
  await page.getByRole("button", { name: "Add facility", exact: true }).click();
  await page.getByLabel("Facility name").fill("Pineview Care");
  await page.getByLabel("City, state").fill("Durham, NC");
  await page.getByRole("button", { name: "Create demo facility" }).click();
  const facility = page
    .locator(".facility-card")
    .filter({ hasText: "Pineview Care" });
  await facility.getByRole("button", { name: "Pause facility" }).click();
  await expect(facility.getByText("Paused", { exact: true })).toBeVisible();
  await facility.getByRole("button", { name: "Reactivate facility" }).click();
  await expect(facility.getByText("Active", { exact: true })).toBeVisible();
});
test("filters, reports, preferences and reset are functional", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Filter credential").selectOption("LPN");
  await expect(page.locator(".shift-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Urgent only" }).click();
  await expect(page.getByText(/No matching shifts/)).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await nav(page, "Reports");
  await expect(
    page.getByRole("heading", { name: "Staffing performance" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Facility administrator name").fill("Taylor Morgan");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await nav(page, "Overview");
  await expect(
    page.getByRole("heading", { name: "Good morning, Taylor" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Good morning, Taylor" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Reset demo workspace" }).click();
  await page.getByRole("button", { name: "Reset sample data" }).click();
  await nav(page, "Overview");
  await expect(
    page.getByRole("heading", { name: "Good morning, Alex" }),
  ).toBeVisible();
});
test("mobile navigation, pricing simulation and dialogs have no page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Good morning, Alex" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await nav(page, "Subscription");
  await expect(
    page.getByRole("heading", { name: "Great teams start here." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause demo subscription" }).click();
  await expect(page.getByRole("status")).toContainText("No charge was made");
  await page.getByRole("button", { name: "Post a shift", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("live actions remain protected while integrations are deferred", async ({
  page,
  request,
}) => {
  await page.goto("/login");
  await expect(
    page.getByRole("button", { name: "Send sign-in link" }),
  ).toBeDisabled();
  const r = await request.post("/api/actions", {
    data: {
      action: "accept",
      application_id: "00000000-0000-0000-0000-000000000001",
    },
  });
  expect(r.ok()).toBe(false);
  const webhook = await request.post("/api/stripe/webhook", { data: {} });
  expect(webhook.status()).toBe(503);
  const csrf = await request.post("/api/actions", {
    headers: { Origin: "https://untrusted.example" },
    data: { action: "blast" },
  });
  expect(csrf.status()).toBe(403);
});
test("separate tabs share local demo changes", async ({ page, context }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Good morning, Alex" }),
  ).toBeVisible();
  const nurse = await context.newPage();
  await nurse.goto("/demo/nurse");
  await openShift(nurse, "Registered Nurse · Med/Surg");
  await nurse
    .getByRole("button", { name: "Apply for shift", exact: true })
    .click();
  await nav(page, "Applications");
  await expect(
    page.locator(".application-card").filter({ hasText: "Sarah Mitchell" }),
  ).toBeVisible();
});

test("standalone HTML preview works across portals without external requests", async ({
  page,
}) => {
  const { readFile } = await import("node:fs/promises");
  const html = await readFile("preview/dist/staftify-demo.html", "utf8");
  const unexpected: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/*", (route) => {
    if (route.request().url() === "http://staftify-preview.test/")
      return route.fulfill({ contentType: "text/html", body: html });
    unexpected.push(route.request().url());
    return route.abort();
  });
  await page.goto("http://staftify-preview.test/");
  await expect(
    page.getByRole("heading", { name: "Good morning, Alex" }),
  ).toBeVisible();
  await portal(page, "Nurse");
  await openShift(page, "Registered Nurse · Med/Surg");
  await page
    .getByRole("button", { name: "Apply for shift", exact: true })
    .click();
  await portal(page, "Facility");
  await nav(page, "Applications");
  await expect(
    page.locator(".application-card").filter({ hasText: "Sarah Mitchell" }),
  ).toBeVisible();
  await portal(page, "Admin");
  await nav(page, "Members");
  await expect(
    page.getByRole("heading", { name: "Account administration" }),
  ).toBeVisible();
  expect(unexpected).toEqual([]);
  expect(errors).toEqual([]);
});
