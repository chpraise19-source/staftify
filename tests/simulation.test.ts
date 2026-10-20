import test from "node:test";
import assert from "node:assert/strict";
import {
  seedLocalState,
  simulate,
  localView,
  type LocalState,
} from "../src/lib/development/simulation";
import type { Role } from "../src/lib/domain";
function workspace() {
  let state = seedLocalState();
  let sequence = 0;
  return {
    get state() {
      return state;
    },
    run(role: Role, action: string, payload: Record<string, unknown> = {}) {
      const result = simulate(
        state,
        role,
        "/api/actions",
        "POST",
        { action, ...payload },
        new Date(),
        () => `test-${++sequence}`,
        () => "846215",
      );
      state = result.state;
      return result.response;
    },
    request(
      role: Role,
      url: string,
      method: string,
      body: Record<string, unknown>,
    ) {
      const result = simulate(state, role, url, method, body);
      state = result.state;
      return result.response;
    },
  };
}
test("nurse request becomes facility booking, notification, attendance and approved timesheet", () => {
  const w = workspace();
  w.run("nurse", "apply", { shift_id: "preview-medsurg" });
  const request = w.state.data.applications.find(
    (a) => a.shift_id === "preview-medsurg" && a.nurse_id === "preview-sarah",
  )!;
  assert.equal(request.status, "pending");
  assert.ok(
    localView(w.state, "facility").notifications.some((n) =>
      n.title.includes("New nurse application"),
    ),
  );
  w.run("facility", "accept", { application_id: request.id });
  assert.equal(
    localView(w.state, "nurse").applications.find((a) => a.id === request.id)
      ?.status,
    "accepted",
  );
  assert.equal(
    w.state.data.applications.find((a) => a.id === "preview-app-1")?.status,
    "declined",
  );
  assert.equal(
    localView(w.state, "nurse").shifts.find((s) => s.id === "preview-medsurg")
      ?.assigned_nurse_id,
    "preview-sarah",
  );
  assert.throws(
    () => w.run("facility", "accept", { application_id: request.id }),
    /no longer pending/,
  );
  const code = w.run("facility", "issue_otp", {
    shift_id: "preview-medsurg",
    kind: "in",
  }).result!.code!;
  assert.throws(
    () =>
      w.run("nurse", "clock", {
        shift_id: "preview-medsurg",
        kind: "in",
        code: "000000",
      }),
    /Invalid or expired/,
  );
  w.run("nurse", "clock", { shift_id: "preview-medsurg", kind: "in", code });
  assert.equal(w.state.codes.length, 0);
  assert.throws(
    () =>
      w.run("nurse", "clock", {
        shift_id: "preview-medsurg",
        kind: "in",
        code,
      }),
    /already clocked in/,
  );
  w.run("facility", "issue_otp", { shift_id: "preview-medsurg", kind: "out" });
  w.run("nurse", "clock", { shift_id: "preview-medsurg", kind: "out", code });
  const timesheet = w.state.data.timesheets.find(
    (t) => t.shift_id === "preview-medsurg",
  )!;
  assert.ok(timesheet.clock_out);
  assert.ok(
    Date.parse(timesheet.clock_out) - Date.parse(timesheet.clock_in) >= 60000,
  );
  w.run("facility", "approve_timesheet", { timesheet_id: timesheet.id });
  assert.ok(
    w.state.data.timesheets.find((t) => t.id === timesheet.id)?.approved_at,
  );
  assert.ok(w.state.history.length >= 7);
});
test("local shifts use validation, ownership, subscription gates and atomic draft lifecycle", () => {
  const w = workspace();
  const now = Date.now();
  const input = {
    title: "Local test shift",
    specialty: "RN",
    department: "Medical",
    hourly_rate: 58,
    urgent: false,
    notes: "Fictional staffing only",
    starts_at: new Date(now + 86400000 * 8).toISOString(),
    ends_at: new Date(now + 86400000 * 8 + 3600000 * 8).toISOString(),
  };
  w.request("facility", "/api/shifts", "POST", input);
  const shift = w.state.data.shifts[0];
  assert.equal(shift.status, "draft");
  assert.equal(
    localView(w.state, "nurse").shifts.some((s) => s.id === shift.id),
    false,
  );
  w.request("facility", "/api/shifts/" + shift.id, "PATCH", {
    operation: "edit",
    details: {
      ...input,
      title: "Edited test shift",
      updated_at: shift.updated_at,
    },
  });
  const edited = w.state.data.shifts[0];
  assert.equal(edited.title, "Edited test shift");
  w.request("facility", "/development/subscription", "POST", {
    status: "inactive",
  });
  assert.throws(
    () =>
      w.request("facility", "/api/shifts/" + shift.id, "PATCH", {
        operation: "publish",
        details: { updated_at: edited.updated_at },
      }),
    /subscription/,
  );
  w.request("facility", "/development/subscription", "POST", {
    status: "active",
  });
  w.request("facility", "/api/shifts/" + shift.id, "PATCH", {
    operation: "publish",
    details: { updated_at: edited.updated_at },
  });
  assert.equal(
    localView(w.state, "nurse").shifts.find((s) => s.id === shift.id)?.status,
    "open",
  );
  assert.throws(
    () =>
      w.request("nurse", "/api/shifts/" + shift.id, "PATCH", {
        operation: "cancel",
        details: { updated_at: w.state.data.shifts[0].updated_at },
      }),
    /facility portal/,
  );
  assert.throws(
    () =>
      w.request("facility", "/api/shifts/preview-emergency", "PATCH", {
        operation: "cancel",
        details: { updated_at: "" },
      }),
    /another facility/,
  );
  w.request("facility", "/api/shifts/" + shift.id, "PATCH", {
    operation: "cancel",
    details: { updated_at: w.state.data.shifts[0].updated_at },
  });
  assert.equal(w.state.data.shifts[0].status, "cancelled");
});
test("verification and suspension changes are shared, roles and private records remain scoped", () => {
  const w = workspace();
  w.run("admin", "suspend_user", { user_id: "preview-sarah", suspended: true });
  assert.throws(
    () => w.run("nurse", "apply", { shift_id: "preview-medsurg" }),
    /suspended/,
  );
  w.run("admin", "suspend_user", {
    user_id: "preview-sarah",
    suspended: false,
  });
  w.run("admin", "verify_nurse", {
    user_id: "preview-sarah",
    credential: "RN",
    verified: false,
  });
  assert.throws(
    () => w.run("nurse", "apply", { shift_id: "preview-medsurg" }),
    /verified/,
  );
  w.run("admin", "verify_nurse", {
    user_id: "preview-sarah",
    credential: "RN",
    verified: true,
  });
  w.run("nurse", "apply", { shift_id: "preview-medsurg" });
  assert.throws(
    () =>
      w.run("nurse", "verify_facility", {
        facility_id: "preview-oakwood",
        status: "verified",
      }),
    /admin portal/,
  );
  assert.equal(localView(w.state, "facility").nurse_credentials.length, 0);
  assert.deepEqual(
    localView(w.state, "nurse").profiles.map((p) => p.id),
    ["preview-sarah"],
  );
  assert.ok(
    localView(w.state, "nurse").notifications.every(
      (n) => n.user_id === "preview-sarah",
    ),
  );
});
test("failed or duplicate applications leave original state untouched and withdrawn requests can be resubmitted", () => {
  const original = seedLocalState();
  const copy = structuredClone(original);
  assert.throws(
    () =>
      simulate(original, "nurse", "/api/actions", "POST", {
        action: "apply",
        shift_id: "preview-lpn",
      }),
    /credentials/,
  );
  assert.deepEqual(original, copy);
  const w = workspace();
  w.run("nurse", "withdraw", { application_id: "preview-app-3" });
  w.run("nurse", "apply", { shift_id: "preview-icu" });
  assert.equal(
    w.state.data.applications.filter(
      (a) => a.shift_id === "preview-icu" && a.nurse_id === "preview-sarah",
    ).length,
    1,
  );
  assert.throws(
    () => w.run("nurse", "apply", { shift_id: "preview-icu" }),
    /already have/,
  );
});
test("expired OTP cannot record attendance and concurrent conflicting bookings are rejected", () => {
  const w = workspace();
  w.run("facility", "issue_otp", {
    shift_id: "preview-cardiology",
    kind: "in",
  });
  assert.throws(
    () =>
      simulate(
        w.state,
        "nurse",
        "/api/actions",
        "POST",
        {
          action: "clock",
          shift_id: "preview-cardiology",
          kind: "in",
          code: "846215",
        },
        new Date(Date.now() + 601000),
      ),
    /expired/,
  );
  const state = structuredClone(w.state);
  const med = state.data.shifts.find((s) => s.id === "preview-medsurg")!;
  state.data.shifts.push({
    ...med,
    id: "overlapping-test",
    status: "filled",
    assigned_nurse_id: "preview-sarah",
  });
  const applied = simulate(state, "nurse", "/api/actions", "POST", {
    action: "apply",
    shift_id: med.id,
  }).state;
  const app = applied.data.applications.find(
    (a) => a.shift_id === med.id && a.nurse_id === "preview-sarah",
  )!;
  assert.throws(
    () =>
      simulate(applied, "facility", "/api/actions", "POST", {
        action: "accept",
        application_id: app.id,
      }),
    /overlapping/,
  );
});
