"use client";
import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Bell,
  Check,
  CheckCheck,
  Clock,
  HeartPulse,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { currency, hoursBetween, type Role } from "@/lib/domain";
import {
  FACILITY_ID,
  NURSE_ID,
  type DemoState,
  type DemoCommand,
  type DemoShift,
  type Credential,
} from "@/lib/demo/store";
import Dialog from "./dialog";
type Props = {
  state: DemoState;
  role: Role;
  dispatch: (command: DemoCommand) => unknown;
};
const date = (s: string) =>
  new Date(s).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
export function Directory({
  state: s,
  role,
  tab,
  dispatch,
}: Props & { tab: string }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const facilities = tab === "Facilities";
  const nurses = s.nurses.filter(
    (n) =>
      (n.name + " " + n.credential + " " + n.specialty)
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all" ||
        (filter === "priority"
          ? s.priority.includes(n.id)
          : filter === "verified"
            ? n.verified
            : !n.verified)),
  );
  return (
    <section className="panel resource-panel">
      <div className="resource-heading">
        <div>
          <h2>
            {facilities
              ? "Facility directory"
              : role === "admin"
                ? "Account administration"
                : "Your nurse network"}
          </h2>
          <p>
            {facilities
              ? "A growing community of places that care."
              : role === "admin"
                ? "Review sample credentials and grow the care community."
                : "Build a priority list of people you trust."}
          </p>
        </div>
        {role === "admin" && (
          <button className="primary" onClick={() => setAdding(true)}>
            <Plus size={15} />
            {facilities ? "Add facility" : "Add nurse"}
          </button>
        )}
      </div>
      <div className="directory-tools">
        <label className="search">
          <Search size={16} />
          <input
            aria-label={facilities ? "Search facilities" : "Search nurses"}
            placeholder={
              facilities
                ? "Search facilities…"
                : "Search by name, role, or specialty…"
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        {!facilities && (
          <select
            aria-label="Nurse filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All nurses</option>
            <option value="verified">Verified</option>
            <option value="unverified">Needs review</option>
            {role === "facility" && (
              <option value="priority">Priority nurses</option>
            )}
          </select>
        )}
      </div>
      {facilities ? (
        <div className="facility-grid">
          {s.facilities
            .filter((f) =>
              (f.name + " " + f.city)
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((f) => (
              <article className="facility-card" key={f.id}>
                <div className="facility-card-icon">
                  <HeartPulse size={26} />
                </div>
                <h3>{f.name}</h3>
                <p>{f.city}</p>
                <div className="facility-meta">
                  <span
                    className={"badge " + (f.active ? "open" : "cancelled")}
                  >
                    {f.active ? "Active" : "Paused"}
                  </span>
                  <span className="badge">
                    {f.subscription === "active"
                      ? "Demo subscription active"
                      : "No demo subscription"}
                  </span>
                </div>
                <small>
                  {
                    s.shifts.filter(
                      (x) => x.facilityId === f.id && x.status === "open",
                    ).length
                  }{" "}
                  open shifts ·{" "}
                  {
                    s.shifts.filter(
                      (x) => x.facilityId === f.id && x.status === "filled",
                    ).length
                  }{" "}
                  assigned
                </small>
                <button
                  className="secondary"
                  onClick={() =>
                    dispatch({ type: "facility_status", facilityId: f.id })
                  }
                >
                  {f.active ? "Pause facility" : "Reactivate facility"}
                </button>
              </article>
            ))}
        </div>
      ) : (
        <div className="nurse-grid">
          {nurses.map((n) => (
            <article className="nurse-card" key={n.id}>
              <div className="nurse-card-top">
                <div className="avatar">{n.initials}</div>
                <span className={"badge " + (n.verified ? "open" : "pending")}>
                  {n.verified ? (
                    <>
                      <ShieldCheck size={12} />
                      Verified
                    </>
                  ) : (
                    "Needs review"
                  )}
                </span>
              </div>
              <h3>{n.name}</h3>
              <p>
                {n.credential} · {n.specialty}
              </p>
              <small>{n.experience} years of sample experience</small>
              <div className="nurse-card-meta">
                <span>
                  {
                    s.shifts.filter(
                      (x) => x.nurseId === n.id && x.status === "completed",
                    ).length
                  }{" "}
                  completed demo shifts
                </span>
                {s.priority.includes(n.id) && (
                  <Star size={14} className="priority-star" />
                )}
              </div>
              <button
                className={
                  role === "admin"
                    ? "secondary"
                    : s.priority.includes(n.id)
                      ? "secondary"
                      : "primary"
                }
                onClick={() =>
                  dispatch(
                    role === "admin"
                      ? { type: "verify", nurseId: n.id }
                      : { type: "priority", nurseId: n.id },
                  )
                }
              >
                {role === "admin"
                  ? n.verified
                    ? "Remove verification"
                    : "Verify demo credential"
                  : s.priority.includes(n.id)
                    ? "Remove priority"
                    : "Add to priority"}
              </button>
            </article>
          ))}
        </div>
      )}
      {!facilities && !nurses.length && (
        <div className="empty">No nurses match your search.</div>
      )}
      {facilities &&
        !s.facilities.some((f) =>
          (f.name + " " + f.city).toLowerCase().includes(query.toLowerCase()),
        ) && <div className="empty">No facilities match your search.</div>}
      {adding && (
        <Dialog
          title={facilities ? "Add a demo facility" : "Add a demo nurse"}
          onClose={() => setAdding(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const name = String(f.get("name")).trim();
              if (name.length < 2) {
                setError("Enter at least two characters.");
                return;
              }
              const result = dispatch(
                facilities
                  ? { type: "add_facility", name, city: String(f.get("city")) }
                  : {
                      type: "add_nurse",
                      name,
                      credential: String(f.get("credential")) as Credential,
                      specialty: String(f.get("specialty")),
                    },
              );
              if (result) setAdding(false);
            }}
          >
            <label>
              {facilities ? "Facility name" : "Full name"}
              <input
                name="name"
                minLength={2}
                maxLength={120}
                required
                autoFocus
              />
            </label>
            {facilities ? (
              <label>
                City, state
                <input
                  name="city"
                  placeholder="Charlotte, NC"
                  minLength={2}
                  maxLength={120}
                  required
                />
              </label>
            ) : (
              <>
                <label>
                  Credential
                  <select name="credential">
                    <option>RN</option>
                    <option>LPN</option>
                    <option>CNA</option>
                  </select>
                </label>
                <label>
                  Specialty
                  <input
                    name="specialty"
                    maxLength={100}
                    placeholder="Critical Care"
                    required
                  />
                </label>
                <p className="notice">
                  New sample nurses start unverified. Use the directory to
                  simulate credential review.
                </p>
              </>
            )}
            {error && <p role="alert">{error}</p>}
            <button className="primary">
              {facilities ? "Create demo facility" : "Add demo nurse"}
              <ArrowRight size={15} />
            </button>
          </form>
        </Dialog>
      )}
    </section>
  );
}
export function Attendance({ state: s, role, dispatch }: Props) {
  const [shiftId, setShiftId] = useState("s6");
  const [code, setCode] = useState("");
  const [filter, setFilter] = useState("all");
  const shifts = s.shifts.filter(
    (x) =>
      x.status === "filled" &&
      (role === "nurse"
        ? x.nurseId === NURSE_ID
        : role === "facility"
          ? x.facilityId === FACILITY_ID
          : true),
  );
  const selected = shifts.find((x) => x.id === shiftId) ?? shifts[0];
  const timesheets = s.timesheets.filter(
    (t) =>
      (role === "nurse"
        ? t.nurseId === NURSE_ID
        : role === "facility"
          ? s.shifts.find((x) => x.id === t.shiftId)?.facilityId === FACILITY_ID
          : true) &&
      (filter === "all" || (filter === "approved" ? t.approved : !t.approved)),
  );
  return (
    <div className="attendance-layout">
      <section className="panel resource-panel">
        <div className="resource-heading">
          <div>
            <h2>Attendance & timesheets</h2>
            <p>
              Every hour, accounted for. Sample hours never trigger payments.
            </p>
          </div>
          <select
            aria-label="Timesheet status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All timesheets</option>
            <option value="pending">Needs approval</option>
            <option value="approved">Approved</option>
          </select>
        </div>
        {timesheets.map((t) => {
          const x = s.shifts.find((x) => x.id === t.shiftId)!;
          const n = s.nurses.find((n) => n.id === t.nurseId)!;
          const hours = t.clockOut ? hoursBetween(t.clockIn, t.clockOut) : 0;
          return (
            <article className="timesheet-card" key={t.id}>
              <div className="timesheet-header">
                <div>
                  <strong>{x.title}</strong>
                  <p>
                    {n.name} · {n.credential}
                  </p>
                </div>
                <span
                  className={
                    "badge " +
                    (t.approved ? "filled" : t.clockOut ? "pending" : "open")
                  }
                >
                  {t.approved
                    ? "Approved"
                    : t.clockOut
                      ? "Needs approval"
                      : "In progress"}
                </span>
              </div>
              <div className="timesheet-metrics">
                <div>
                  <small>CLOCK IN</small>
                  <strong>{date(t.clockIn)}</strong>
                </div>
                <div>
                  <small>CLOCK OUT</small>
                  <strong>{t.clockOut ? date(t.clockOut) : "On shift"}</strong>
                </div>
                <div>
                  <small>HOURS</small>
                  <strong>
                    {t.clockOut ? hours.toFixed(2) : "In progress"}
                  </strong>
                </div>
                <div>
                  <small>DIRECT FACILITY PAY</small>
                  <strong>
                    {t.clockOut ? currency(hours * x.hourly_rate) : "Pending"}
                  </strong>
                </div>
              </div>
              {role === "facility" && t.clockOut && !t.approved && (
                <button
                  className="primary"
                  onClick={() =>
                    dispatch({ type: "approve", timesheetId: t.id })
                  }
                >
                  <Check size={15} />
                  Approve timesheet
                </button>
              )}
            </article>
          );
        })}
        {!timesheets.length && (
          <div className="empty">
            <Clock size={26} />
            <p>No timesheets match this view.</p>
          </div>
        )}
      </section>
      {role !== "admin" && (
        <section className="panel attendance-controls">
          <div className="attendance-icon">
            <Clock size={23} />
          </div>
          <h2>{role === "facility" ? "Attendance codes" : "Clock in & out"}</h2>
          <p>
            {role === "facility"
              ? "Share a one-time demo code with the assigned nurse."
              : "Get the code from the Facility portal for your assigned shift."}
          </p>
          {selected ? (
            <>
              <label>
                Assigned shift
                <select
                  aria-label="Assigned shift"
                  value={selected.id}
                  onChange={(e) => setShiftId(e.target.value)}
                >
                  {shifts.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.title}
                    </option>
                  ))}
                </select>
              </label>
              <p className="attendance-assignee">
                {s.nurses.find((n) => n.id === selected.nurseId)?.name} ·{" "}
                {new Date(selected.starts_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
              {role === "nurse" && (
                <label>
                  Six-digit code
                  <input
                    aria-label="Attendance code"
                    inputMode="numeric"
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="000000"
                    maxLength={6}
                  />
                </label>
              )}
              <div className="attendance-buttons">
                {(["in", "out"] as const).map((kind) => (
                  <button
                    key={kind}
                    className={kind === "in" ? "primary" : "secondary"}
                    disabled={role === "nurse" && code.length !== 6}
                    onClick={() =>
                      dispatch(
                        role === "facility"
                          ? { type: "issue", shiftId: selected.id, kind }
                          : { type: "clock", shiftId: selected.id, kind, code },
                      )
                    }
                  >
                    {role === "facility" ? "Generate clock-" : "Clock "}
                    {kind}
                    {role === "facility" ? " code" : ""}
                  </button>
                ))}
              </div>
              {role === "facility" &&
                s.codes
                  .filter((c) => c.shiftId === selected.id)
                  .map((c) => (
                    <div className="code-card" key={c.kind}>
                      <span>DEMO CLOCK-{c.kind.toUpperCase()} CODE</span>
                      <strong>{c.code}</strong>
                      <small>
                        {c.used
                          ? "Redeemed"
                          : c.expiresAt < Date.now()
                            ? "Expired"
                            : "Valid until " +
                              new Date(c.expiresAt).toLocaleTimeString(
                                "en-US",
                                { hour: "numeric", minute: "2-digit" },
                              )}
                      </small>
                    </div>
                  ))}
            </>
          ) : (
            <div className="empty">No assigned shifts available.</div>
          )}
          <p className="notice">
            Demo attendance works at any time so you can explore the full flow.
            Codes expire after 10 minutes and can only be used once.
          </p>
        </section>
      )}
    </div>
  );
}
export function Notifications({ state: s, role, dispatch }: Props) {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const all = s.notifications.filter((n) => n.role === role);
  const items = all.filter((n) => !unreadOnly || !n.read);
  return (
    <section className="panel resource-panel">
      <div className="resource-heading">
        <div>
          <h2>Your notifications</h2>
          <p>
            {all.filter((n) => !n.read).length} unread updates in this demo
            portal.
          </p>
        </div>
        <button
          className="secondary"
          onClick={() => dispatch({ type: "read" })}
        >
          <CheckCheck size={15} />
          Mark all read
        </button>
      </div>
      <button
        className={"urgent-filter " + (unreadOnly ? "on" : "")}
        aria-pressed={unreadOnly}
        onClick={() => setUnreadOnly(!unreadOnly)}
      >
        Unread only
      </button>
      {items.map((n) => (
        <article
          className={"notification-card " + (!n.read ? "unread" : "")}
          key={n.id}
        >
          <div className="notification-icon">
            <Bell size={18} />
          </div>
          <div>
            <strong>{n.title}</strong>
            <p>{n.body}</p>
            <small>{date(n.createdAt)}</small>
          </div>
          {!n.read && (
            <button
              className="secondary"
              aria-label={"Mark " + n.title + " read"}
              onClick={() => dispatch({ type: "read", notificationId: n.id })}
            >
              Mark read
            </button>
          )}
        </article>
      ))}
      {!items.length && (
        <div className="empty">
          <CheckCheck size={28} />
          <h3>You’re all caught up.</h3>
          <p>
            New applications, bookings, and staffing blasts will appear here.
          </p>
        </div>
      )}
    </section>
  );
}
export function Reports({
  state: s,
  shifts,
  role,
  onExport,
}: {
  state: DemoState;
  shifts: DemoShift[];
  role: Role;
  onExport: () => void;
}) {
  const total = shifts.filter((x) => x.status !== "cancelled").length;
  const sheets = s.timesheets.filter(
    (t) =>
      shifts.some((x) => x.id === t.shiftId) &&
      (role !== "nurse" || t.nurseId === NURSE_ID),
  );
  const hours = sheets.reduce(
    (sum, t) => sum + (t.clockOut ? hoursBetween(t.clockIn, t.clockOut) : 0),
    0,
  );
  const pay = sheets.reduce(
    (sum, t) =>
      sum +
      (t.clockOut
        ? hoursBetween(t.clockIn, t.clockOut) *
          (shifts.find((x) => x.id === t.shiftId)?.hourly_rate ?? 0)
        : 0),
    0,
  );
  return (
    <div className="reports-grid">
      <section className="panel resource-panel">
        <div className="resource-heading">
          <div>
            <h2>Staffing performance</h2>
            <p>Calculated from your current local demo workspace.</p>
          </div>
          <button className="secondary" onClick={onExport}>
            <ArrowDownToLine size={15} />
            Download CSV report
          </button>
        </div>
        <div className="report-bars">
          {["open", "filled", "completed", "cancelled"].map((status) => (
            <div key={status}>
              <span>{status[0].toUpperCase() + status.slice(1)}</span>
              <div>
                <i
                  style={{
                    width:
                      Math.round(
                        (shifts.filter((x) => x.status === status).length /
                          (shifts.length || 1)) *
                          100,
                      ) + "%",
                  }}
                />
              </div>
              <strong>
                {shifts.filter((x) => x.status === status).length}
              </strong>
            </div>
          ))}
        </div>
        <div className="report-summary">
          <div>
            <span>Recorded hours</span>
            <strong>{hours.toFixed(2)}</strong>
          </div>
          <div>
            <span>Estimated direct pay</span>
            <strong>{currency(pay)}</strong>
          </div>
          <div>
            <span>Shift fill rate</span>
            <strong>
              {Math.round(
                (shifts.filter(
                  (x) => x.status === "filled" || x.status === "completed",
                ).length /
                  (total || 1)) *
                  100,
              )}
              %
            </strong>
          </div>
        </div>
        <p className="notice">
          Estimated nurse pay is a reporting value only. Facilities arrange
          payment directly; STAFTIFY does not collect these amounts.
        </p>
      </section>
      <section className="panel resource-panel">
        <h2>Recent demo activity</h2>
        <ol className="activity-list">
          {s.activity.slice(0, 10).map((a, i) => (
            <li key={i}>
              <span />
              {a}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
export function Subscription({ state: s, dispatch }: Omit<Props, "role">) {
  const active =
    s.facilities.find((f) => f.id === FACILITY_ID)!.subscription === "active";
  return (
    <section className="panel billing-panel">
      <div className="eyebrow">SIMPLE, PREDICTABLE PRICING</div>
      <h2>Great teams start here.</h2>
      <p>One facility subscription. More room to focus on care.</p>
      <span className={"badge " + (active ? "open" : "pending")}>
        {active ? "Demo subscription active" : "Demo subscription paused"}
      </span>
      <div className="price">
        $399<span>/ month</span>
      </div>
      <ul>
        {[
          "Unlimited shift posting",
          "Nurse applications and priority lists",
          "Urgent staffing notifications",
          "OTP attendance and timesheets",
          "Staffing reports and shift tracking",
        ].map((x) => (
          <li key={x}>
            <Check size={17} />
            {x}
          </li>
        ))}
      </ul>
      <p className="notice">
        This is a pricing simulation. No checkout, account connection, or
        payment occurs. Facilities pay nurses directly.
      </p>
      <button
        className="primary"
        onClick={() => dispatch({ type: "subscription", active: !active })}
      >
        {active ? "Pause demo subscription" : "Activate demo subscription"}
        <ArrowRight size={15} />
      </button>
    </section>
  );
}
export function Preferences({
  state: s,
  dispatch,
  onReset,
}: Omit<Props, "role"> & { onReset: () => void }) {
  return (
    <section className="panel resource-panel preferences-panel">
      <h2>Demo preferences</h2>
      <p>
        Personalize the facility profile and sample notification preferences.
      </p>
      <form
        key={s.settings.displayName}
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          dispatch({
            type: "settings",
            settings: {
              displayName: String(f.get("displayName")),
              emailNotifications: f.get("emailNotifications") === "on",
              weeklyDigest: f.get("weeklyDigest") === "on",
            },
          });
        }}
      >
        <label>
          Facility administrator name
          <input
            name="displayName"
            defaultValue={s.settings.displayName}
            minLength={2}
            maxLength={80}
            required
          />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            name="emailNotifications"
            defaultChecked={s.settings.emailNotifications}
          />
          Sample notification preference
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            name="weeklyDigest"
            defaultChecked={s.settings.weeklyDigest}
          />
          Sample weekly digest preference
        </label>
        <p className="notice">
          These preferences are saved locally for demonstration. No emails are
          sent.
        </p>
        <button className="primary">
          Save preferences
          <Check size={16} />
        </button>
      </form>
      <div className="reset-section">
        <h3>Start fresh</h3>
        <p>Restore the original sample data across all three portals.</p>
        <button className="secondary" onClick={onReset}>
          Reset demo workspace
        </button>
      </div>
    </section>
  );
}
