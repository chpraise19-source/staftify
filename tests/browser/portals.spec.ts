import { test, expect } from "@playwright/test";
test("root opens real sign-in without a demo or fabricated account", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(page.getByText("INTERACTIVE DEMO")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Facility", exact: true }),
  ).toHaveCount(0);
});
test("facility and nurse registration are real account forms", async ({
  page,
}) => {
  await page.goto("/register");
  await expect(
    page.getByRole("button", { name: "Healthcare facility", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Your full name")).toBeVisible();
  await expect(page.getByLabel("Confirm password")).toBeVisible();
  await page
    .getByRole("button", { name: "Nursing professional", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Nursing professional", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Create nurse account" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Admin", exact: true }),
  ).toHaveCount(0);
});
test("mobile registration fits the viewport and login navigation works", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/register?type=nurse");
  await expect(
    page.getByRole("button", { name: "Create nurse account" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Sign in", exact: false }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
});
test("protected workspace, onboarding and APIs require real authentication", async ({
  page,
  request,
}) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/login/);
  for (const path of ["/api/workspace", "/api/shifts"]) {
    const r = await request.get(path);
    expect([401, 503]).toContain(r.status());
  }
  const r = await request.post("/api/shifts", {
    data: { title: "Unauthorized" },
  });
  expect([401, 503]).toContain(r.status());
  const csrf = await request.patch(
    "/api/shifts/00000000-0000-0000-0000-000000000001",
    {
      headers: { Origin: "https://untrusted.example" },
      data: { operation: "publish" },
    },
  );
  expect(csrf.status()).toBe(403);
});
test("retired demo routes are not available", async ({ request }) => {
  const r = await request.get("/demo/facility");
  expect(r.status()).toBe(404);
});
