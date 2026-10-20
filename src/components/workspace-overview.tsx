import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { currency } from "@/lib/domain";
import type { WorkspaceData } from "@/lib/types";
export default function WorkspaceOverview({
  data,
  onNavigate,
  onShift,
}: {
  data: WorkspaceData;
  onNavigate: (tab: string) => void;
  onShift: (id: string) => void;
}) {
  const role = data.profile.role;
  const pending = data.applications.filter((a) => a.status === "pending");
  const unapproved = data.timesheets.filter(
    (t) => t.clock_out && !t.approved_at,
  );
  const drafts = data.shifts.filter((s) => s.status === "draft");
  const unverified = data.profiles.filter(
    (p) => p.role === "nurse" && !p.verified && !p.suspended,
  );
  const facilities = data.facilities.filter(
    (f) => f.verification_status === "pending",
  );
  const next = data.shifts
    .filter(
      (s) =>
        s.status === "filled" &&
        Date.parse(s.ends_at) > Date.now() &&
        (role !== "nurse" || s.assigned_nurse_id === data.profile.id),
    )
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))[0];
  const tasks =
    role === "facility"
      ? [
          {
            title: "Applications to review",
            detail: "Meet the professionals ready to join your team.",
            count: pending.length,
            tab: "Applications",
            icon: Users,
          },
          {
            title: "Timesheets awaiting approval",
            detail: "Review recorded hours and keep your team moving.",
            count: unapproved.length,
            tab: "Timesheets",
            icon: Clock,
          },
          {
            title: "Draft shifts to finish",
            detail: "Check the details before publishing.",
            count: drafts.length,
            tab: "Shifts",
            icon: CalendarDays,
          },
        ]
      : role === "nurse"
        ? [
            {
              title: "Applications in progress",
              detail: "Follow the status of your next opportunity.",
              count: pending.length,
              tab: "My applications",
              icon: Users,
            },
            {
              title: "Your professional profile",
              detail: data.profile.verified
                ? "Your credential is marked verified. Keep your license current."
                : "Complete your license details for review.",
              count: data.profile.verified ? null : 1,
              tab: "Profile",
              icon: ShieldCheck,
            },
            {
              title: "Available urgent shifts",
              detail: "Find facilities that need coverage sooner.",
              count: data.shifts.filter((s) => s.status === "open" && s.urgent)
                .length,
              tab: "Find shifts",
              icon: Zap,
            },
          ]
        : [
            {
              title: "Facilities awaiting review",
              detail: "Check organization details before verification.",
              count: facilities.length,
              tab: "Facilities",
              icon: ShieldCheck,
            },
            {
              title: "Credentials awaiting review",
              detail: "Review current licenses against authoritative sources.",
              count: unverified.length,
              tab: "Members",
              icon: Users,
            },
            {
              title: "Recorded timesheets",
              detail: "View completed and in-progress attendance.",
              count: data.timesheets.length,
              tab: "Timesheets",
              icon: Clock,
            },
          ];
  return (
    <section className="overview-columns" aria-label="Workspace summary">
      <article className="panel attention-panel">
        <div className="summary-heading">
          <div>
            <span className="eyebrow">KEEP THINGS MOVING</span>
            <h2>
              {role === "admin"
                ? "Platform review queue"
                : role === "nurse"
                  ? "Your next steps"
                  : "Needs your attention"}
            </h2>
          </div>
          <span className="summary-icon">
            <Check size={17} />
          </span>
        </div>
        {tasks.map((t) => (
          <button
            key={t.title}
            className="attention-row"
            onClick={() => onNavigate(t.tab)}
          >
            <span className="attention-icon">
              <t.icon size={18} />
            </span>
            <span>
              <strong>{t.title}</strong>
              <small>{t.detail}</small>
            </span>
            {t.count !== null && <em>{t.count}</em>}
            <ArrowRight size={15} />
          </button>
        ))}
      </article>
      <article className="panel next-shift-panel">
        <div className="summary-heading">
          <div>
            <span className="eyebrow">A LITTLE MORE CLARITY</span>
            <h2>
              {role === "admin"
                ? "Care community"
                : role === "nurse"
                  ? "Your next confirmed shift"
                  : "Next assigned shift"}
            </h2>
          </div>
          <CalendarDays size={19} />
        </div>
        {role === "admin" ? (
          <>
            <div className="community-counts">
              <div>
                <strong>{data.facilities.length}</strong>
                <span>facilities</span>
              </div>
              <div>
                <strong>
                  {
                    data.profiles.filter(
                      (p) => p.role === "nurse" && p.verified,
                    ).length
                  }
                </strong>
                <span>verified nurses</span>
              </div>
            </div>
            <p className="summary-caption">
              A clear view of the people and places behind great care.
            </p>
            <button
              className="summary-link"
              onClick={() => onNavigate("Facilities")}
            >
              Review your facilities
              <ArrowRight size={15} />
            </button>
          </>
        ) : next ? (
          <>
            <div className="next-shift-date">
              <span>
                {new Date(next.starts_at).toLocaleDateString("en-US", {
                  month: "short",
                })}
              </span>
              <strong>{new Date(next.starts_at).getDate()}</strong>
              <small>
                {new Date(next.starts_at).toLocaleDateString("en-US", {
                  weekday: "short",
                })}
              </small>
            </div>
            <h3>{next.title}</h3>
            <p>
              {data.facilities.find((f) => f.id === next.facility_id)?.name}
            </p>
            <div className="next-shift-meta">
              <span>
                <Clock size={13} />
                {new Date(next.starts_at).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
              <span>{currency(next.hourly_rate)}/hr</span>
            </div>
            <button className="summary-link" onClick={() => onShift(next.id)}>
              View shift details
              <ArrowRight size={15} />
            </button>
          </>
        ) : (
          <>
            <p className="summary-caption">
              Your confirmed shifts will appear here once a booking is approved.
            </p>
            <button
              className="summary-link"
              onClick={() =>
                onNavigate(role === "nurse" ? "Find shifts" : "Schedule")
              }
            >
              Explore your schedule
              <ArrowRight size={15} />
            </button>
          </>
        )}
      </article>
    </section>
  );
}
