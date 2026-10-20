import { z } from "zod";
import { shiftSchema, type Role } from "../domain";
import { professionalSchema } from "../validation";
import type { Shift, WorkspaceData } from "../types";
import { developmentWorkspace } from "./fixtures";
export type LocalState = {
  version: 1;
  data: WorkspaceData;
  codes: {
    shift_id: string;
    kind: "in" | "out";
    code: string;
    expires: number;
  }[];
  history: { id: string; actor: string; operation: string; at: string }[];
};
export const actorIds: Record<Role, string> = {
  facility: "preview-owner",
  nurse: "preview-sarah",
  admin: "preview-admin",
};
export function seedLocalState(now = new Date()): LocalState {
  const data = developmentWorkspace("admin", now);
  data.notifications = (["nurse", "facility", "admin"] as const).flatMap(
    (role) =>
      developmentWorkspace(role, now).notifications.map((n) => ({
        ...n,
        id: role + "-" + n.id,
        body: n.body.replace(
          "Live actions require Supabase.",
          "Local test actions are simulated and saved in this browser.",
        ),
      })),
  );
  return { version: 1, data, codes: [], history: [] };
}
export function localView(state: LocalState, role: Role): WorkspaceData {
  const all = state.data;
  const profile = all.profiles.find((p) => p.id === actorIds[role])!;
  const facilities = all.facilities.filter(
    (f) => role !== "facility" || f.id === profile.facility_id,
  );
  const shifts = all.shifts.filter(
    (s) =>
      role === "admin" ||
      (role === "facility"
        ? s.facility_id === profile.facility_id
        : (s.status === "open" &&
            all.facilities.some(
              (f) =>
                f.id === s.facility_id &&
                f.verification_status === "verified" &&
                f.active,
            )) ||
          s.assigned_nurse_id === profile.id ||
          all.applications.some(
            (a) => a.shift_id === s.id && a.nurse_id === profile.id,
          )),
  );
  const shiftIds = new Set(shifts.map((s) => s.id));
  return {
    ...all,
    profile,
    facilities,
    shifts,
    profiles: all.profiles.filter(
      (p) =>
        role === "admin" ||
        p.id === profile.id ||
        (role === "facility" && p.role === "nurse"),
    ),
    applications: all.applications.filter(
      (a) =>
        role === "admin" ||
        (role === "facility"
          ? shiftIds.has(a.shift_id)
          : a.nurse_id === profile.id),
    ),
    timesheets: all.timesheets.filter(
      (t) =>
        role === "admin" ||
        (role === "facility"
          ? shiftIds.has(t.shift_id)
          : t.nurse_id === profile.id),
    ),
    notifications: all.notifications.filter((n) => n.user_id === profile.id),
    priority_nurses: all.priority_nurses.filter(
      (p) =>
        role === "admin" ||
        (role === "facility"
          ? p.facility_id === profile.facility_id
          : p.nurse_id === profile.id),
    ),
    nurse_details: all.nurse_details.filter(
      (n) => role !== "nurse" || n.id === profile.id,
    ),
    nurse_credentials: all.nurse_credentials.filter(
      (c) =>
        role === "admin" || (role === "nurse" && c.nurse_id === profile.id),
    ),
  };
}
const text = (x: unknown) => (typeof x === "string" ? x : "");
const fail = (message: string): never => {
  throw new Error(message);
};
export function simulate(
  state: LocalState,
  role: Role,
  url: string,
  method: string,
  body: Record<string, unknown>,
  now = new Date(),
  id = () => crypto.randomUUID(),
  otp = () => String(100000 + Math.floor(Math.random() * 900000)),
): {
  state: LocalState;
  response: {
    result?: { code?: string; expires_in_seconds?: number };
    ok?: boolean;
  };
} {
  const next = structuredClone(state),
    d = next.data,
    p = d.profiles.find((p) => p.id === actorIds[role])!,
    stamp = now.toISOString();
  if (p.suspended)
    fail(
      "This local test account is suspended. Switch to Administrator to restore it.",
    );
  const requireRole = (r: Role) => {
    if (role !== r) fail(`This simulated operation requires the ${r} portal.`);
  };
  const shift = (shiftId: unknown) =>
    d.shifts.find((s) => s.id === text(shiftId)) ??
    fail("Shift not found. Refresh your workspace.");
  const updated = (s: Shift) => {
    s.updated_at = new Date(
      Math.max(now.getTime(), Date.parse(s.updated_at) + 1),
    ).toISOString();
  };
  const owned = (s: Shift) => {
    requireRole("facility");
    if (s.facility_id !== p.facility_id)
      fail("This shift belongs to another facility.");
  };
  const facilityReady = (s: Shift) => {
    const f = d.facilities.find((f) => f.id === s.facility_id);
    if (
      !f?.active ||
      f.verification_status !== "verified" ||
      !["active", "trialing"].includes(f.subscription_status)
    )
      fail(
        "Verify the facility and activate its simulated subscription first.",
      );
  };
  const eligible = (nurseId: string, s: Shift) => {
    const n = d.profiles.find((p) => p.id === nurseId),
      c = d.nurse_credentials.find((c) => c.nurse_id === nurseId);
    if (
      !n ||
      n.suspended ||
      !n.verified ||
      n.credential !== s.specialty ||
      !c ||
      c.license_expires < stamp.slice(0, 10)
    )
      fail(
        "A verified, active nurse with matching current credentials is required.",
      );
  };
  const notify = (userId: string, title: string, message: string) =>
    d.notifications.unshift({
      id: id(),
      user_id: userId,
      title: "[Simulated] " + title,
      body: message,
      read_at: null,
      created_at: stamp,
    });
  const notifyFacility = (s: Shift, title: string, message: string) =>
    d.profiles
      .filter((p) => p.facility_id === s.facility_id)
      .forEach((p) => notify(p.id, title, message));
  let response: {
    result?: { code?: string; expires_in_seconds?: number };
    ok?: boolean;
  } = { ok: true };
  if (url === "/api/shifts" && method === "POST") {
    requireRole("facility");
    const input = shiftSchema.parse(body);
    const department = z.string().trim().min(2).max(120).parse(body.department);
    d.shifts.unshift({
      ...input,
      department,
      id: id(),
      facility_id: p.facility_id!,
      status: "draft",
      assigned_nurse_id: null,
      updated_at: stamp,
    });
  } else if (url.startsWith("/api/shifts/") && method === "PATCH") {
    const s = shift(url.split("/").pop());
    owned(s);
    const details = (body.details ?? {}) as Record<string, unknown>;
    if (details.updated_at !== s.updated_at)
      fail("This shift changed in another view. Refresh before trying again.");
    if (body.operation === "edit") {
      if (!["draft", "open"].includes(s.status))
        fail("Only draft or open shifts can be edited.");
      if (
        d.applications.some(
          (a) => a.shift_id === s.id && a.status === "pending",
        )
      )
        fail(
          "Withdraw or decline pending applications before changing shift terms.",
        );
      Object.assign(s, shiftSchema.parse(details), {
        department: z.string().trim().min(2).max(120).parse(details.department),
      });
    } else if (body.operation === "publish") {
      if (s.status !== "draft") fail("Only a draft can be published.");
      facilityReady(s);
      if (Date.parse(s.starts_at) <= now.getTime())
        fail("Choose a future start time before publishing.");
      s.status = "open";
    } else if (body.operation === "cancel") {
      if (!["draft", "open", "filled"].includes(s.status))
        fail("This shift cannot be cancelled.");
      if (d.timesheets.some((t) => t.shift_id === s.id))
        fail("Shifts with attendance cannot be cancelled.");
      s.status = "cancelled";
      for (const a of d.applications.filter(
        (a) =>
          a.shift_id === s.id && ["pending", "accepted"].includes(a.status),
      )) {
        a.status = "declined";
        notify(a.nurse_id, "Shift cancelled", s.title);
      }
    } else fail("Unknown shift operation.");
    updated(s);
  } else if (url === "/api/profile" && method === "PUT") {
    requireRole("nurse");
    const input = professionalSchema.parse(body);
    const previous = d.nurse_credentials.find((c) => c.nurse_id === p.id);
    if (
      p.credential !== input.credential ||
      previous?.license_number !== input.license_number ||
      previous?.license_state !== input.license_state ||
      previous?.license_expires !== input.license_expires
    )
      p.verified = false;
    p.full_name = input.full_name;
    p.credential = input.credential;
    d.nurse_details = d.nurse_details.filter((n) => n.id !== p.id);
    d.nurse_details.push({
      id: p.id,
      specialty: input.specialty,
      city: input.city,
      state: input.state,
      experience_years: input.experience_years,
      bio: input.bio,
    });
    d.nurse_credentials = d.nurse_credentials.filter(
      (c) => c.nurse_id !== p.id,
    );
    d.nurse_credentials.push({
      nurse_id: p.id,
      license_number: input.license_number,
      license_state: input.license_state,
      license_expires: input.license_expires,
    });
  } else if (url === "/development/subscription") {
    requireRole("facility");
    const status = z.enum(["active", "inactive"]).parse(body.status);
    d.facilities.find((f) => f.id === p.facility_id)!.subscription_status =
      status;
  } else if (url === "/api/actions") {
    const kind = text(body.action);
    if (kind === "apply") {
      requireRole("nurse");
      const s = shift(body.shift_id);
      if (s.status !== "open" || Date.parse(s.starts_at) <= now.getTime())
        fail("This shift is no longer open for applications.");
      facilityReady(s);
      eligible(p.id, s);
      const previous = d.applications.find(
        (a) => a.shift_id === s.id && a.nurse_id === p.id,
      );
      if (previous && ["pending", "accepted"].includes(previous.status))
        fail("You already have an application for this shift.");
      if (previous) {
        previous.status = "pending";
        previous.created_at = stamp;
      } else
        d.applications.unshift({
          id: id(),
          shift_id: s.id,
          nurse_id: p.id,
          status: "pending",
          created_at: stamp,
        });
      notifyFacility(
        s,
        "New nurse application",
        `${p.full_name} requested ${s.title}.`,
      );
    } else if (["accept", "decline", "withdraw"].includes(kind)) {
      const a =
        d.applications.find((a) => a.id === body.application_id) ??
        fail("Application not found.");
      const s = shift(a.shift_id);
      if (a.status !== "pending")
        fail("This application is no longer pending.");
      if (kind === "withdraw") {
        requireRole("nurse");
        if (a.nurse_id !== p.id) fail("This is another nurse’s application.");
        a.status = "withdrawn";
        notifyFacility(s, "Application withdrawn", s.title);
      } else {
        owned(s);
        if (kind === "decline") {
          a.status = "declined";
          notify(
            a.nurse_id,
            "Application update",
            `${s.title}: application declined.`,
          );
        } else {
          if (s.status !== "open")
            fail("This shift has already been booked or cancelled.");
          facilityReady(s);
          eligible(a.nurse_id, s);
          if (
            d.shifts.some(
              (other) =>
                other.id !== s.id &&
                other.status === "filled" &&
                other.assigned_nurse_id === a.nurse_id &&
                Date.parse(other.starts_at) < Date.parse(s.ends_at) &&
                Date.parse(other.ends_at) > Date.parse(s.starts_at),
            )
          )
            fail("This nurse already has an overlapping booking.");
          a.status = "accepted";
          s.status = "filled";
          s.assigned_nurse_id = a.nurse_id;
          updated(s);
          for (const other of d.applications.filter(
            (other) =>
              other.shift_id === s.id &&
              other.id !== a.id &&
              other.status === "pending",
          )) {
            other.status = "declined";
            notify(other.nurse_id, "Shift filled", s.title);
          }
          notify(
            a.nurse_id,
            "Booking confirmed",
            `You are booked for ${s.title}. See your schedule.`,
          );
        }
      }
    } else if (kind === "blast") {
      const s = shift(body.shift_id);
      owned(s);
      if (s.status !== "open") fail("Only open shifts can be blasted.");
      facilityReady(s);
      s.urgent = true;
      updated(s);
      for (const n of d.profiles.filter(
        (n) =>
          n.role === "nurse" &&
          n.verified &&
          !n.suspended &&
          n.credential === s.specialty,
      ))
        notify(
          n.id,
          "Urgent shift available",
          `${s.title} — ${s.hourly_rate}/hr. ${d.priority_nurses.some((pr) => pr.nurse_id === n.id && pr.facility_id === s.facility_id) ? "You are on this facility’s priority list." : ""}`,
        );
    } else if (kind === "priority") {
      requireRole("facility");
      const nurseId = text(body.nurse_id);
      const nurse = d.profiles.find(
        (n) => n.id === nurseId && n.role === "nurse",
      );
      if (!nurse?.verified || nurse.suspended)
        fail("Select an active verified nurse.");
      d.priority_nurses = d.priority_nurses.filter(
        (n) => !(n.facility_id === p.facility_id && n.nurse_id === nurseId),
      );
      if (z.boolean().parse(body.enabled))
        d.priority_nurses.push({
          facility_id: p.facility_id!,
          nurse_id: nurseId,
        });
    } else if (kind === "issue_otp" || kind === "clock") {
      const s = shift(body.shift_id),
        direction = z.enum(["in", "out"]).parse(body.kind);
      if (s.status !== "filled" || !s.assigned_nurse_id)
        fail("Attendance requires a confirmed booking.");
      const t = d.timesheets.find((t) => t.shift_id === s.id);
      if (direction === "in" && t) fail("This nurse has already clocked in.");
      if (direction === "out" && (!t || t.clock_out))
        fail("Clock in before clocking out, and only once.");
      if (kind === "issue_otp") {
        owned(s);
        next.codes = next.codes.filter(
          (c) => !(c.shift_id === s.id && c.kind === direction),
        );
        const code = otp();
        next.codes.push({
          shift_id: s.id,
          kind: direction,
          code,
          expires: now.getTime() + 600000,
        });
        response = { result: { code, expires_in_seconds: 600 } };
      } else {
        requireRole("nurse");
        if (s.assigned_nurse_id !== p.id)
          fail("You are not assigned to this shift.");
        const token = next.codes.find(
          (c) => c.shift_id === s.id && c.kind === direction,
        );
        if (
          !token ||
          token.expires <= now.getTime() ||
          token.code !== text(body.code)
        )
          fail(
            "Invalid or expired simulated code. Ask the facility to generate another.",
          );
        next.codes = next.codes.filter((c) => c !== token);
        if (direction === "in")
          d.timesheets.unshift({
            id: id(),
            shift_id: s.id,
            nurse_id: p.id,
            clock_in: stamp,
            clock_out: null,
            approved_at: null,
          });
        else {
          t!.clock_out = new Date(
            Math.max(now.getTime(), Date.parse(t!.clock_in) + 60000),
          ).toISOString();
          s.status = "completed";
          updated(s);
          notifyFacility(s, "Timesheet ready for approval", s.title);
        }
      }
    } else if (kind === "approve_timesheet") {
      const t =
        d.timesheets.find((t) => t.id === body.timesheet_id) ??
        fail("Timesheet not found.");
      owned(shift(t.shift_id));
      if (!t.clock_out || t.approved_at)
        fail("Only completed, unapproved hours can be approved.");
      t.approved_at = stamp;
      notify(t.nurse_id, "Timesheet approved", shift(t.shift_id).title);
    } else if (kind === "read_notification") {
      const n =
        d.notifications.find(
          (n) => n.id === body.notification_id && n.user_id === p.id,
        ) ?? fail("Notification not found.");
      n.read_at = stamp;
    } else if (kind === "verify_facility") {
      requireRole("admin");
      const f =
        d.facilities.find((f) => f.id === body.facility_id) ??
        fail("Facility not found.");
      f.verification_status = z
        .enum(["pending", "verified", "rejected"])
        .parse(body.status);
    } else if (kind === "verify_nurse") {
      requireRole("admin");
      const n =
        d.profiles.find((n) => n.id === body.user_id && n.role === "nurse") ??
        fail("Nurse not found.");
      const c = d.nurse_credentials.find((c) => c.nurse_id === n.id);
      if (!c || c.license_expires < stamp.slice(0, 10) || n.suspended)
        fail("A current license and active nurse account are required.");
      n.verified = z.boolean().parse(body.verified);
      n.credential = z.enum(["RN", "LPN", "CNA"]).parse(body.credential);
    } else if (kind === "suspend_user") {
      requireRole("admin");
      const n =
        d.profiles.find((n) => n.id === body.user_id && n.role !== "admin") ??
        fail("Only non-administrator test accounts can be suspended.");
      n.suspended = z.boolean().parse(body.suspended);
    } else fail("This operation is not available in the local test workspace.");
  } else fail("This operation is not available in the local test workspace.");
  const labels: Record<string, string> = {
    apply: "Shift requested",
    accept: "Nurse booked",
    decline: "Application declined",
    withdraw: "Request withdrawn",
    blast: "Urgent staffing blast sent",
    priority: "Priority list updated",
    issue_otp: "Attendance code generated",
    clock: "Attendance recorded",
    approve_timesheet: "Timesheet approved",
    read_notification: "Notification marked read",
    verify_facility: "Facility verification updated",
    verify_nurse: "Nurse verification updated",
    suspend_user: "Account access updated",
    edit: "Shift edited",
    publish: "Shift published",
    cancel: "Shift cancelled",
  };
  const operation = text(body.action || body.operation);
  next.history.unshift({
    id: id(),
    actor: p.full_name,
    operation:
      labels[operation] ??
      (url === "/api/shifts"
        ? "Draft shift created"
        : url === "/api/profile"
          ? "Professional profile saved"
          : url === "/development/subscription"
            ? "Test subscription updated"
            : "Local test operation"),
    at: stamp,
  });
  next.history = next.history.slice(0, 100);
  return { state: next, response };
}
