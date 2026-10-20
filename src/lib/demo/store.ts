import { shiftSchema } from "../domain";
import type { Role } from "../domain";
export type Credential = "RN" | "LPN" | "CNA";
export type DemoShift = {
  id: string;
  title: string;
  specialty: Credential;
  department: string;
  facilityId: string;
  starts_at: string;
  ends_at: string;
  hourly_rate: number;
  urgent: boolean;
  notes: string;
  status: "open" | "filled" | "completed" | "cancelled";
  nurseId?: string;
};
export type Nurse = {
  id: string;
  name: string;
  credential: Credential;
  specialty: string;
  verified: boolean;
  experience: number;
  initials: string;
};
export type Facility = {
  id: string;
  name: string;
  city: string;
  active: boolean;
  subscription: "active" | "inactive";
};
export type Application = {
  id: string;
  shiftId: string;
  nurseId: string;
  status: "pending" | "accepted" | "declined" | "withdrawn";
  createdAt: string;
};
export type Timesheet = {
  id: string;
  shiftId: string;
  nurseId: string;
  clockIn: string;
  clockOut?: string;
  approved: boolean;
};
export type Notification = {
  id: string;
  role: Role;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};
export type AttendanceCode = {
  shiftId: string;
  kind: "in" | "out";
  code: string;
  expiresAt: number;
  used: boolean;
};
export type DemoState = {
  version: 2;
  shifts: DemoShift[];
  nurses: Nurse[];
  facilities: Facility[];
  applications: Application[];
  timesheets: Timesheet[];
  notifications: Notification[];
  priority: string[];
  codes: AttendanceCode[];
  attempts: { count: number; since: number };
  settings: {
    displayName: string;
    emailNotifications: boolean;
    weeklyDigest: boolean;
  };
  activity: string[];
};
export const STORAGE_KEY = "staftify-demo-v2";
export const FACILITY_ID = "f1";
export const NURSE_ID = "n1";
// getRandomValues also works in local-file / plain-HTTP previews, where randomUUID may be unavailable.
const id = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
export function createDemoState(now = new Date()): DemoState {
  const date = (day: number, hour: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + day);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  const shifts: DemoShift[] = [
    {
      id: "s1",
      title: "Registered Nurse · Med/Surg",
      specialty: "RN",
      department: "Medical / Surgical",
      facilityId: "f1",
      starts_at: date(1, 7),
      ends_at: date(1, 19),
      hourly_rate: 52,
      urgent: true,
      notes:
        "12-bed medical unit. BLS certification required. Arrive 15 minutes before handover.",
      status: "open",
    },
    {
      id: "s2",
      title: "Licensed Practical Nurse",
      specialty: "LPN",
      department: "Long-term care",
      facilityId: "f1",
      starts_at: date(2, 7),
      ends_at: date(2, 15),
      hourly_rate: 38,
      urgent: false,
      notes:
        "Support our resident care team. Medication administration experience preferred.",
      status: "open",
    },
    {
      id: "s3",
      title: "Registered Nurse · ICU",
      specialty: "RN",
      department: "Intensive care",
      facilityId: "f1",
      starts_at: date(3, 19),
      ends_at: date(4, 7),
      hourly_rate: 64,
      urgent: true,
      notes:
        "Overnight critical care coverage. ACLS certification and 2 years of ICU experience.",
      status: "open",
    },
    {
      id: "s4",
      title: "CNA · Rehabilitation",
      specialty: "CNA",
      department: "Rehabilitation",
      facilityId: "f1",
      starts_at: date(2, 15),
      ends_at: date(2, 23),
      hourly_rate: 28,
      urgent: false,
      notes: "Support patients with daily living activities.",
      status: "filled",
      nurseId: "n4",
    },
    {
      id: "s5",
      title: "Registered Nurse · Emergency",
      specialty: "RN",
      department: "Emergency",
      facilityId: "f2",
      starts_at: date(4, 7),
      ends_at: date(4, 19),
      hourly_rate: 58,
      urgent: false,
      notes: "Fast-paced emergency department. Current BLS and ACLS required.",
      status: "open",
    },
    {
      id: "s6",
      title: "Registered Nurse · Cardiology",
      specialty: "RN",
      department: "Cardiology",
      facilityId: "f1",
      starts_at: date(0, 7),
      ends_at: date(0, 19),
      hourly_rate: 55,
      urgent: false,
      notes:
        "Assigned demonstration shift. Demo attendance can be explored at any time.",
      status: "filled",
      nurseId: "n1",
    },
    {
      id: "s7",
      title: "Registered Nurse · Recovery",
      specialty: "RN",
      department: "Post-operative recovery",
      facilityId: "f1",
      starts_at: date(-2, 7),
      ends_at: date(-2, 19),
      hourly_rate: 52,
      urgent: false,
      notes: "Completed sample shift.",
      status: "completed",
      nurseId: "n1",
    },
    {
      id: "s8",
      title: "LPN · Evening care",
      specialty: "LPN",
      department: "Assisted living",
      facilityId: "f2",
      starts_at: date(5, 15),
      ends_at: date(5, 23),
      hourly_rate: 40,
      urgent: false,
      notes: "Evening resident care and handover.",
      status: "open",
    },
  ];
  return {
    version: 2,
    shifts,
    nurses: [
      {
        id: "n1",
        name: "Sarah Mitchell",
        credential: "RN",
        specialty: "Critical Care",
        verified: true,
        experience: 8,
        initials: "SM",
      },
      {
        id: "n2",
        name: "James Wilson",
        credential: "LPN",
        specialty: "Long-term Care",
        verified: true,
        experience: 5,
        initials: "JW",
      },
      {
        id: "n3",
        name: "Emily Chen",
        credential: "RN",
        specialty: "Medical / Surgical",
        verified: true,
        experience: 6,
        initials: "EC",
      },
      {
        id: "n4",
        name: "Amara Johnson",
        credential: "CNA",
        specialty: "Rehabilitation",
        verified: true,
        experience: 4,
        initials: "AJ",
      },
      {
        id: "n5",
        name: "Daniel Brooks",
        credential: "RN",
        specialty: "Emergency Care",
        verified: false,
        experience: 3,
        initials: "DB",
      },
    ],
    facilities: [
      {
        id: "f1",
        name: "Oakwood Medical Center",
        city: "Charlotte, NC",
        active: true,
        subscription: "active",
      },
      {
        id: "f2",
        name: "Riverside Care Hospital",
        city: "Raleigh, NC",
        active: true,
        subscription: "active",
      },
    ],
    applications: [
      {
        id: "a1",
        shiftId: "s1",
        nurseId: "n3",
        status: "pending",
        createdAt: date(-1, 15),
      },
      {
        id: "a2",
        shiftId: "s2",
        nurseId: "n2",
        status: "pending",
        createdAt: date(-1, 16),
      },
      {
        id: "a3",
        shiftId: "s3",
        nurseId: "n3",
        status: "pending",
        createdAt: date(-1, 17),
      },
    ],
    timesheets: [
      {
        id: "t1",
        shiftId: "s7",
        nurseId: "n1",
        clockIn: date(-2, 7),
        clockOut: date(-2, 19),
        approved: false,
      },
    ],
    notifications: [
      {
        id: "nt1",
        role: "facility",
        title: "Your nurse network is ready",
        body: "Three applications are ready for review. Open Applications to meet your next great match.",
        read: false,
        createdAt: now.toISOString(),
      },
      {
        id: "nt2",
        role: "nurse",
        title: "Welcome back, Sarah",
        body: "Your Cardiology shift is on the schedule. Explore shifts to find your next opportunity.",
        read: false,
        createdAt: now.toISOString(),
      },
      {
        id: "nt3",
        role: "admin",
        title: "Credential review needed",
        body: "Daniel Brooks is awaiting RN verification in Members.",
        read: false,
        createdAt: now.toISOString(),
      },
    ],
    priority: ["n1", "n3"],
    codes: [],
    attempts: { count: 0, since: 0 },
    settings: {
      displayName: "Alex Morgan",
      emailNotifications: true,
      weeklyDigest: true,
    },
    activity: ["Demo workspace created with realistic sample data."],
  };
}
export type DemoCommand =
  | { type: "post"; shift: Omit<DemoShift, "id" | "status" | "facilityId"> }
  | { type: "apply"; shiftId: string }
  | { type: "withdraw"; applicationId: string }
  | { type: "accept" | "decline"; applicationId: string }
  | { type: "cancel" | "blast"; shiftId: string }
  | { type: "priority"; nurseId: string }
  | { type: "issue"; shiftId: string; kind: "in" | "out" }
  | { type: "clock"; shiftId: string; kind: "in" | "out"; code: string }
  | { type: "approve"; timesheetId: string }
  | { type: "read"; notificationId?: string }
  | { type: "verify"; nurseId: string }
  | { type: "facility_status"; facilityId: string }
  | { type: "add_facility"; name: string; city: string }
  | {
      type: "add_nurse";
      name: string;
      credential: Credential;
      specialty: string;
    }
  | { type: "subscription"; active: boolean }
  | { type: "settings"; settings: DemoState["settings"] };
