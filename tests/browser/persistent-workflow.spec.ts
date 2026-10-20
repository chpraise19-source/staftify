import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
const enabled = process.env.STAFTIFY_LOCAL_INTEGRATION === "1";
const fixtureEmails = new Set<string>();
const fixtureEvents = new Set<string>();
test.afterAll(async () => {
  if (!enabled || fixtureEmails.size === 0) return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (new URL(url).hostname !== "127.0.0.1")
    throw new Error("Refusing cleanup outside the local integration project");
  const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data: users, error } = await db.auth.admin.listUsers({
    perPage: 1000,
  });
  if (error)
    throw new Error("Could not enumerate local test identities for cleanup");
  const ids = users.users
    .filter((u) => fixtureEmails.has(u.email ?? ""))
    .map((u) => u.id);
  if (!ids.length) return;
  const { data: profiles } = await db
    .from("profiles")
    .select("id,facility_id")
    .in("id", ids);
  const facilities = (profiles ?? []).map((p) => p.facility_id).filter(Boolean);
  const { data: shifts } = facilities.length
    ? await db.from("shifts").select("id").in("facility_id", facilities)
    : { data: [] };
  const shiftIds = (shifts ?? []).map((s) => s.id);
  async function remove(table: string, column: string, values: string[]) {
    if (values.length) {
      const { error } = await db.from(table).delete().in(column, values);
      if (error) throw new Error("Local test cleanup failed for " + table);
    }
  }
  await remove("attendance_codes", "shift_id", shiftIds);
  await remove("timesheets", "shift_id", shiftIds);
  await remove("applications", "shift_id", shiftIds);
  await remove("applications", "nurse_id", ids);
  await remove("notifications", "user_id", ids);
  await remove("priority_nurses", "nurse_id", ids);
  await remove("priority_nurses", "facility_id", facilities);
  await remove("shifts", "id", shiftIds);
  await remove("nurse_credentials", "nurse_id", ids);
  await remove("nurse_details", "id", ids);
  await remove("otp_attempts", "user_id", ids);
  await remove("audit_events", "actor_id", ids);
  for (const id of ids) {
    const { error } = await db.auth.admin.deleteUser(id);
    if (error) throw new Error("Local test identity cleanup failed");
  }
  await remove("facilities", "id", facilities);
  await remove("stripe_events", "id", [...fixtureEvents]);
});
test("real Supabase registration, facility shift lifecycle, nurse booking, OTP and administration", async ({
  browser,
  request,
}) => {
  test.skip(!enabled, "Requires the actual isolated local Supabase stack.");
  test.setTimeout(180000);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (new URL(url).hostname !== "127.0.0.1")
    throw new Error(
      "This integration test only runs against the isolated local Supabase project.",
    );
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const suffix = Date.now();
  const ownerEmail = `facility-${suffix}@staftify.test`;
  const nurseEmail = `nurse-${suffix}@staftify.test`;
  const adminEmail = `admin-${suffix}@staftify.test`;
  fixtureEmails.add(ownerEmail);
  fixtureEmails.add(nurseEmail);
  fixtureEmails.add(adminEmail);
  fixtureEvents.add("test-" + suffix);
  const password = "Local-test-account-" + suffix + "!";
  const facilityContext = await browser.newContext();
  const nurseContext = await browser.newContext();
  const adminContext = await browser.newContext();
  const facility = await facilityContext.newPage();
  const nurse = await nurseContext.newPage();
  const operator = await adminContext.newPage();
  async function confirmEmail(page: Page, email: string) {
    let link = "";
    for (let attempt = 0; attempt < 40; attempt++) {
      const r = await request.get("http://127.0.0.1:54324/api/v1/messages");
      if (r.ok()) {
        const inbox = await r.json();
        const mail = inbox.messages?.find((m: { To: { Address: string }[] }) =>
          m.To.some((t) => t.Address === email),
        );
        if (mail) {
          const detail = await request.get(
            "http://127.0.0.1:54324/api/v1/message/" + mail.ID,
          );
          const body = await detail.json();
          link =
            String(body.HTML)
              .match(/href="([^"]*\/auth\/v1\/verify[^"]*)"/)?.[1]
              ?.replaceAll("&amp;", "&") ?? "";
          if (link) break;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!link) throw new Error("Local confirmation email was not delivered.");
    try {
      await page.goto(link);
    } catch {
      throw new Error("Local email confirmation redirect failed.");
    }
    await expect(
      page.getByRole("heading", { name: /A few details/ }),
    ).toBeVisible();
  }
  async function register(
    page: Page,
    type: "facility" | "nurse",
    email: string,
    name: string,
  ) {
    await page.goto("/register?type=" + type);
    await page.getByLabel("Your full name").fill(name);
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password").fill(password);
    await page
      .getByRole("button", {
        name:
          type === "facility"
            ? "Create facility account"
            : "Create nurse account",
      })
      .click();
    await expect(
      page.getByText("Check your email to confirm your account, then sign in."),
    ).toBeVisible();
    await confirmEmail(page, email);
    await page.getByLabel("Your full name").fill(name);
  }
  async function nav(page: Page, name: string) {
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("button", { name, exact: true })
      .click();
  }
  const { data: operatorUser, error: operatorError } =
    await admin.auth.admin.createUser({
      email: adminEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Integration Administrator" },
    });
  if (operatorError || !operatorUser.user)
    throw new Error("Could not create isolated test administrator");
  const { error: promoteError } = await admin
    .from("profiles")
    .update({ role: "admin", onboarding_completed: true })
    .eq("id", operatorUser.user.id);
  if (promoteError)
    throw new Error("Could not provision isolated test administrator");
  await register(
    facility,
    "facility",
    ownerEmail,
    "Integration Facility Owner",
  );
  await facility
    .getByLabel("Facility name", { exact: true })
    .fill("Integration Facility " + suffix);
  await facility.getByLabel("Street address").fill("100 Integration Street");
  await facility.getByLabel("City", { exact: true }).fill("Charlotte");
  await facility.getByLabel("State (two letters)").fill("NC");
  await facility.getByRole("button", { name: "Create my workspace" }).click();
  await expect(
    facility.getByRole("heading", { name: "Welcome, Integration" }),
  ).toBeVisible();
  await expect(
    facility.getByRole("heading", { name: "Your next connection starts here" }),
  ).toBeVisible();
  await facility
    .getByRole("button", { name: "Create shift", exact: true })
    .click();
  await facility
    .getByLabel("Shift title")
    .fill("Persistent RN integration shift");
  await facility.getByLabel("Hourly rate (USD)").fill("52");
  await facility
    .getByLabel("Department", { exact: true })
    .fill("Medical Surgical");
  const start = new Date(Date.now() + 20 * 60000);
  const end = new Date(Date.now() + 120 * 60000);
  const local = (d: Date) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  await facility.getByLabel("Start date & time").fill(local(start));
  await facility.getByLabel("End date & time").fill(local(end));
  await facility.getByRole("button", { name: "Save draft shift" }).click();
  await expect(facility.getByRole("status")).toContainText("Draft saved");
  await facility.reload();
  await facility
    .getByRole("button", {
      name: "Persistent RN integration shift",
      exact: true,
    })
    .click();
  await facility
    .getByRole("button", { name: "Edit shift", exact: true })
    .click();
  await facility.getByLabel("Shift title").fill("Updated persistent RN shift");
  await facility.getByRole("button", { name: "Save changes" }).click();
  await facility
    .getByRole("button", { name: "Updated persistent RN shift", exact: true })
    .click();
  await facility
    .getByRole("button", { name: "Publish shift", exact: true })
    .click();
  await expect(facility.getByRole("dialog").getByRole("alert")).toContainText(
    "must be verified",
  );
  await facility.getByRole("button", { name: "Close details" }).click();
  await operator.goto("/login");
  await operator.getByLabel("Email address").fill(adminEmail);
  await operator.getByLabel("Password", { exact: true }).fill(password);
  await operator.getByRole("button", { name: "Sign in", exact: true }).click();
  await nav(operator, "Facilities");
  const facilityCard = operator
    .locator(".facility-card")
    .filter({ hasText: "Integration Facility " + suffix });
  await facilityCard.getByRole("button", { name: "Verify facility" }).click();
  await expect(
    facilityCard.getByText("verified", { exact: true }),
  ).toBeVisible();
  const { data: fac } = await admin
    .from("facilities")
    .select("id")
    .eq("name", "Integration Facility " + suffix)
    .single();
  if (!fac) throw new Error("Facility was not persisted");
  const { error: billingError } = await admin.rpc("sync_subscription", {
    event_id: "test-" + suffix,
    event_created: Math.floor(Date.now() / 1000),
    facility: fac.id,
    customer: "test_customer_" + suffix,
    subscription: "test_subscription_" + suffix,
    state: "active",
  });
  if (billingError)
    throw new Error("Local subscription test prerequisite failed");
  await facility
    .getByRole("button", { name: "Updated persistent RN shift", exact: true })
    .click();
  await facility
    .getByRole("button", { name: "Publish shift", exact: true })
    .click();
  await expect(facility.getByRole("status")).toContainText("Shift published");
  await register(nurse, "nurse", nurseEmail, "Integration Nurse");
  await nurse.getByRole("button", { name: "Create my workspace" }).click();
  await nav(nurse, "Profile");
  await nurse.getByLabel("Years of experience").fill("5");
  await nurse.getByLabel("Clinical specialty").fill("Medical Surgical");
  await nurse.getByLabel("City", { exact: true }).fill("Charlotte");
  await nurse.getByLabel("State (two letters)").fill("NC");
  await nurse
    .getByLabel("License number", { exact: true })
    .fill("RN-INTEGRATION-" + suffix);
  await nurse.getByLabel("License state", { exact: true }).fill("NC");
  await nurse.getByLabel("License expiration").fill("2030-01-01");
  await nurse
    .getByRole("button", { name: "Save professional profile" })
    .click();
  await expect(nurse.getByRole("status")).toContainText("Profile saved");
  await operator.getByRole("button", { name: "Refresh workspace" }).click();
  await nav(operator, "Members");
  const member = operator
    .locator(".member-review")
    .filter({ hasText: "Integration Nurse" });
  await member
    .getByRole("button", { name: "Verify credential", exact: true })
    .click();
  await expect(member.getByText("Verified", { exact: true })).toBeVisible();
  await nurse.getByRole("button", { name: "Refresh workspace" }).click();
  await nav(nurse, "Find shifts");
  await nurse
    .getByRole("button", { name: "Updated persistent RN shift", exact: true })
    .click();
  await nurse
    .getByRole("button", { name: "Apply for shift", exact: true })
    .click();
  await facility.getByRole("button", { name: "Refresh workspace" }).click();
  await nav(facility, "Applications");
  const application = facility
    .locator(".application-card")
    .filter({ hasText: "Integration Nurse" });
  await application.getByRole("button", { name: "Approve & book" }).click();
  await expect(
    application.getByText("accepted", { exact: true }),
  ).toBeVisible();
  await nav(facility, "Timesheets");
  await facility
    .getByRole("button", { name: "Generate clock-in code", exact: true })
    .click();
  const inCode = await facility.locator(".code-card strong").innerText();
  await nurse.getByRole("button", { name: "Refresh workspace" }).click();
  await nav(nurse, "Timesheets");
  await nurse.getByLabel("Verification code").fill(inCode);
  await nurse.getByRole("button", { name: "Clock in", exact: true }).click();
  await expect(
    nurse
      .locator(".timesheet-card")
      .getByText("In progress", { exact: true })
      .first(),
  ).toBeVisible();
  await facility
    .getByRole("button", { name: "Generate clock-out code", exact: true })
    .click();
  const outCode = await facility.locator(".code-card strong").innerText();
  await nurse.getByLabel("Verification code").fill(outCode);
  await nurse.getByRole("button", { name: "Clock out", exact: true }).click();
  await expect(
    nurse
      .locator(".timesheet-card")
      .getByText("Needs approval", { exact: true }),
  ).toBeVisible();
  await facility.getByRole("button", { name: "Refresh workspace" }).click();
  await facility
    .getByRole("button", { name: "Approve timesheet", exact: true })
    .click();
  await expect(
    facility.locator(".timesheet-card").getByText("Approved", { exact: true }),
  ).toBeVisible();
  await facilityContext.close();
  await nurseContext.close();
  await adminContext.close();
});
