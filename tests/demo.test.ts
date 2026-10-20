import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createDemoState,
  transition,
  readDemoState,
  type DemoState,
  type DemoCommand,
} from "../src/lib/demo/store";
import type { Role } from "../src/lib/domain";
function setup() {
  let state = createDemoState();
  return {
    get state() {
      return state;
    },
    run(role: Role, command: DemoCommand, now = Date.now()) {
      const result = transition(state, role, command, now);
      state = result.state;
      return result;
    },
  };
}
test("demo application travels from nurse to facility acceptance and schedule", () => {
  const d = setup();
  d.run("nurse", { type: "apply", shiftId: "s1" });
  const a = d.state.applications.find(
    (a) => a.shiftId === "s1" && a.nurseId === "n1",
  )!;
  assert.equal(a.status, "pending");
  d.run("facility", { type: "accept", applicationId: a.id });
  assert.equal(d.state.shifts.find((s) => s.id === "s1")?.nurseId, "n1");
  assert.equal(d.state.shifts.find((s) => s.id === "s1")?.status, "filled");
  assert.equal(
    d.state.applications.find((a) => a.id === "a1")?.status,
    "declined",
  );
  assert.ok(d.state.notifications.some((n) => n.title === "Shift confirmed"));
});
test("rejects duplicate, mismatched credential, wrong role, and overlapping applications", () => {
  const d = setup();
  assert.throws(
    () => d.run("facility", { type: "apply", shiftId: "s1" }),
    /nurse portal/,
  );
  assert.throws(
    () => d.run("nurse", { type: "apply", shiftId: "s2" }),
    /LPN credential/,
  );
  d.run("nurse", { type: "apply", shiftId: "s1" });
  assert.throws(
    () => d.run("nurse", { type: "apply", shiftId: "s1" }),
    /already applied/,
  );
  const a = d.state.applications.find(
    (a) => a.shiftId === "s1" && a.nurseId === "n1",
  )!;
  d.run("facility", { type: "accept", applicationId: a.id });
  const original = d.state.shifts.find((s) => s.id === "s1")!;
  d.run("facility", {
    type: "post",
    shift: {
      ...original,
      title: "Overlapping RN opening",
      starts_at: original.starts_at,
      ends_at: original.ends_at,
    },
  });
  assert.throws(
    () => d.run("nurse", { type: "apply", shiftId: d.state.shifts[0].id }),
    /overlaps/,
  );
});
test("withdraw and decline retain clear application history", () => {
  const d = setup();
  d.run("nurse", { type: "apply", shiftId: "s1" });
  const a = d.state.applications.find((a) => a.nurseId === "n1")!;
  d.run("nurse", { type: "withdraw", applicationId: a.id });
  assert.equal(
    d.state.applications.find((x) => x.id === a.id)?.status,
    "withdrawn",
  );
  d.run("nurse", { type: "apply", shiftId: "s1" });
  const next = d.state.applications.find(
    (a) => a.nurseId === "n1" && a.status === "pending",
  )!;
  d.run("facility", { type: "decline", applicationId: next.id });
  assert.equal(
    d.state.applications.find((x) => x.id === next.id)?.status,
    "declined",
  );
});
test("attendance codes are single use, expire, and create approvable timesheets", () => {
  const d = setup();
  const now = Date.now();
  d.run("facility", { type: "issue", shiftId: "s6", kind: "in" }, now);
  const code = d.state.codes[0].code;
  const expired = transition(
    d.state,
    "nurse",
    { type: "clock", shiftId: "s6", kind: "in", code },
    now + 600001,
  );
  assert.match(expired.message, /expired/);
  assert.equal(expired.state.attempts.count, 1);
  d.run(
    "nurse",
    { type: "clock", shiftId: "s6", kind: "in", code },
    now + 1000,
  );
  const replay = d.run(
    "nurse",
    { type: "clock", shiftId: "s6", kind: "in", code },
    now + 2000,
  );
  assert.match(replay.message, /expired/);
  d.run("facility", { type: "issue", shiftId: "s6", kind: "out" }, now + 3000);
  d.run(
    "nurse",
    {
      type: "clock",
      shiftId: "s6",
      kind: "out",
      code: d.state.codes.find((c) => c.kind === "out")!.code,
    },
    now + 360000,
  );
  const t = d.state.timesheets.find((t) => t.shiftId === "s6")!;
  assert.ok(t.clockOut);
  assert.equal(d.state.shifts.find((s) => s.id === "s6")?.status, "completed");
  d.run("facility", { type: "approve", timesheetId: t.id });
  assert.equal(d.state.timesheets.find((x) => x.id === t.id)?.approved, true);
});
test("bad demo attendance attempts persist and are capped", () => {
  const d = setup();
  for (let i = 0; i < 5; i++)
    d.run("nurse", {
      type: "clock",
      shiftId: "s6",
      kind: "in",
      code: "000000",
    });
  assert.equal(d.state.attempts.count, 5);
  assert.throws(
    () =>
      d.run("nurse", {
        type: "clock",
        shiftId: "s6",
        kind: "in",
        code: "000000",
      }),
    /Too many/,
  );
});
test("admin actions, priority, notifications, settings and subscription update local state", () => {
  const d = setup();
  d.run("admin", { type: "verify", nurseId: "n5" });
  assert.equal(d.state.nurses.find((n) => n.id === "n5")?.verified, true);
  d.run("admin", {
    type: "add_nurse",
    name: "Maria Santos",
    credential: "RN",
    specialty: "Pediatrics",
  });
  assert.equal(d.state.nurses.at(-1)?.verified, false);
  d.run("admin", {
    type: "add_facility",
    name: "Pineview Care",
    city: "Durham, NC",
  });
  assert.equal(d.state.facilities.length, 3);
  d.run("facility", { type: "priority", nurseId: "n2" });
  assert.ok(d.state.priority.includes("n2"));
  d.run("facility", { type: "blast", shiftId: "s1" });
  assert.ok(
    d.state.notifications.some(
      (n) => n.role === "nurse" && n.title === "Urgent staffing request",
    ),
  );
  d.run("nurse", { type: "read" });
  assert.ok(
    d.state.notifications
      .filter((n) => n.role === "nurse")
      .every((n) => n.read),
  );
  d.run("facility", { type: "subscription", active: false });
  assert.equal(d.state.facilities[0].subscription, "inactive");
  d.run("facility", {
    type: "settings",
    settings: {
      displayName: "Taylor Morgan",
      emailNotifications: false,
      weeklyDigest: false,
    },
  });
  assert.equal(d.state.settings.displayName, "Taylor Morgan");
});
test("cancellation closes pending applications and paused facilities block posting", () => {
  const d = setup();
  d.run("facility", { type: "cancel", shiftId: "s1" });
  assert.equal(d.state.shifts.find((s) => s.id === "s1")?.status, "cancelled");
  assert.equal(
    d.state.applications.find((a) => a.id === "a1")?.status,
    "declined",
  );
  d.run("admin", { type: "facility_status", facilityId: "f1" });
  assert.throws(
    () =>
      d.run("facility", {
        type: "post",
        shift: { ...d.state.shifts[0], title: "New shift" },
      }),
    /paused/,
  );
});
test("saved demo roundtrips and corrupt data recovers to seeded state", () => {
  const s = createDemoState();
  assert.deepEqual(readDemoState(JSON.stringify(s)), s);
  assert.equal(readDemoState("{bad").version, 2);
  assert.equal(
    readDemoState(JSON.stringify({ version: 2, shifts: [] })).nurses.length,
    5,
  );
  assert.equal(readDemoState(null).shifts.length, 8);
});