export function transition(
  current: DemoState,
  role: Role,
  command: DemoCommand,
  now = Date.now(),
): { state: DemoState; message: string } {
  const s = structuredClone(current);
  const timestamp = new Date(now).toISOString();
  let message = "Demo updated.";
  const allow = (expected: Role) => {
    if (role !== expected)
      throw new Error("This action belongs to the " + expected + " portal.");
  };
  const shift = (shiftId: string) => {
    const x = s.shifts.find((x) => x.id === shiftId);
    if (!x) throw new Error("Shift not found.");
    return x;
  };
  const own = (x: DemoShift) => {
    allow("facility");
    if (x.facilityId !== FACILITY_ID)
      throw new Error("This shift belongs to another facility.");
  };
  const overlap = (nurseId: string, x: DemoShift) =>
    s.shifts.some(
      (y) =>
        y.id !== x.id &&
        y.nurseId === nurseId &&
        y.status === "filled" &&
        Date.parse(y.starts_at) < Date.parse(x.ends_at) &&
        Date.parse(x.starts_at) < Date.parse(y.ends_at),
    );
  const note = (target: Role, title: string, body: string) =>
    s.notifications.unshift({
      id: id(),
      role: target,
      title,
      body,
      read: false,
      createdAt: timestamp,
    });
  switch (command.type) {
    case "post": {
      allow("facility");
      if (!s.facilities.find((f) => f.id === FACILITY_ID)?.active)
        throw new Error("This facility is paused.");
      const valid = shiftSchema.safeParse(command.shift);
      if (!valid.success) throw new Error(valid.error.issues[0].message);
      s.shifts.unshift({
        ...command.shift,
        id: id(),
        facilityId: FACILITY_ID,
        status: "open",
      });
      message = "Demo shift posted. No real shift was posted.";
      break;
    }
    case "apply": {
      allow("nurse");
      const x = shift(command.shiftId);
      const n = s.nurses.find((n) => n.id === NURSE_ID)!;
      if (x.status !== "open" || Date.parse(x.starts_at) <= now)
        throw new Error("This shift is no longer open.");
      if (!s.facilities.find((f) => f.id === x.facilityId)?.active)
        throw new Error("This facility is paused.");
      if (!n.verified || n.credential !== x.specialty)
        throw new Error(
          "A verified " + x.specialty + " credential is required.",
        );
      if (overlap(n.id, x))
        throw new Error("This shift overlaps your confirmed schedule.");
      if (
        s.applications.some(
          (a) =>
            a.shiftId === x.id &&
            a.nurseId === n.id &&
            a.status !== "withdrawn",
        )
      )
        throw new Error("You already applied to this shift.");
      s.applications.unshift({
        id: id(),
        shiftId: x.id,
        nurseId: n.id,
        status: "pending",
        createdAt: timestamp,
      });
      note(
        "facility",
        "New application",
        n.name + " applied for " + x.title + ".",
      );
      message = "Demo application submitted. No real application was sent.";
      break;
    }
    case "withdraw": {
      allow("nurse");
      const a = s.applications.find(
        (a) => a.id === command.applicationId && a.nurseId === NURSE_ID,
      );
      if (!a || a.status !== "pending")
        throw new Error("Only a pending application can be withdrawn.");
      a.status = "withdrawn";
      message = "Demo application withdrawn.";
      break;
    }
    case "accept":
    case "decline": {
      const a = s.applications.find((a) => a.id === command.applicationId);
      if (!a) throw new Error("Application not found.");
      const x = shift(a.shiftId);
      own(x);
      if (a.status !== "pending" || x.status !== "open")
        throw new Error("Application is no longer available.");
      if (command.type === "accept") {
        const n = s.nurses.find((n) => n.id === a.nurseId)!;
        if (!n.verified || n.credential !== x.specialty)
          throw new Error("A verified matching credential is required.");
        if (overlap(n.id, x))
          throw new Error("This nurse already has an overlapping shift.");
        x.status = "filled";
        x.nurseId = n.id;
        s.applications
          .filter((y) => y.shiftId === x.id && y.status === "pending")
          .forEach((y) => {
            y.status = y.id === a.id ? "accepted" : "declined";
          });
        note(
          "nurse",
          "Shift confirmed",
          x.title + " has been added to the schedule.",
        );
        message = "Demo application accepted. Schedule updated.";
      } else {
        a.status = "declined";
        note(
          "nurse",
          "Application update",
          "Your application for " + x.title + " was not selected.",
        );
        message = "Demo application declined.";
      }
      break;
    }
    case "cancel": {
      const x = shift(command.shiftId);
      own(x);
      if (x.status !== "open")
        throw new Error("Only an open shift can be cancelled.");
      x.status = "cancelled";
      s.applications
        .filter((a) => a.shiftId === x.id && a.status === "pending")
        .forEach((a) => {
          a.status = "declined";
        });
      note("nurse", "Shift cancelled", x.title + " is no longer available.");
      message = "Demo shift cancelled.";
      break;
    }
    case "blast": {
      const x = shift(command.shiftId);
      own(x);
      if (x.status !== "open")
        throw new Error("Only open shifts can be blasted.");
      x.urgent = true;
      note(
        "nurse",
        "Urgent staffing request",
        x.title +
          " · $" +
          x.hourly_rate +
          "/hr. Priority nurses are highlighted in the facility network.",
      );
      message = "Demo urgent blast added to nurse notifications.";
      break;
    }
    case "priority": {
      allow("facility");
      if (!s.nurses.some((n) => n.id === command.nurseId))
        throw new Error("Nurse not found.");
      s.priority = s.priority.includes(command.nurseId)
        ? s.priority.filter((n) => n !== command.nurseId)
        : [...s.priority, command.nurseId];
      message = "Demo priority list updated.";
      break;
    }
    case "issue": {
      const x = shift(command.shiftId);
      own(x);
      if (x.status !== "filled")
        throw new Error("An assigned shift is required.");
      if (
        command.kind === "out" &&
        !s.timesheets.some((t) => t.shiftId === x.id && !t.clockOut)
      )
        throw new Error("The nurse must clock in first.");
      const bytes = new Uint32Array(1);
      crypto.getRandomValues(bytes);
      const code = String(bytes[0] % 1000000).padStart(6, "0");
      s.codes = s.codes.filter(
        (c) => !(c.shiftId === x.id && c.kind === command.kind),
      );
      s.codes.push({
        shiftId: x.id,
        kind: command.kind,
        code,
        expiresAt: now + 600000,
        used: false,
      });
      message =
        "Demo " +
        (command.kind === "in" ? "clock-in" : "clock-out") +
        " code: " +
        code +
        " · valid for 10 minutes.";
      break;
    }
    case "clock": {
      allow("nurse");
      const x = shift(command.shiftId);
      if (x.nurseId !== NURSE_ID || x.status !== "filled")
        throw new Error("An assigned shift is required.");
      if (now - s.attempts.since > 900000)
        s.attempts = { count: 0, since: now };
      if (s.attempts.count >= 5)
        throw new Error("Too many attempts. Wait 15 minutes.");
      s.attempts.count++;
      const c = s.codes.find(
        (c) =>
          c.shiftId === x.id &&
          c.kind === command.kind &&
          !c.used &&
          c.expiresAt > now &&
          c.code === command.code,
      );
      if (!c)
        return {
          state: s,
          message:
            "Invalid or expired demo code. Ask the facility for a new code.",
        };
      const t = s.timesheets.find((t) => t.shiftId === x.id);
      if (command.kind === "in") {
        if (t) throw new Error("Already clocked in.");
        s.timesheets.push({
          id: id(),
          shiftId: x.id,
          nurseId: NURSE_ID,
          clockIn: timestamp,
          approved: false,
        });
      } else {
        if (!t || t.clockOut) throw new Error("Clock in before clocking out.");
        t.clockOut = timestamp;
        x.status = "completed";
        note(
          "facility",
          "Timesheet ready",
          x.title + " is complete and ready for approval.",
        );
      }
      c.used = true;
      message =
        command.kind === "in"
          ? "Demo clock-in recorded."
          : "Demo clock-out recorded. Timesheet ready for approval.";
      break;
    }
    case "approve": {
      const t = s.timesheets.find((t) => t.id === command.timesheetId);
      if (!t) throw new Error("Timesheet not found.");
      own(shift(t.shiftId));
      if (!t.clockOut || t.approved)
        throw new Error("A completed, unapproved timesheet is required.");
      t.approved = true;
      note(
        "nurse",
        "Timesheet approved",
        "Your facility approved your hours. Payment is arranged directly with the facility.",
      );
      message = "Demo timesheet approved.";
      break;
    }
    case "read": {
      s.notifications
        .filter(
          (n) =>
            n.role === role &&
            (!command.notificationId || n.id === command.notificationId),
        )
        .forEach((n) => {
          n.read = true;
        });
      message = "Notifications marked as read.";
      break;
    }
    case "verify": {
      allow("admin");
      const n = s.nurses.find((n) => n.id === command.nurseId);
      if (!n) throw new Error("Nurse not found.");
      n.verified = !n.verified;
      message = n.verified
        ? "Demo credential marked verified."
        : "Demo credential verification removed.";
      break;
    }
    case "facility_status": {
      allow("admin");
      const f = s.facilities.find((f) => f.id === command.facilityId);
      if (!f) throw new Error("Facility not found.");
      f.active = !f.active;
      message = f.active
        ? "Demo facility reactivated."
        : "Demo facility paused.";
      break;
    }
    case "add_facility": {
      allow("admin");
      if (command.name.trim().length < 2 || command.city.trim().length < 2)
        throw new Error("Facility name and location are required.");
      s.facilities.push({
        id: id(),
        name: command.name.trim(),
        city: command.city.trim(),
        active: true,
        subscription: "inactive",
      });
      message = "Demo facility created.";
      break;
    }
    case "add_nurse": {
      allow("admin");
      if (
        command.name.trim().length < 2 ||
        !["RN", "LPN", "CNA"].includes(command.credential)
      )
        throw new Error("A name and valid credential are required.");
      s.nurses.push({
        id: id(),
        name: command.name.trim(),
        credential: command.credential,
        specialty: command.specialty.trim() || "General care",
        verified: false,
        experience: 1,
        initials: command.name
          .trim()
          .split(/\s+/)
          .map((n) => n[0])
          .slice(0, 2)
          .join(""),
      });
      message = "Demo nurse added for credential review.";
      break;
    }
    case "subscription": {
      allow("facility");
      s.facilities.find((f) => f.id === FACILITY_ID)!.subscription =
        command.active ? "active" : "inactive";
      message = command.active
        ? "Demo subscription activated. No charge was made."
        : "Demo subscription paused. No charge was made.";
      break;
    }
    case "settings": {
      if (command.settings.displayName.trim().length < 2)
        throw new Error("Please enter a display name.");
      s.settings = {
        ...command.settings,
        displayName: command.settings.displayName.trim(),
      };
      message = "Demo preferences saved. No emails will be sent.";
      break;
    }
  }
  s.activity.unshift(message);
  s.activity = s.activity.slice(0, 50);
  return { state: s, message };
}
export function readDemoState(raw: string | null): DemoState {
  if (!raw) return createDemoState();
  try {
    const data = JSON.parse(raw);
    if (
      data.version !== 2 ||
      ![
        "shifts",
        "nurses",
        "facilities",
        "applications",
        "timesheets",
        "notifications",
        "priority",
        "codes",
        "activity",
      ].every((k) => Array.isArray(data[k])) ||
      !data.settings ||
      !data.attempts
    )
      throw new Error("Invalid saved demo");
    for (const x of data.shifts) {
      if (
        !x.id ||
        !x.title ||
        !Number.isFinite(Date.parse(x.starts_at)) ||
        !Number.isFinite(Date.parse(x.ends_at))
      )
        throw new Error("Invalid shift");
    }
    return data as DemoState;
  } catch {
    return createDemoState();
  }
}
