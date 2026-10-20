import { test } from "node:test";
import assert from "node:assert/strict";
import { developmentWorkspace } from "../src/lib/development/fixtures";
import { developmentPreviewEnabled } from "../src/lib/development/config";
test("development records follow the real workspace shape and ownership scopes", () => {
  for (const role of ["facility", "nurse", "admin"] as const) {
    const data = developmentWorkspace(role, new Date("2026-10-20T12:00:00Z"));
    assert.equal(data.profile.role, role);
    assert.ok(data.shifts.length > 0);
    assert.ok(
      data.shifts.every(
        (s) =>
          Number.isFinite(Date.parse(s.starts_at)) &&
          Date.parse(s.ends_at) > Date.parse(s.starts_at),
      ),
    );
    if (role === "facility") {
      assert.equal(data.nurse_credentials.length, 0);
      assert.ok(
        data.shifts.every((s) => s.facility_id === data.profile.facility_id),
      );
    }
    if (role === "nurse") {
      assert.ok(
        data.nurse_credentials.every((c) => c.nurse_id === data.profile.id),
      );
      assert.ok(data.applications.every((a) => a.nurse_id === data.profile.id));
      assert.ok(data.shifts.every((s) => s.status !== "draft"));
    }
  }
});
test("preview fixtures are independent across requests and never modify live data", () => {
  const first = developmentWorkspace("facility");
  first.shifts[0].title = "Changed during a test";
  const second = developmentWorkspace("facility");
  assert.notEqual(second.shifts[0].title, first.shifts[0].title);
  assert.ok(second.shifts.every((s) => s.id.startsWith("preview-")));
});
test("development preview requires explicit environment opt-in", () => {
  const previous = process.env.STAFTIFY_ENABLE_PREVIEW;
  try {
    delete process.env.STAFTIFY_ENABLE_PREVIEW;
    assert.equal(developmentPreviewEnabled(), false);
    process.env.STAFTIFY_ENABLE_PREVIEW = "false";
    assert.equal(developmentPreviewEnabled(), false);
    process.env.STAFTIFY_ENABLE_PREVIEW = "true";
    assert.equal(developmentPreviewEnabled(), true);
  } finally {
    if (previous === undefined) delete process.env.STAFTIFY_ENABLE_PREVIEW;
    else process.env.STAFTIFY_ENABLE_PREVIEW = previous;
  }
});
