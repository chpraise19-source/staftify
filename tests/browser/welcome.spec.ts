import { test, expect } from "@playwright/test";
for (const role of ["nurse", "facility"] as const) {
  test(`${role} welcome path preserves role through registration and sign-in`, async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("link", {
        name:
          role === "nurse"
            ? "I'm a Nurse — Find Shifts"
            : "I'm a Facility — Find Nurses",
      })
      .click();
    await expect(page).toHaveURL(new RegExp(`/register\\?type=${role}`));
    await expect(
      page.getByRole("button", {
        name: role === "nurse" ? "Nursing professional" : "Healthcare facility",
        exact: true,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("link", { name: "Sign in", exact: false }).click();
    await expect(page).toHaveURL(new RegExp(`/login\\?type=${role}`));
    await page.getByRole("link", { name: "Create an account" }).click();
    await expect(page).toHaveURL(new RegExp(`/register\\?type=${role}`));
  });
}
for (const width of [320, 390, 412, 768, 1440]) {
  test(`welcome screen fits ${width}px and loads the original visual`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Healthcare staffing. On demand.",
    );
    await expect(
      page.getByText(
        "Connecting qualified nurses with healthcare facilities, one shift at a time.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page.locator(".welcome-photo img")).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator(".welcome-photo img")
          .evaluate((img: HTMLImageElement) => img.naturalWidth),
      )
      .toBeGreaterThan(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const cls of [".nurse-path", ".facility-path"]) {
      const box = await page.locator(cls).boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(56);
    }
    const signIn = await page.locator(".welcome-signin").boundingBox();
    const create = await page.locator(".welcome-create").boundingBox();
    expect(
      Math.abs(
        signIn!.y + signIn!.height / 2 - (create!.y + create!.height / 2),
      ),
    ).toBeLessThan(2);
    const caption = await page.locator(".visual-caption").boundingBox();
    const card = await page.locator(".care-connection-card").boundingBox();
    expect(caption!.y + caption!.height).toBeLessThan(card!.y);
    expect(errors).toEqual([]);
  });
}
test("keyboard skip link and reduced motion are supported", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to getting started" }),
  ).toBeFocused();
  expect(
    await page
      .locator(".welcome-copy")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
});
test("administrator entry is separate and cannot authenticate without secure backend", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Administrator access" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(
    page.getByRole("heading", { name: "Administrator sign-in" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Create an account/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Admin", exact: true }),
  ).toHaveCount(0);
  const result = await request.post("/api/auth/admin", {
    data: { email: "unverified@example.com", password: "invalid-test-only" },
  });
  expect([401, 403, 503]).toContain(result.status());
});
