"use client";
import { useState } from "react";
import { Check, Clock, Search, ShieldCheck } from "lucide-react";
import { currency, hoursBetween } from "@/lib/domain";
import type { WorkspaceData } from "@/lib/types";
type Action = (
  action: string,
  payload?: Record<string, unknown>,
) => Promise<{
  result?: { code?: string; expires_in_seconds?: number };
} | null>;
export function ProfessionalProfile({
  data,
  busy,
  request,
}: {
  data: WorkspaceData;
  busy: boolean;
  request: (
    url: string,
    method: string,
    body: unknown,
    message: string,
  ) => Promise<unknown>;
}) {
  const p = data.profile;
  const details = data.nurse_details.find((n) => n.id === p.id);
  const license = data.nurse_credentials.find((c) => c.nurse_id === p.id);
  return (
    <section className="panel resource-panel preferences-panel">
      <div className="resource-heading">
        <div>
          <h2>Your professional profile</h2>
          <p>
            Current credentials help facilities make confident staffing
            decisions.
          </p>
        </div>
        <span className="badge">
          {p.verified ? "Verified" : "Review required"}
        </span>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          await request(
            "/api/profile",
            "PUT",
            {
              ...Object.fromEntries(f),
              experience_years: Number(f.get("experience_years")),
            },
            "Profile saved. License changes require administrator verification.",
          );
        }}
      >
        <label>
          Full name
          <input
            name="full_name"
            defaultValue={p.full_name}
            minLength={2}
            maxLength={120}
            required
          />
        </label>
        <div className="form-grid">
          <label>
            Credential
            <select name="credential" defaultValue={p.credential ?? "RN"}>
              <option>RN</option>
              <option>LPN</option>
              <option>CNA</option>
            </select>
          </label>
          <label>
            Years of experience
            <input
              name="experience_years"
              type="number"
              min={0}
              max={60}
              defaultValue={details?.experience_years}
              required
            />
          </label>
        </div>
        <label>
          Clinical specialty
          <input
            name="specialty"
            defaultValue={details?.specialty}
            minLength={2}
            maxLength={120}
            required
          />
        </label>
        <div className="form-grid">
          <label>
            City
            <input
              name="city"
              defaultValue={details?.city}
              minLength={2}
              maxLength={120}
              required
            />
          </label>
          <label>
            State (two letters)
            <input
              name="state"
              defaultValue={details?.state}
              minLength={2}
              maxLength={2}
              pattern="[A-Za-z]{2}"
              required
            />
          </label>
        </div>
        <label>
          Professional bio
          <textarea
            name="bio"
            defaultValue={details?.bio}
            maxLength={2000}
            placeholder="Clinical experience, strengths, and interests. Do not include patient information."
          />
        </label>
        <h3>License for administrator review</h3>
        <p className="notice">
          License numbers are visible only to you and platform administrators.
          Editing your license or credential removes prior verification until
          reviewed again.
        </p>
        <label>
          License number
          <input
            name="license_number"
            defaultValue={license?.license_number}
            minLength={3}
            maxLength={100}
            required
          />
        </label>
        <div className="form-grid">
          <label>
            License state
            <input
              name="license_state"
              defaultValue={license?.license_state}
              pattern="[A-Za-z]{2}"
              minLength={2}
              maxLength={2}
              required
            />
          </label>
          <label>
            License expiration
            <input
              name="license_expires"
              type="date"
              defaultValue={license?.license_expires}
              required
            />
          </label>
        </div>
        <button className="primary" disabled={busy}>
          {busy ? "Saving…" : "Save professional profile"}
        </button>
      </form>
    </section>
  );
}
export function AttendancePanel({
  data,
  busy,
  action,
}: {
  data: WorkspaceData;
  busy: boolean;
  action: Action;
}) {
  const [selected, setSelected] = useState("");
  const [code, setCode] = useState("");
  const [issued, setIssued] = useState<{
    shiftId: string;
    kind: string;
    code: string;
    expires: Date;
  } | null>(null);
  const role = data.profile.role;
  const shifts = data.shifts.filter(
    (s) =>
      s.status === "filled" &&
      (role !== "nurse" || s.assigned_nurse_id === data.profile.id),
  );
  const shift = shifts.find((s) => s.id === selected) ?? shifts[0];
  return (
    <div className="attendance-layout">
      <section className="panel resource-panel">
        <h2>Timesheets & approval</h2>
        <p>
          Attendance times are recorded by the database, not the device clock.
        </p>
        {data.timesheets.map((t) => {
          const s = data.shifts.find((s) => s.id === t.shift_id);
          const name = data.profiles.find(
            (p) => p.id === t.nurse_id,
          )?.full_name;
          const hours = t.clock_out ? hoursBetween(t.clock_in, t.clock_out) : 0;
          return (
            <article className="timesheet-card" key={t.id}>
              <div className="timesheet-header">
                <div>
                  <strong>{s?.title ?? "Shift"}</strong>
                  <p>{name ?? "Nursing professional"}</p>
                </div>
                <span className="badge">
                  {t.approved_at
                    ? "Approved"
                    : t.clock_out
                      ? "Needs approval"
                      : "In progress"}
                </span>
              </div>
              <div className="timesheet-metrics">
                <div>
                  <small>CLOCK IN</small>
                  <strong>{new Date(t.clock_in).toLocaleString()}</strong>
                </div>
                <div>
                  <small>CLOCK OUT</small>
                  <strong>
                    {t.clock_out
                      ? new Date(t.clock_out).toLocaleString()
                      : "On shift"}
                  </strong>
                </div>
                <div>
                  <small>HOURS</small>
                  <strong>
                    {t.clock_out ? hours.toFixed(2) : "In progress"}
                  </strong>
                </div>
                <div>
                  <small>ESTIMATED DIRECT PAY</small>
                  <strong>
                    {t.clock_out && s
                      ? currency(hours * s.hourly_rate)
                      : "Pending"}
                  </strong>
                </div>
              </div>
              {role === "facility" && t.clock_out && !t.approved_at && (
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    void action("approve_timesheet", { timesheet_id: t.id })
                  }
                >
                  <Check size={15} />
                  Approve timesheet
                </button>
              )}
            </article>
          );
        })}
        {!data.timesheets.length && (
          <div className="empty">
            No attendance records yet. Completed hours appear here after
            clock-in.
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
              ? "Generate a one-time code and share it in person with the assigned nurse."
              : "Ask the facility for the one-time code for your assigned shift."}
          </p>
          {shift ? (
            <>
              <label>
                Assigned shift
                <select
                  aria-label="Assigned shift"
                  value={shift.id}
                  onChange={(e) => {
                    setSelected(e.target.value);
                    setIssued(null);
                    setCode("");
                  }}
                >
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </label>
              {role === "nurse" && (
                <label>
                  Six-digit verification code
                  <input
                    aria-label="Verification code"
                    value={code}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                  />
                </label>
              )}
              <div className="attendance-buttons">
                {(["in", "out"] as const).map((kind) => (
                  <button
                    key={kind}
                    disabled={busy || (role === "nurse" && code.length !== 6)}
                    className={kind === "in" ? "primary" : "secondary"}
                    onClick={async () => {
                      const d = await action(
                        role === "facility" ? "issue_otp" : "clock",
                        {
                          shift_id: shift.id,
                          kind,
                          ...(role === "nurse" ? { code } : {}),
                        },
                      );
                      if (d?.result?.code)
                        setIssued({
                          shiftId: shift.id,
                          kind,
                          code: d.result.code,
                          expires: new Date(
                            Date.now() +
                              (d.result.expires_in_seconds ?? 600) * 1000,
                          ),
                        });
                      if (d && role === "nurse") setCode("");
                    }}
                  >
                    {role === "facility" ? "Generate clock-" : "Clock "}
                    {kind}
                    {role === "facility" ? " code" : ""}
                  </button>
                ))}
              </div>
              {issued && issued.shiftId === shift.id && (
                <div className="code-card">
                  <span>CLOCK-{issued.kind.toUpperCase()} CODE</span>
                  <strong>{issued.code}</strong>
                  <small>Expires {issued.expires.toLocaleTimeString()}</small>
                </div>
              )}
            </>
          ) : (
            <div className="empty">No assigned shifts awaiting attendance.</div>
          )}
          <p className="notice">
            Attendance is available from 30 minutes before the shift to 4 hours
            after its end. Codes expire in 10 minutes, are single-use, and have
            attempt limits. Recorded times require facility approval; no nurse
            payment is collected here.
          </p>
        </section>
      )}
    </div>
  );
}
export function AdminPanel({
  data,
  tab,
  busy,
  action,
}: {
  data: WorkspaceData;
  tab: string;
  busy: boolean;
  action: Action;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const facilityTab = tab === "Facilities";
  return (
    <section className="panel resource-panel">
      <h2>
        {facilityTab
          ? "Facility verification"
          : "Members & professional verification"}
      </h2>
      <p>
        {facilityTab
          ? "Review facility details before allowing shift publication. Subscription status is managed separately by billing."
          : "Verify credentials against authoritative licensing sources before granting eligibility. Administrator accounts cannot be suspended here."}
      </p>
      <div className="directory-tools">
        <label className="search">
          <Search size={16} />
          <input
            aria-label="Search directory"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Directory filter"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All records</option>
          {facilityTab ? (
            <>
              <option value="pending">Review pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </>
          ) : (
            <>
              <option value="nurse">Nurses</option>
              <option value="facility">Facility accounts</option>
              <option value="review">Needs verification</option>
              <option value="suspended">Suspended</option>
            </>
          )}
        </select>
      </div>
      {facilityTab ? (
        <div className="facility-grid">
          {data.facilities
            .filter(
              (f) =>
                f.name.toLowerCase().includes(search.toLowerCase()) &&
                (status === "all" || f.verification_status === status),
            )
            .map((f) => (
              <article className="facility-card" key={f.id}>
                <HeartPulseIcon />
                <h3>{f.name}</h3>
                <p>
                  {f.address}
                  <br />
                  {f.city}, {f.state}
                </p>
                <div className="facility-meta">
                  <span className="badge">{f.verification_status}</span>
                  <span className="badge">
                    {f.subscription_status} subscription
                  </span>
                </div>
                <div className="admin-actions">
                  {(["verified", "pending", "rejected"] as const)
                    .filter((x) => x !== f.verification_status)
                    .map((x) => (
                      <button
                        className="secondary"
                        disabled={busy}
                        key={x}
                        onClick={() =>
                          void action("verify_facility", {
                            facility_id: f.id,
                            status: x,
                          })
                        }
                      >
                        {x === "verified"
                          ? "Verify facility"
                          : x === "pending"
                            ? "Return to review"
                            : "Reject verification"}
                      </button>
                    ))}
                </div>
              </article>
            ))}
        </div>
      ) : (
        data.profiles
          .filter(
            (p) =>
              p.full_name.toLowerCase().includes(search.toLowerCase()) &&
              (status === "all" ||
                status === p.role ||
                (status === "review" && p.role === "nurse" && !p.verified) ||
                (status === "suspended" && p.suspended)),
          )
          .map((p) => {
            const c = data.nurse_credentials.find((c) => c.nurse_id === p.id);
            const details = data.nurse_details.find((n) => n.id === p.id);
            return (
              <article className="member-review" key={p.id}>
                <div className="resource-heading">
                  <div>
                    <strong>{p.full_name}</strong>
                    <p>
                      {p.role} · {p.credential ?? "Credential not submitted"} ·{" "}
                      {p.suspended ? "Suspended" : "Active"}
                    </p>
                  </div>
                  <span className="badge">
                    {p.verified ? "Verified" : "Not verified"}
                  </span>
                </div>
                {p.role === "nurse" && (
                  <>
                    <p>
                      {details?.specialty} · {details?.city} {details?.state} ·{" "}
                      {details?.experience_years ?? 0} years of experience
                    </p>
                    <p>{details?.bio}</p>
                    <p className="license-review">
                      {c
                        ? `License ${c.license_number} · ${c.license_state} · expires ${c.license_expires}`
                        : "No license submitted. Verification cannot proceed."}
                    </p>
                  </>
                )}
                <div className="admin-actions">
                  {p.role === "nurse" && p.credential && (
                    <button
                      className="primary"
                      disabled={busy || !c || p.suspended}
                      onClick={() =>
                        void action("verify_nurse", {
                          user_id: p.id,
                          credential: p.credential,
                          verified: !p.verified,
                        })
                      }
                    >
                      <ShieldCheck size={15} />
                      {p.verified ? "Remove verification" : "Verify credential"}
                    </button>
                  )}
                  {p.role !== "admin" && (
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() =>
                        void action("suspend_user", {
                          user_id: p.id,
                          suspended: !p.suspended,
                        })
                      }
                    >
                      {p.suspended ? "Restore account" : "Suspend account"}
                    </button>
                  )}
                </div>
              </article>
            );
          })
      )}
    </section>
  );
}
function HeartPulseIcon() {
  return (
    <div className="facility-card-icon">
      <ShieldCheck size={25} />
    </div>
  );
}
