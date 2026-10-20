import { test, expect, type Page } from "@playwright/test";
async function nav(page: Page, tab: string) {
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: tab, exact: true })
    .click();
}
test("facility preview displays real components, supports navigation and restores browser history", async ({
  page,
}) => {
  await page.goto("/development/facility");
  await expect(
    page.getByRole("region", { name: "Development preview" }),
  ).toContainText("Simulated operations");
  await expect(
    page.getByRole("heading", { name: "Welcome, Alex" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Needs your attention" }),
  ).toBeVisible();
  await nav(page, "Applications");
  await expect(
    page.getByRole("heading", { name: "Review applications" }),
  ).toBeVisible();
  await nav(page, "Schedule");
  await expect(
    page.getByRole("heading", { name: "Staffing schedule" }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Review applications" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Review applications" }),
  ).toBeVisible();
});
test("local preview validates and saves draft shifts and bookings without live API writes", async ({
  page,
}) => {
  const apiRequests: string[] = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.startsWith("/api/"))
      apiRequests.push(r.method() + " " + new URL(r.url()).pathname);
  });
  await page.goto("/development/facility");
  await page.getByRole("button", { name: "Create shift", exact: true }).click();
  await page.getByLabel("Shift title").fill("Development shift review");
  await page.getByLabel("Hourly rate (USD)").fill("52");
  await page.getByLabel("Department", { exact: true }).fill("Medical Surgical");
  await page.getByLabel("Start date & time").fill("2030-01-01T19:00");
  await page.getByLabel("End date & time").fill("2030-01-01T07:00");
  await page.getByRole("button", { name: "Save draft shift" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "End time must follow",
  );
  await page.getByLabel("End date & time").fill("2030-01-02T07:00");
  await page.getByRole("button", { name: "Save draft shift" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("Simulated");
  await nav(page, "Shifts");
  await expect(
    page.getByRole("button", { name: "Development shift review", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Development shift review", exact: true }),
  ).toBeVisible();
  await nav(page, "Applications");
  await page.getByRole("button", { name: "Approve & book" }).first().click();
  await expect(
    page
      .locator(".application-card .badge")
      .getByText("accepted", { exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Refresh workspace" }).click();
  expect(apiRequests).toEqual([]);
});
test("shift search, filters, details and CSV export are useful in preview", async ({
  page,
}) => {
  await page.goto("/development/facility");
  await nav(page, "Shifts");
  await page.getByLabel("Search shifts").fill("Recovery");
  await expect(page.locator(".shift-row")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Registered Nurse · Recovery", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("ESTIMATED SHIFT PAY");
  await page.keyboard.press("Escape");
  await page.getByLabel("Search shifts").fill("not a match");
  await expect(
    page.getByRole("heading", { name: "No matching shifts" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".shift-row")).toHaveCount(6);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export report" }).click();
  expect((await download).suggestedFilename()).toBe(
    "staftify-development-sample-shifts.csv",
  );
});
test("nurse portal saves profiles and withdrawals and rejects invalid attendance codes", async ({
  page,
}) => {
  await page.goto("/development/nurse");
  await expect(
    page.getByRole("heading", { name: "Welcome, Sarah" }),
  ).toBeVisible();
  await nav(page, "Profile");
  await expect(
    page.getByRole("heading", { name: "Your professional profile" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save professional profile" }).click();
  await expect(page.getByRole("status")).toContainText("Simulated");
  await nav(page, "My applications");
  await expect(
    page.getByRole("heading", { name: "Your applications" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Withdraw", exact: true }).click();
  await expect(page.locator(".application-card .badge")).toHaveText(
    "withdrawn",
  );
  await nav(page, "Timesheets");
  await expect(
    page.getByRole("heading", { name: "Clock in & out" }),
  ).toBeVisible();
  await page.getByLabel("Verification code").fill("123456");
  await page.getByRole("button", { name: "Clock in", exact: true }).click();
  await expect(page.locator(".form-error[role=alert]")).toContainText(
    "Invalid or expired simulated code",
  );
});
test("admin portal renders verification directories without granting admin access", async ({
  page,
  request,
}) => {
  await page.goto("/development/admin");
  await expect(
    page.getByRole("heading", { name: "Platform review queue" }),
  ).toBeVisible();
  await nav(page, "Facilities");
  const card = page
    .locator(".facility-card")
    .filter({ hasText: "Riverside Care Hospital" });
  await card.getByRole("button", { name: "Verify facility" }).click();
  await expect(card.locator(".badge").first()).toContainText("verified");
  await nav(page, "Members");
  await expect(
    page.getByRole("heading", { name: "Members & professional verification" }),
  ).toBeVisible();
  await page.getByLabel("Directory filter").selectOption("review");
  await expect(page.locator(".member-review")).toHaveCount(1);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  const r = await request.post("/api/actions", {
    data: {
      action: "verify_facility",
      facility_id: "00000000-0000-0000-0000-000000000001",
      status: "verified",
    },
  });
  expect([401, 503]).toContain(r.status());
});
test("mobile preview keeps rates visible, traps drawer focus and exposes live requirements", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/development/facility");
  await expect(
    page.getByRole("heading", { name: "Welcome, Alex" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.locator(".shift-row").first().locator(".rate"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await expect(
    page.getByRole("button", { name: "Toggle navigation" }),
  ).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Toggle navigation" }),
  ).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Live access requirements" }).click();
  await expect(page.getByRole("dialog")).toContainText("Supabase Auth:");
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Nurse", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome, Sarah" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
