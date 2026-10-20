"use client";
import { useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  HeartPulse,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import { currency, hoursBetween, type Role } from "@/lib/domain";
import {
  FACILITY_ID,
  NURSE_ID,
  type DemoShift,
  type DemoCommand,
} from "@/lib/demo/store";
import { useDemo } from "@/lib/demo/use-demo";
import Dialog from "./dialog";
import ShiftForm from "./shift-form";
import {
  Attendance,
  Directory,
  Notifications,
  Preferences,
  Reports,
  Subscription,
} from "./panels";
const date = (
  value: string,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
) => new Date(value).toLocaleDateString("en-US", options);
const time = (value: string) =>
  new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
const navIcons: Record<string, typeof LayoutDashboard> = {
  Overview: LayoutDashboard,
  Shifts: CalendarDays,
  "Find shifts": Search,
  "All shifts": CalendarDays,
  Schedule: CalendarDays,
  Applications: Users,
  "My applications": Users,
  "Nurse network": Users,
  Members: Users,
  Timesheets: Clock,
  Reports: TrendingUp,
  Subscription: CreditCard,
  Facilities: HeartPulse,
};
export default function DemoWorkspace({
  role,
  onRoleChange,
}: {
  role: Role;
  onRoleChange?: (role: Role) => void;
}) {
  const {
    state: s,
    dispatch,
    reset,
    message,
    setMessage,
    storageAvailable,
  } = useDemo(role);
  const [tab, setTab] = useState("Overview");
  const [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [credential, setCredential] = useState("all");
  const [urgent, setUrgent] = useState(false);
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<"post" | "reset" | "help" | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [week, setWeek] = useState(0);
  const [day, setDay] = useState<string | null>(null);
  if (!s)
    return (
      <main className="demo-loading">
        <HeartPulse size={36} />
        <h1>Preparing your workspace…</h1>
        <p>Loading sample shifts and your local demo activity.</p>
      </main>
    );
  const navigate = (next: string) => {
    setTab(next);
    setMobile(false);
    setQuery("");
    setStatus("all");
    setCredential("all");
    setUrgent(false);
    setPage(1);
    setDay(null);
  };
  const switchRole = (next: Role) => {
    if (onRoleChange) {
      onRoleChange(next);
      navigate("Overview");
    } else window.location.assign("/demo/" + next);
  };
  const facility = s.facilities.find((f) => f.id === FACILITY_ID)!;
  const nurse = s.nurses.find((n) => n.id === NURSE_ID)!;
  const displayName =
    role === "facility"
      ? s.settings.displayName
      : role === "nurse"
        ? nurse.name
        : "Jordan Ellis";
  const visible = s.shifts.filter((x) =>
    role === "facility"
      ? x.facilityId === FACILITY_ID
      : role === "nurse"
        ? (x.status === "open" &&
            s.facilities.find((f) => f.id === x.facilityId)?.active) ||
          x.nurseId === NURSE_ID ||
          s.applications.some(
            (a) => a.nurseId === NURSE_ID && a.shiftId === x.id,
          )
        : true,
  );
  const myApplications = s.applications.filter((a) =>
    role === "nurse"
      ? a.nurseId === NURSE_ID
      : role === "facility"
        ? s.shifts.find((x) => x.id === a.shiftId)?.facilityId === FACILITY_ID
        : true,
  );
  const unread = s.notifications.filter(
    (n) => n.role === role && !n.read,
  ).length;
  const nav =
    role === "facility"
      ? [
          "Overview",
          "Shifts",
          "Schedule",
          "Applications",
          "Nurse network",
          "Timesheets",
          "Reports",
          "Subscription",
        ]
      : role === "nurse"
        ? [
            "Overview",
            "Find shifts",
            "Schedule",
            "My applications",
            "Timesheets",
            "Reports",
          ]
        : [
            "Overview",
            "All shifts",
            "Schedule",
            "Members",
            "Facilities",
            "Timesheets",
            "Reports",
          ];
  const selectedShift = s.shifts.find((x) => x.id === selected);
  const filtered = visible
    .filter(
      (x) =>
        (
          x.title +
          " " +
          x.department +
          " " +
          s.facilities.find((f) => f.id === x.facilityId)?.name
        )
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (status === "all" || x.status === status) &&
        (credential === "all" || x.specialty === credential) &&
        (!urgent || x.urgent),
    )
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  const pageSize = 6;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const run = (c: DemoCommand) => dispatch(c);
  const findShift = (id: string) => s.shifts.find((x) => x.id === id)!;
  const exportReport = () => {
    const rows = [
      [
        "Shift",
        "Facility",
        "Credential",
        "Status",
        "Start",
        "End",
        "Hourly rate",
      ],
      ...visible.map((x) => [
        x.title,
        s.facilities.find((f) => f.id === x.facilityId)?.name ?? "",
        x.specialty,
        x.status,
        x.starts_at,
        x.ends_at,
        String(x.hourly_rate),
      ]),
    ];
    const cell = (value: string) =>
      '"' + value.replaceAll('"', '""').replace(/^[=+@-]/, "'$&") + '"';
    const url = URL.createObjectURL(
      new Blob([rows.map((row) => row.map(cell).join(",")).join("\r\n")], {
        type: "text/csv",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "staftify-shift-report.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Demo shift report downloaded.");
  };
  const pending = myApplications.filter((a) => a.status === "pending").length;
  const assigned = visible.filter(
    (x) =>
      x.status === "filled" && (role !== "nurse" || x.nurseId === NURSE_ID),
  );
  const makeShiftCard = (x: DemoShift) => (
    <button
      className={"schedule-event " + (x.status === "filled" ? "booked" : "")}
      key={x.id}
      onClick={() => setSelected(x.id)}
    >
      <span>{time(x.starts_at)}</span>
      <strong>{x.title}</strong>
      <small>
        {currency(x.hourly_rate)}/hr · {x.status}
      </small>
    </button>
  );
  return (
    <div className="app-shell demo-workspace">
      {mobile && (
        <button
          className="nav-overlay"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={"sidebar " + (mobile ? "visible" : "")}>
        <button className="brand" onClick={() => navigate("Overview")}>
          staftify<span>✦</span>
        </button>
        <div className="workspace">
          <div className="workspace-icon">
            <HeartPulse size={22} />
          </div>
          <div>
            <strong>
              {role === "facility"
                ? "Oakwood Medical"
                : role === "nurse"
                  ? "Nurse workspace"
                  : "STAFTIFY Operations"}
            </strong>
            <span>
              {role === "facility"
                ? "Charlotte, North Carolina"
                : role === "nurse"
                  ? "Your career, your schedule"
                  : "Platform administration"}
            </span>
          </div>
          <ChevronDown size={14} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {nav.map((n) => {
            const Icon = navIcons[n];
            return (
              <button
                key={n}
                className={tab === n ? "active" : ""}
                onClick={() => navigate(n)}
                aria-label={n}
                aria-current={tab === n ? "page" : undefined}
              >
                <Icon size={19} />
                {n}
                {(n === "Applications" || n === "My applications") &&
                  pending > 0 && <em>{pending}</em>}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="care-card">
            <Sparkles size={18} />
            <strong> Your demo, your way.</strong>
            <p>Switch portals to follow a shift from posting to timesheet.</p>
            <button onClick={() => setDialog("help")}>
              Explore the demo <ArrowRight size={14} />
            </button>
          </div>
          <button
            className="utility"
            onClick={() => {
              setDialog("help");
              setMobile(false);
            }}
          >
            <LifeBuoy size={18} /> Help & tour
          </button>
          <button className="utility" onClick={() => navigate("Settings")}>
            <Settings size={18} /> Settings
          </button>
          <div className="user">
            <div className="avatar">
              {displayName
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div>
              <strong>{displayName}</strong>
              <span>
                {role === "facility"
                  ? "Facility administrator"
                  : role === "nurse"
                    ? "Registered nurse"
                    : "Platform administrator"}
              </span>
            </div>
            <span className="demo-user-dot" title="Sample account" />
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-toggle"
              aria-label="Toggle navigation"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={21} />
            </button>
            <span>{role[0].toUpperCase() + role.slice(1)} portal</span>
            <ChevronRight size={14} />
            <strong>{tab}</strong>
          </div>
          <div className="top-actions">
            <span className="today">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </span>
            <button
              className="notification-button"
              aria-label={`Notifications${unread ? " (" + unread + " unread)" : ""}`}
              onClick={() => navigate("Notifications")}
            >
              <Bell size={20} />
              {unread > 0 && <i />}
            </button>
            <div className="avatar small">
              {displayName
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </div>
          </div>
        </header>
        <main className="main">
          <div className="demo-banner">
            <span>
              <span className="live-dot" />
              INTERACTIVE DEMO
            </span>
            <p>
              {storageAvailable
                ? "Sample data saved in this browser. No real bookings or charges."
                : "Browser storage is unavailable. Changes last until this page is closed."}
            </p>
            <div aria-label="Switch portal">
              {(["facility", "nurse", "admin"] as const).map((r) => (
                <button
                  key={r}
                  className={role === r ? "selected" : ""}
                  aria-pressed={role === r}
                  onClick={() => switchRole(r)}
                >
                  {r[0].toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR STAFFING, SIMPLIFIED</div>
              <h1>
                {tab === "Overview"
                  ? `Good morning, ${displayName.split(" ")[0]}`
                  : tab}
                {tab === "Overview" && <span className="greeting"> ☀</span>}
              </h1>
              <p>
                {tab === "Overview"
                  ? role === "nurse"
                    ? "Find your next opportunity. Make a difference on your terms."
                    : role === "admin"
                      ? "The people and places powering better care."
                      : "Here's what's happening at your facility today."
                  : "Connected sample workflows. Every change stays in your browser."}
              </p>
            </div>
            <div className="heading-actions">
              <button className="secondary" onClick={exportReport}>
                <ArrowDownToLine size={16} />
                Export report
              </button>
              <button
                className="primary"
                onClick={() =>
                  role === "facility"
                    ? setDialog("post")
                    : navigate(role === "nurse" ? "Find shifts" : "Members")
                }
              >
                <Plus size={17} />
                {role === "facility"
                  ? "Post a shift"
                  : role === "nurse"
                    ? "Find a shift"
                    : "Manage members"}
              </button>
            </div>
          </div>
          {tab === "Overview" && (
            <>
              <section className="hero">
                <div>
                  <div className="hero-label">
                    <span />
                    BUILT FOR BETTER CARE
                  </div>
                  <h2>
                    {role === "nurse" ? (
                      <>
                        Your skills. Your schedule.
                        <br />
                        Your next chapter.
                      </>
                    ) : (
                      <>
                        The right people.
                        <br />
                        Right when you need them.
                      </>
                    )}
                  </h2>
                  <p>
                    {role === "nurse"
                      ? "Find flexible opportunities at facilities that value you."
                      : "Connect with exceptional nurses and build a team you can count on."}
                  </p>
                  <button
                    onClick={() =>
                      navigate(
                        role === "facility"
                          ? "Nurse network"
                          : role === "nurse"
                            ? "Find shifts"
                            : "Members",
                      )
                    }
                  >
                    {role === "facility"
                      ? "Meet your nurse network"
                      : role === "nurse"
                        ? "Explore available shifts"
                        : "Meet your care community"}
                    <ArrowRight size={16} />
                  </button>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="orbit one" />
                  <div className="orbit two" />
                  <div className="medical-plus">+</div>
                  <div className="floating-chip top">
                    <div className="chip-icon">
                      <ShieldCheck size={21} />
                    </div>
                    <div>
                      <strong>People-first staffing</strong>
                      <span>Better together, always</span>
                    </div>
                  </div>
                  <div className="floating-chip bottom">
                    <div className="avatar-stack">
                      <b>SM</b>
                      <b>EC</b>
                      <b>JW</b>
                    </div>
                    <div>
                      <strong>A network that cares</strong>
                      <span>Ready to make a difference</span>
                    </div>
                    <span className="chip-check">
                      <Check size={14} />
                    </span>
                  </div>
                </div>
              </section>
              <section className="stats">
                {[
                  {
                    label:
                      role === "admin" ? "Active facilities" : "Open shifts",
                    value:
                      role === "admin"
                        ? s.facilities.filter((f) => f.active).length
                        : visible.filter((x) => x.status === "open").length,
                    icon: CalendarDays,
                    color: "green",
                    caption:
                      role === "admin"
                        ? "Across the demo platform"
                        : "Ready for the right match",
                  },
                  {
                    label:
                      role === "admin"
                        ? "Verified nurses"
                        : "Pending applications",
                    value:
                      role === "admin"
                        ? s.nurses.filter((n) => n.verified).length
                        : pending,
                    icon: Users,
                    color: "blue",
                    caption:
                      role === "admin"
                        ? "Credentials reviewed in demo"
                        : "Your next great connection",
                  },
                  {
                    label: "Scheduled hours",
                    value: assigned.reduce(
                      (total, x) =>
                        total + hoursBetween(x.starts_at, x.ends_at),
                      0,
                    ),
                    icon: Clock,
                    color: "purple",
                    caption: "Across confirmed sample shifts",
                  },
                  {
                    label:
                      role === "nurse" ? "Average hourly rate" : "Fill rate",
                    value:
                      role === "nurse"
                        ? currency(
                            visible
                              .filter((x) => x.status === "open")
                              .reduce((sum, x) => sum + x.hourly_rate, 0) /
                              (visible.filter((x) => x.status === "open")
                                .length || 1),
                          )
                        : Math.round(
                            (visible.filter((x) =>
                              ["filled", "completed"].includes(x.status),
                            ).length /
                              (visible.filter((x) => x.status !== "cancelled")
                                .length || 1)) *
                              100,
                          ) + "%",
                    icon: Activity,
                    color: "orange",
                    caption: "Calculated from your demo data",
                  },
                ].map((stat) => (
                  <article className="stat" key={stat.label}>
                    <div>
                      <span>{stat.label}</span>
                      <div className={"stat-icon " + stat.color}>
                        <stat.icon size={19} />
                      </div>
                    </div>
                    <strong>{stat.value}</strong>
                    <small>
                      <span className="tiny-dot" />
                      {stat.caption}
                    </small>
                  </article>
                ))}
              </section>
            </>
          )}
          {["Overview", "Shifts", "Find shifts", "All shifts"].includes(
            tab,
          ) && (
            <div className="content-grid">
              <section className="panel shift-panel">
                <div className="panel-heading">
                  <div>
                    <h2>
                      {tab === "Overview"
                        ? "Shift overview"
                        : "Shift marketplace"}{" "}
                      <span className="count">{visible.length}</span>
                    </h2>
                    <p>A great shift starts with a great match.</p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => navigate("Schedule")}
                  >
                    View schedule
                    <ArrowRight size={14} />
                  </button>
                </div>
                <div className="table-tools">
                  <div className="tabs">
                    {["all", "open", "filled"].map((f) => (
                      <button
                        key={f}
                        className={status === f ? "selected" : ""}
                        onClick={() => {
                          setStatus(f);
                          setPage(1);
                        }}
                      >
                        {f === "all"
                          ? "All shifts"
                          : f === "open"
                            ? "Open"
                            : "Filled"}
                      </button>
                    ))}
                  </div>
                  <label className="search">
                    <Search size={15} />
                    <input
                      aria-label="Search shifts"
                      placeholder="Search shifts…"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setPage(1);
                      }}
                    />
                  </label>
                </div>
                <div className="demo-filter-row">
                  <label>
                    Credential
                    <select
                      aria-label="Filter credential"
                      value={credential}
                      onChange={(e) => {
                        setCredential(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="all">All credentials</option>
                      <option>RN</option>
                      <option>LPN</option>
                      <option>CNA</option>
                    </select>
                  </label>
                  <button
                    className={"urgent-filter " + (urgent ? "on" : "")}
                    aria-pressed={urgent}
                    onClick={() => {
                      setUrgent(!urgent);
                      setPage(1);
                    }}
                  >
                    <Zap size={13} />
                    Urgent only
                  </button>
                </div>
                <div className="shift-table">
                  <div className="table-header">
                    <span>SHIFT DETAILS</span>
                    <span>DATE & TIME</span>
                    <span>RATE</span>
                    <span>STATUS</span>
                    <span />
                  </div>
                  {filtered
                    .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                    .map((x) => (
                      <div className="shift-row" key={x.id}>
                        <div className="shift-title">
                          <div
                            className={"role-icon " + x.specialty.toLowerCase()}
                          >
                            <HeartPulse size={19} />
                          </div>
                          <div>
                            <button
                              className="shift-name"
                              onClick={() => setSelected(x.id)}
                            >
                              {x.title}
                            </button>
                            <small>
                              {role === "facility"
                                ? x.department
                                : s.facilities.find(
                                    (f) => f.id === x.facilityId,
                                  )?.name}
                              {x.urgent && (
                                <em>
                                  <Zap size={10} />
                                  Urgent
                                </em>
                              )}
                            </small>
                          </div>
                        </div>
                        <div className="shift-date">
                          <strong>{date(x.starts_at)}</strong>
                          <small>
                            {time(x.starts_at)} – {time(x.ends_at)}
                          </small>
                        </div>
                        <div className="rate">
                          <strong>
                            {currency(x.hourly_rate)}
                            <small>/hr</small>
                          </strong>
                          <small>
                            {hoursBetween(x.starts_at, x.ends_at)} hour shift
                          </small>
                        </div>
                        <span className={"badge " + x.status}>
                          <span />
                          {x.status}
                        </span>
                        <button
                          aria-label={"View " + x.title}
                          className="row-action"
                          onClick={() => setSelected(x.id)}
                        >
                          <ChevronRight size={17} />
                        </button>
                      </div>
                    ))}
                  {!filtered.length && (
                    <div className="empty">
                      <Search size={25} />
                      <p>
                        No matching shifts. Try another search or clear your
                        filters.
                      </p>
                      <button
                        className="secondary"
                        onClick={() => {
                          setQuery("");
                          setCredential("all");
                          setUrgent(false);
                          setStatus("all");
                        }}
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </div>
                <div className="table-footer">
                  <span>
                    Showing{" "}
                    {filtered.length ? (currentPage - 1) * pageSize + 1 : 0}–
                    {Math.min(currentPage * pageSize, filtered.length)} of{" "}
                    {filtered.length} shifts
                  </span>
                  <div>
                    <button
                      aria-label="Previous page"
                      disabled={currentPage === 1}
                      onClick={() => setPage(currentPage - 1)}
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <span className="page-number">
                      {currentPage} / {pageCount}
                    </span>
                    <button
                      aria-label="Next page"
                      disabled={currentPage === pageCount}
                      onClick={() => setPage(currentPage + 1)}
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              </section>
              <aside className="right-column">
                <section className="panel quick-panel">
                  <h2>Quick actions</h2>
                  {[
                    {
                      label:
                        role === "facility"
                          ? "Post a new shift"
                          : role === "nurse"
                            ? "Browse available shifts"
                            : "Review credentials",
                      sub: "Your next great match starts here",
                      icon: Plus,
                      color: "green",
                      click: () =>
                        role === "facility"
                          ? setDialog("post")
                          : navigate(
                              role === "nurse" ? "Find shifts" : "Members",
                            ),
                    },
                    {
                      label:
                        role === "facility"
                          ? "Review applications"
                          : role === "nurse"
                            ? "My applications"
                            : "Manage facilities",
                      sub:
                        role === "admin"
                          ? "Keep your care network growing"
                          : pending +
                            " pending application" +
                            (pending === 1 ? "" : "s"),
                      icon: Users,
                      color: "orange",
                      click: () =>
                        navigate(
                          role === "facility"
                            ? "Applications"
                            : role === "nurse"
                              ? "My applications"
                              : "Facilities",
                        ),
                    },
                    {
                      label: "Review timesheets",
                      sub: "Keep every hour accounted for",
                      icon: Clock,
                      color: "blue",
                      click: () => navigate("Timesheets"),
                    },
                  ].map((a) => (
                    <button key={a.label} onClick={a.click}>
                      <div className={"quick-icon " + a.color}>
                        <a.icon size={19} />
                      </div>
                      <div>
                        <strong>{a.label}</strong>
                        <small>{a.sub}</small>
                      </div>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                </section>
                <section className="panel network-panel">
                  <div className="panel-heading">
                    <h2>
                      {role === "nurse"
                        ? "On your schedule"
                        : "Your priority nurses"}
                    </h2>
                    <Users size={17} />
                  </div>
                  <p>
                    {role === "nurse"
                      ? "Your next opportunity to make a difference."
                      : "Familiar faces. Exceptional care."}
                  </p>
                  {role === "nurse"
                    ? assigned.slice(0, 3).map((x) => (
                        <button
                          className="mini-scheduled"
                          key={x.id}
                          onClick={() => setSelected(x.id)}
                        >
                          <CalendarDays size={19} />
                          <div>
                            <strong>{x.department}</strong>
                            <small>
                              {date(x.starts_at)} · {time(x.starts_at)}
                            </small>
                          </div>
                          <ChevronRight size={14} />
                        </button>
                      ))
                    : s.nurses
                        .filter((n) => s.priority.includes(n.id))
                        .slice(0, 3)
                        .map((n) => (
                          <div className="nurse" key={n.id}>
                            <div className="avatar">{n.initials}</div>
                            <div>
                              <strong>{n.name}</strong>
                              <small>
                                {n.credential} · {n.specialty}
                              </small>
                            </div>
                            <Star size={12} className="priority-star" />
                          </div>
                        ))}
                  <button
                    className="network-link"
                    onClick={() =>
                      navigate(
                        role === "facility"
                          ? "Nurse network"
                          : role === "nurse"
                            ? "Schedule"
                            : "Members",
                      )
                    }
                  >
                    {role === "nurse"
                      ? "View my schedule"
                      : "View nurse network"}
                    <ArrowRight size={14} />
                  </button>
                </section>
                <div className="care-note">
                  <ShieldCheck size={18} />
                  <p>
                    Focused on care.
                    <br />
                    <strong>Built around people.</strong>
                  </p>
                </div>
              </aside>
            </div>
          )}
          {tab === "Schedule" && (
            <section className="panel schedule-panel">
              <div className="panel-heading">
                <div>
                  <h2>
                    {role === "nurse" ? "My schedule" : "Staffing calendar"}
                  </h2>
                  <p>
                    {role === "nurse"
                      ? "Your confirmed shifts, all in one place."
                      : "Open and assigned shifts across your workspace."}
                  </p>
                </div>
                <div className="calendar-controls">
                  <button
                    className="secondary"
                    aria-label="Previous week"
                    onClick={() => {
                      setWeek(week - 1);
                      setDay(null);
                    }}
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    className="secondary"
                    onClick={() => {
                      setWeek(0);
                      setDay(null);
                    }}
                  >
                    Today
                  </button>
                  <button
                    className="secondary"
                    aria-label="Next week"
                    onClick={() => {
                      setWeek(week + 1);
                      setDay(null);
                    }}
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
              <div className="week-grid">
                {Array.from({ length: 7 }, (_, i) => {
                  const d = new Date();
                  d.setDate(
                    d.getDate() - ((d.getDay() + 6) % 7) + week * 7 + i,
                  );
                  d.setHours(0, 0, 0, 0);
                  const key = d.toDateString();
                  const items = visible.filter(
                    (x) =>
                      new Date(x.starts_at).toDateString() === key &&
                      x.status !== "cancelled" &&
                      (role !== "nurse" || x.nurseId === NURSE_ID),
                  );
                  return (
                    <div
                      className={
                        "week-day " + (day === key ? "day-selected" : "")
                      }
                      key={key}
                    >
                      <button
                        className="day-heading"
                        onClick={() => setDay(day === key ? null : key)}
                      >
                        <span>
                          {date(d.toISOString(), { weekday: "short" })}
                        </span>
                        <strong
                          className={
                            key === new Date().toDateString() ? "is-today" : ""
                          }
                        >
                          {d.getDate()}
                        </strong>
                        <small>
                          {date(d.toISOString(), { month: "short" })}
                        </small>
                      </button>
                      {items.map(makeShiftCard)}
                      {items.length === 0 && (
                        <span className="free-day">No shifts</span>
                      )}
                    </div>
                  );
                })}
              </div>
              {day && (
                <div className="selected-day">
                  <h3>{day}</h3>
                  {visible
                    .filter(
                      (x) =>
                        new Date(x.starts_at).toDateString() === day &&
                        x.status !== "cancelled" &&
                        (role !== "nurse" || x.nurseId === NURSE_ID),
                    )
                    .map(makeShiftCard)}
                  {!visible.some(
                    (x) =>
                      new Date(x.starts_at).toDateString() === day &&
                      x.status !== "cancelled" &&
                      (role !== "nurse" || x.nurseId === NURSE_ID),
                  ) && <p>No shifts on this date.</p>}
                </div>
              )}
              <div className="calendar-legend">
                <span>
                  <i />
                  Open shift
                </span>
                <span>
                  <i />
                  Confirmed / completed
                </span>
                <p>Times are shown in your device’s local timezone.</p>
              </div>
            </section>
          )}
          {["Applications", "My applications"].includes(tab) && (
            <section className="panel resource-panel">
              <div className="resource-heading">
                <div>
                  <h2>
                    {role === "nurse"
                      ? "Your applications"
                      : "Review applications"}
                  </h2>
                  <p>
                    Follow every connection from application to confirmation.
                  </p>
                </div>
                <select
                  aria-label="Application status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="all">All applications</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="declined">Declined</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
              </div>
              {myApplications
                .filter((a) => status === "all" || a.status === status)
                .map((a) => {
                  const x = findShift(a.shiftId);
                  const n = s.nurses.find((n) => n.id === a.nurseId)!;
                  return (
                    <article className="application-card" key={a.id}>
                      <div className="avatar">{n.initials}</div>
                      <div className="application-main">
                        <strong>{role === "nurse" ? x.title : n.name}</strong>
                        <p>
                          {role === "nurse"
                            ? s.facilities.find((f) => f.id === x.facilityId)
                                ?.name
                            : x.title}{" "}
                          · {n.credential}
                        </p>
                        <small>
                          {date(x.starts_at)} · {time(x.starts_at)} ·{" "}
                          {currency(x.hourly_rate)}/hr
                        </small>
                      </div>
                      <span
                        className={
                          "badge " +
                          (a.status === "accepted" ? "filled" : a.status)
                        }
                      >
                        {a.status}
                      </span>
                      <div className="application-actions">
                        <button
                          className="secondary"
                          onClick={() => setSelected(x.id)}
                        >
                          View shift
                        </button>
                        {a.status === "pending" &&
                          (role === "facility" ? (
                            <>
                              <button
                                className="secondary"
                                onClick={() =>
                                  run({ type: "decline", applicationId: a.id })
                                }
                              >
                                Decline
                              </button>
                              <button
                                className="primary"
                                onClick={() =>
                                  run({ type: "accept", applicationId: a.id })
                                }
                              >
                                Accept application
                              </button>
                            </>
                          ) : (
                            <button
                              className="secondary"
                              onClick={() =>
                                run({ type: "withdraw", applicationId: a.id })
                              }
                            >
                              Withdraw
                            </button>
                          ))}
                      </div>
                    </article>
                  );
                })}
              {!myApplications.filter(
                (a) => status === "all" || a.status === status,
              ).length && (
                <div className="empty">
                  <Users size={28} />
                  <h3>No applications here yet</h3>
                  <p>
                    {role === "nurse"
                      ? "Find a shift that fits your skills and schedule."
                      : "New nurse applications will appear here."}
                  </p>
                  <button
                    className="secondary"
                    onClick={() =>
                      navigate(role === "nurse" ? "Find shifts" : "Shifts")
                    }
                  >
                    Explore shifts
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </section>
          )}
          {["Nurse network", "Members", "Facilities"].includes(tab) && (
            <Directory
              key={tab}
              state={s}
              role={role}
              tab={tab}
              dispatch={run}
            />
          )}
          {tab === "Timesheets" && (
            <Attendance state={s} role={role} dispatch={run} />
          )}
          {tab === "Notifications" && (
            <Notifications state={s} role={role} dispatch={run} />
          )}
          {tab === "Reports" && (
            <Reports
              state={s}
              shifts={visible}
              role={role}
              onExport={exportReport}
            />
          )}
          {tab === "Subscription" && <Subscription state={s} dispatch={run} />}
          {tab === "Settings" && (
            <Preferences
              state={s}
              dispatch={run}
              onReset={() => setDialog("reset")}
            />
          )}
          <footer className="footer">
            <span>© {new Date().getFullYear()} STAFTIFY · Demo workspace</span>
            <button onClick={() => setDialog("help")}>
              Connecting people. Elevating care. <HeartPulse size={13} />
            </button>
          </footer>
        </main>
      </div>
      {message && !selectedShift && !dialog && (
        <div className="toast" role="status">
          <Check size={19} />
          <span>{message}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setMessage("")}
          >
            <X size={17} />
          </button>
        </div>
      )}
      {dialog === "post" && (
        <Dialog title="Post a shift" onClose={() => setDialog(null)}>
          <ShiftForm dispatch={run} onClose={() => setDialog(null)} />
        </Dialog>
      )}
      {dialog === "reset" && (
        <Dialog title="Reset demo workspace?" onClose={() => setDialog(null)}>
          <p>
            This resets sample shifts, applications, attendance, and preferences
            in this browser. It does not affect GitHub or any external service.
          </p>
          <div className="heading-actions">
            <button className="secondary" onClick={() => setDialog(null)}>
              Keep my changes
            </button>
            <button
              className="primary"
              onClick={() => {
                reset();
                setDialog(null);
              }}
            >
              Reset sample data
            </button>
          </div>
        </Dialog>
      )}
      {dialog === "help" && (
        <Dialog
          title="A little tour of STAFTIFY"
          onClose={() => setDialog(null)}
        >
          <p>
            Everything here is a local simulation. No accounts, payments,
            messages, or database connections are used.
          </p>
          <ol className="tour-steps">
            <li>
              <strong>Facility</strong> — post a shift, review an application,
              and accept a nurse.
            </li>
            <li>
              <strong>Nurse</strong> — browse opportunities, apply, and see
              confirmed shifts on your schedule.
            </li>
            <li>
              <strong>Attendance</strong> — generate a code in Facility →
              Timesheets, switch to Nurse, and enter it. Return to Facility to
              generate a clock-out code and approve the completed timesheet.
            </li>
            <li>
              <strong>Admin</strong> — review sample credentials, add
              nurses/facilities, and explore platform reports.
            </li>
          </ol>
          <p className="notice">
            Changes persist in this browser and are shared across the portal
            tabs. Demo attendance intentionally allows future sample shifts so
            you can try the complete flow now.
          </p>
          <button className="primary" onClick={() => setDialog(null)}>
            Start exploring
            <ArrowRight size={15} />
          </button>
        </Dialog>
      )}
      {selectedShift && (
        <Dialog title={selectedShift.title} onClose={() => setSelected(null)}>
          <div className="shift-detail-meta">
            <span className={"badge " + selectedShift.status}>
              {selectedShift.status}
            </span>
            {selectedShift.urgent && (
              <span className="urgent-label">
                <Zap size={13} />
                Urgent coverage
              </span>
            )}
          </div>
          <p className="detail-facility">
            <MapPin size={16} />
            {
              s.facilities.find((f) => f.id === selectedShift.facilityId)?.name
            }{" "}
            ·{" "}
            {s.facilities.find((f) => f.id === selectedShift.facilityId)?.city}
          </p>
          <div className="detail-grid">
            <div>
              <small>DATE</small>
              <strong>
                {date(selectedShift.starts_at, {
                  weekday: "short",
                  month: "long",
                  day: "numeric",
                })}
              </strong>
            </div>
            <div>
              <small>SHIFT TIME</small>
              <strong>
                {time(selectedShift.starts_at)} – {time(selectedShift.ends_at)}
              </strong>
            </div>
            <div>
              <small>HOURLY RATE</small>
              <strong>{currency(selectedShift.hourly_rate)}/hr</strong>
            </div>
            <div>
              <small>ESTIMATED SHIFT PAY</small>
              <strong>
                {currency(
                  hoursBetween(selectedShift.starts_at, selectedShift.ends_at) *
                    selectedShift.hourly_rate,
                )}
              </strong>
            </div>
          </div>
          <h3>About this shift</h3>
          <p>{selectedShift.notes || "No additional notes for this shift."}</p>
          <p>
            Credential: <strong>{selectedShift.specialty}</strong> · Department:{" "}
            {selectedShift.department}
          </p>
          {selectedShift.nurseId && (
            <p>
              Assigned nurse:{" "}
              <strong>
                {s.nurses.find((n) => n.id === selectedShift.nurseId)?.name}
              </strong>
            </p>
          )}
          <p className="notice">
            The facility pays the nurse directly. These are sample shifts; no
            real booking or payment occurs.
          </p>
          {message && (
            <p className="dialog-feedback" role="status">
              {message}
            </p>
          )}
          <div className="heading-actions detail-actions">
            {role === "nurse" &&
              selectedShift.status === "open" &&
              (s.applications.some(
                (a) =>
                  a.shiftId === selectedShift.id &&
                  a.nurseId === NURSE_ID &&
                  a.status !== "withdrawn",
              ) ? (
                <span className="badge filled">
                  <Check size={13} />
                  Application sent
                </span>
              ) : (
                <button
                  className="primary"
                  disabled={
                    !nurse.verified ||
                    selectedShift.specialty !== nurse.credential
                  }
                  onClick={() => {
                    if (run({ type: "apply", shiftId: selectedShift.id }))
                      setSelected(null);
                  }}
                >
                  Apply for shift
                  <ArrowRight size={15} />
                </button>
              ))}
            {role === "nurse" &&
              selectedShift.specialty !== nurse.credential && (
                <p className="qualification-note">
                  This shift requires a {selectedShift.specialty} credential.
                  Sarah’s demo credential is RN.
                </p>
              )}
            {role === "facility" &&
              selectedShift.facilityId === FACILITY_ID &&
              selectedShift.status === "open" && (
                <>
                  <button
                    className="primary"
                    onClick={() =>
                      run({ type: "blast", shiftId: selectedShift.id })
                    }
                  >
                    <Zap size={16} />
                    Send urgent blast
                  </button>
                  <button
                    className="secondary"
                    onClick={() => {
                      navigate("Applications");
                      setSelected(null);
                    }}
                  >
                    Review applicants (
                    {
                      s.applications.filter(
                        (a) =>
                          a.shiftId === selectedShift.id &&
                          a.status === "pending",
                      ).length
                    }
                    )
                  </button>
                  <button
                    className="danger-link"
                    onClick={() => {
                      if (run({ type: "cancel", shiftId: selectedShift.id }))
                        setSelected(null);
                    }}
                  >
                    Cancel shift
                  </button>
                </>
              )}
            {selectedShift.status === "filled" && (
              <button
                className="primary"
                onClick={() => {
                  navigate("Timesheets");
                  setSelected(null);
                }}
              >
                View attendance
                <Clock size={16} />
              </button>
            )}
            <button className="secondary" onClick={() => setSelected(null)}>
              Close details
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
