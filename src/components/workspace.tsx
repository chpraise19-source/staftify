"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { currency, hoursBetween } from "@/lib/domain";
import type { Profile, Shift, WorkspaceData } from "@/lib/types";
import Dialog from "./dialog";
import {
  readLocalWorkspace,
  localRequest,
  resetLocalWorkspace,
  readLocalHistory,
  LOCAL_CHANGE,
  LOCAL_CHANNEL,
} from "@/lib/development/storage";
import type { LocalState } from "@/lib/development/simulation";
import ShiftEditor from "./shift-editor";
import WorkspaceOverview from "./workspace-overview";
import {
  ProfessionalProfile,
  AdminPanel,
  AttendancePanel,
} from "./workspace-panels";
const date = (v: string) =>
  new Date(v).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
const time = (v: string) =>
  new Date(v).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
const icons: Record<string, typeof LayoutDashboard> = {
  Overview: LayoutDashboard,
  Shifts: CalendarDays,
  "Find shifts": Search,
  Schedule: CalendarDays,
  Applications: Users,
  "My applications": Users,
  "Nurse network": Users,
  Timesheets: Clock,
  Reports: TrendingUp,
  Notifications: Bell,
  Profile: ShieldCheck,
  Members: Users,
  Facilities: HeartPulse,
  Subscription: CreditCard,
};
export default function Workspace({
  profile: initialProfile,
  previewData,
}: {
  profile: Profile;
  previewData?: WorkspaceData;
}) {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("Overview");
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [credential, setCredential] = useState("all");
  const [urgent, setUrgent] = useState(false);
  const [editor, setEditor] = useState<Shift | "new" | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [week, setWeek] = useState(0);
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);
  const [history, setHistory] = useState<LocalState["history"] | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [updated, setUpdated] = useState<Date | null>(null);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (previewData) {
        try {
          setData(await readLocalWorkspace(initialProfile.role));
          setUpdated(new Date());
          setError("");
        } catch (e) {
          setError(
            e instanceof Error ? e.message : "Unable to load local test data.",
          );
        } finally {
          setLoading(false);
        }
        return;
      }
      try {
        const r = await fetch("/api/workspace", { cache: "no-store", signal });
        const d = await r.json();
        if (!r.ok) {
          if (r.status === 401) {
            window.location.assign("/login");
            return;
          }
          throw new Error(d.error);
        }
        setData(d);
        setUpdated(new Date());
        setError("");
      } catch (e) {
        if (signal?.aborted) return;
        setError(
          e instanceof Error ? e.message : "Workspace could not be loaded.",
        );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [previewData, initialProfile.role],
  );
  useEffect(() => {
    if (previewData) {
      void load();
      const refresh = () => void load();
      const channel =
        typeof BroadcastChannel !== "undefined"
          ? new BroadcastChannel(LOCAL_CHANNEL)
          : null;
      if (channel) channel.onmessage = refresh;
      window.addEventListener(LOCAL_CHANGE, refresh);
      window.addEventListener("focus", refresh);
      return () => {
        channel?.close();
        window.removeEventListener(LOCAL_CHANGE, refresh);
        window.removeEventListener("focus", refresh);
      };
    }
    const c = new AbortController();
    void load(c.signal);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load(c.signal);
    }, 30000);
    return () => {
      c.abort();
      clearInterval(timer);
    };
  }, [load, previewData]);
  const request = async (
    url: string,
    method: string,
    body: unknown,
    message: string,
  ) => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      if (previewData) {
        if (url === "/api/billing") {
          setBillingOpen(true);
          return { localBilling: true };
        }
        const response = await localRequest(
          initialProfile.role,
          url,
          method,
          body as Record<string, unknown>,
        );
        await load();
        setSuccess("Simulated · " + message + " Saved in this browser only.");
        return response;
      }
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setSuccess(message);
      await load();
      return d;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
      return null;
    } finally {
      setBusy(false);
    }
  };
  const action = async (
    action: string,
    payload: Record<string, unknown> = {},
  ) =>
    request("/api/actions", "POST", { action, ...payload }, "Changes saved.");
  const navigate = (next: string) => {
    setTab(next);
    const url = new URL(window.location.href);
    url.hash = encodeURIComponent(next);
    if (url.href !== window.location.href)
      window.history.pushState(null, "", url);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setMobile(false);
    setSearch("");
    setFilter("all");
    setCredential("all");
    setUrgent(false);
    setPage(1);
    setSuccess("");
    setError("");
  };
  const profile = data?.profile ?? initialProfile;
  const role = profile.role;
  const facilities = data?.facilities ?? [];
  const shifts = data?.shifts ?? [];
  const profiles = data?.profiles ?? [];
  const facility = facilities.find((f) => f.id === profile.facility_id);
  const applications = data?.applications ?? [];
  const notifications = data?.notifications ?? [];
  const unread = notifications.filter((n) => !n.read_at).length;
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
            "Profile",
            "Reports",
          ]
        : [
            "Overview",
            "Shifts",
            "Schedule",
            "Members",
            "Facilities",
            "Timesheets",
            "Reports",
          ];
  useEffect(() => {
    const restore = () => {
      let view = "Overview";
      try {
        view = decodeURIComponent(window.location.hash.slice(1)) || "Overview";
      } catch {}
      setTab([...nav, "Notifications"].includes(view) ? view : "Overview");
      setSearch("");
      setFilter("all");
      setPage(1);
    };
    restore();
    window.addEventListener("popstate", restore);
    window.addEventListener("hashchange", restore);
    return () => {
      window.removeEventListener("popstate", restore);
      window.removeEventListener("hashchange", restore);
    };
    // Navigation permissions are based on the authenticated profile, never the URL.
  }, [role]);
  useEffect(() => {
    if (!loading) headingRef.current?.focus({ preventScroll: true });
  }, [tab, loading]);
  useEffect(() => {
    if (!mobile) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebarRef.current?.querySelector<HTMLButtonElement>("nav button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobile(false);
      if (e.key === "Tab") {
        const buttons = sidebarRef.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),a[href]",
        );
        if (!buttons?.length) return;
        const first = buttons[0],
          last = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [mobile]);
  const person = (id: string) =>
    profiles.find((p) => p.id === id)?.full_name ?? "Nursing professional";
  const location = (id: string) =>
    facilities.find((f) => f.id === id)?.name ?? "Healthcare facility";
  const visible = shifts.filter(
    (s) =>
      (s.title + " " + s.department + " " + location(s.facility_id))
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === "all" || s.status === filter) &&
      (credential === "all" || s.specialty === credential) &&
      (!urgent || s.urgent),
  );
  const selectedShift = shifts.find((s) => s.id === selected);
  const cancellation = shifts.find((s) => s.id === cancelId);
  const exportReport = () => {
    const rows = [
      [
        "Data source",
        "Shift",
        "Facility",
        "Credential",
        "Status",
        "Start",
        "End",
        "USD per hour",
      ],
      ...shifts.map((s) => [
        previewData ? "DEVELOPMENT SAMPLE" : "Supabase workspace",
        s.title,
        location(s.facility_id),
        s.specialty,
        s.status,
        s.starts_at,
        s.ends_at,
        String(s.hourly_rate),
      ]),
    ];
    const cell = (v: string) =>
      '"' + v.replaceAll('"', '""').replace(/^[=+@-]/, "'$&") + '"';
    const url = URL.createObjectURL(
      new Blob([rows.map((row) => row.map(cell).join(",")).join("\r\n")], {
        type: "text/csv",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = previewData
      ? "staftify-development-sample-shifts.csv"
      : "staftify-shifts.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const mutateShift = async (s: Shift, operation: "publish" | "cancel") => {
    const r = await request(
      "/api/shifts/" + s.id,
      "PATCH",
      { operation, details: { updated_at: s.updated_at } },
      operation === "publish"
        ? "Shift published. Verified nurses can now apply."
        : "Shift cancelled. Affected nurses have been notified.",
    );
    if (r) {
      setCancelId(null);
      setSelected(null);
    }
    return !!r;
  };
  const feedback = (
    <>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="success-message" role="status">
          <Check size={16} />
          {success}
        </div>
      )}
    </>
  );
  return (
    <div className="app-shell live-workspace">
      {mobile && (
        <button
          className="nav-overlay"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        ref={sidebarRef}
        id="workspace-navigation"
        className={"sidebar " + (mobile ? "visible" : "")}
      >
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
                ? (facility?.name ?? "Facility workspace")
                : role === "nurse"
                  ? "Nurse workspace"
                  : "STAFTIFY Operations"}
            </strong>
            <span>
              {role === "facility"
                ? "Facility administrator"
                : role === "nurse"
                  ? "Your career, your schedule"
                  : "Platform administrator"}
            </span>
          </div>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {nav.map((n) => {
            const Icon = icons[n];
            return (
              <button
                key={n}
                aria-label={n}
                aria-current={n === tab ? "page" : undefined}
                className={n === tab ? "active" : ""}
                onClick={() => navigate(n)}
              >
                <Icon size={18} />
                {n}
                {["Applications", "My applications"].includes(n) &&
                  applications.some((a) => a.status === "pending") && (
                    <em>
                      {
                        applications.filter((a) => a.status === "pending")
                          .length
                      }
                    </em>
                  )}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="care-card">
            <ShieldCheck size={20} />
            <strong>Built around people.</strong>
            <p>Secure staffing. Clear expectations. Better care.</p>
          </div>
          <div className="user">
            <div className="avatar">
              {profile.full_name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div>
              <strong>{profile.full_name}</strong>
              <span>{role} account</span>
            </div>
            <button
              aria-label={
                previewData ? "Leave development preview" : "Sign out"
              }
              onClick={async () => {
                if (previewData) {
                  window.location.assign("/");
                  return;
                }
                const result = await request(
                  "/api/logout",
                  "POST",
                  {},
                  "Signed out.",
                );
                if (result) window.location.assign("/login");
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-wrap" inert={mobile || undefined}>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-toggle"
              aria-label="Toggle navigation"
              aria-expanded={mobile}
              aria-controls="workspace-navigation"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={21} />
            </button>
            <span>{role[0].toUpperCase() + role.slice(1)} portal</span>
            <ChevronRight size={14} />
            <strong>{tab}</strong>
          </div>
          <div className="top-actions">
            {previewData && <span className="preview-indicator">PREVIEW</span>}
            <span className="today">
              {previewData
                ? "Local test workspace"
                : updated
                  ? "Updated " +
                    updated.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "Connecting securely"}
            </span>
            <button
              aria-label="Refresh workspace"
              disabled={busy}
              onClick={() => void load()}
            >
              <RefreshCw size={18} />
            </button>
            <button
              className="notification-button"
              aria-label={
                "Notifications" + (unread ? " (" + unread + " unread)" : "")
              }
              onClick={() => navigate("Notifications")}
            >
              <Bell size={20} />
              {unread > 0 && <i />}
            </button>
          </div>
        </header>
        <main className="main">
          {previewData && (
            <section
              className="development-bar"
              aria-label="Development preview"
            >
              <div className="development-label">
                <span />
                DEVELOPMENT PREVIEW
              </div>
              <p>
                Simulated operations · saved in this browser · shared across
                test portals
              </p>
              <div className="portal-switcher" aria-label="Review portal">
                {(["facility", "nurse", "admin"] as const).map((r) => (
                  <Link
                    key={r}
                    href={"/development/" + r}
                    aria-current={role === r ? "page" : undefined}
                    className={role === r ? "selected" : ""}
                  >
                    {r[0].toUpperCase() + r.slice(1)}
                  </Link>
                ))}
              </div>
              <button
                className="development-info"
                onClick={async () => {
                  try {
                    setHistory(await readLocalHistory());
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Unable to read activity.",
                    );
                  }
                }}
              >
                Local activity
              </button>
              <button
                className="development-info"
                onClick={() => setResetOpen(true)}
              >
                Reset local test data
              </button>
              <Link className="development-info" href="/">
                Home
              </Link>
              <button
                className="development-info"
                onClick={() => setRequirementsOpen(true)}
              >
                Live access requirements
                <ShieldCheck size={14} />
              </button>
            </section>
          )}

          <div className="page-heading">
            <div>
              <span className="eyebrow">YOUR STAFFING, SIMPLIFIED</span>
              <h1 ref={headingRef} tabIndex={-1}>
                {tab === "Overview"
                  ? "Welcome, " + profile.full_name.split(" ")[0]
                  : tab}
              </h1>
              <p>
                {tab === "Overview"
                  ? previewData
                    ? "Use the application with fictional records saved in this browser."
                    : "Your live staffing workspace. Every shift and application is stored securely."
                  : previewData
                    ? "Local test workflow. Requests, approvals and other changes are simulated and saved in this browser."
                    : "Your workspace data is protected by account and facility permissions."}
              </p>
            </div>
            <div className="heading-actions">
              <button
                className="secondary"
                onClick={exportReport}
                disabled={!data}
              >
                <ArrowDownToLine size={16} />
                Export report
              </button>
              {role === "facility" && (
                <button
                  className="primary"
                  disabled={!data || busy}
                  onClick={() => {
                    setEditor("new");
                    setError("");
                    setSuccess("");
                  }}
                >
                  <Plus size={17} />
                  Create shift
                </button>
              )}
            </div>
          </div>
          {!editor && !selectedShift && !cancellation && feedback}
          {loading && (
            <section className="panel resource-panel loading-panel">
              <RefreshCw size={25} />
              <h2>Loading your workspace…</h2>
              <p>
                Retrieving your facility, shifts, and applications from
                Supabase.
              </p>
            </section>
          )}
          {!loading && !data && (
            <section className="panel resource-panel">
              <h2>
                {previewData
                  ? "Local test storage unavailable"
                  : "Unable to retrieve workspace data"}
              </h2>
              <p>
                {previewData
                  ? "Allow browser storage for STAFTIFY and reload. You can also reset local test data above. No live data will be changed."
                  : "The connection or database schema needs attention. No sample data has been substituted."}
              </p>
              <button className="primary" onClick={() => void load()}>
                Retry connection
              </button>
            </section>
          )}
          {data && (
            <>
              {role === "facility" && facility && tab === "Overview" && (
                <div className="account-readiness">
                  <ShieldCheck size={22} />
                  <div>
                    <strong>
                      {facility.verification_status === "verified"
                        ? previewData
                          ? "Local test facility · verified"
                          : "Facility verified"
                        : "Facility review " + facility.verification_status}
                    </strong>
                    <p>
                      {previewData
                        ? "Local publishing, bookings, attendance and approvals are simulated. Your changes persist across these test portals."
                        : facility.verification_status !== "verified"
                          ? "You can prepare draft shifts now. An administrator must verify the facility before publication."
                          : !["active", "trialing"].includes(
                                facility.subscription_status,
                              )
                            ? "Prepare draft shifts while your facility subscription is activated."
                            : "Your facility is ready to publish staffing opportunities."}
                    </p>
                  </div>
                  <span className="badge">
                    {facility.subscription_status} subscription
                  </span>
                </div>
              )}
              {role === "nurse" && !profile.verified && (
                <div className="account-readiness">
                  <ShieldCheck size={22} />
                  <div>
                    <strong>Professional verification required</strong>
                    <p>
                      Complete your profile and submit a current license. An
                      administrator reviews credentials before you can apply.
                    </p>
                  </div>
                  <button
                    className="secondary"
                    onClick={() => navigate("Profile")}
                  >
                    Complete profile
                  </button>
                </div>
              )}
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
                        {role === "facility"
                          ? "Prepare shifts, connect with verified nurses, and keep every hour accounted for."
                          : role === "nurse"
                            ? "Find opportunities that match your credentials and build a schedule that fits."
                            : "Review the people and facilities that power your care community."}
                      </p>
                      <button
                        onClick={() =>
                          navigate(
                            role === "facility"
                              ? "Applications"
                              : role === "nurse"
                                ? "Find shifts"
                                : "Members",
                          )
                        }
                      >
                        {role === "facility"
                          ? "Review applications"
                          : role === "nurse"
                            ? "Explore shifts"
                            : "Manage verification"}
                        <ArrowRight size={15} />
                      </button>
                    </div>
                    <div className="hero-art" aria-hidden="true">
                      <div className="orbit one" />
                      <div className="orbit two" />
                      <div className="medical-plus">+</div>
                      <div className="floating-chip top">
                        <div className="chip-icon">
                          <ShieldCheck size={23} />
                        </div>
                        <div>
                          <strong>People-first staffing</strong>
                          <span>
                            {previewData
                              ? "Persistent local testing"
                              : "Securely connected"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </section>
                  <section className="stats">
                    {[
                      {
                        label: "Open shifts",
                        value: shifts.filter((s) => s.status === "open").length,
                        icon: CalendarDays,
                        color: "green",
                      },
                      {
                        label: "Pending applications",
                        value: applications.filter(
                          (a) => a.status === "pending",
                        ).length,
                        icon: Users,
                        color: "blue",
                      },
                      {
                        label: "Assigned shifts",
                        value: shifts.filter((s) => s.status === "filled")
                          .length,
                        icon: Clock,
                        color: "purple",
                      },
                      {
                        label: "Completed shifts",
                        value: shifts.filter((s) => s.status === "completed")
                          .length,
                        icon: Activity,
                        color: "orange",
                      },
                    ].map((x) => (
                      <article className="stat" key={x.label}>
                        <div>
                          <span>{x.label}</span>
                          <div className={"stat-icon " + x.color}>
                            <x.icon size={19} />
                          </div>
                        </div>
                        <strong>{x.value}</strong>
                        <small>
                          {previewData
                            ? "Persistent local test records"
                            : "From your accessible workspace records"}
                        </small>
                      </article>
                    ))}
                  </section>
                </>
              )}
              {tab === "Overview" && (
                <WorkspaceOverview
                  data={data}
                  onNavigate={navigate}
                  onShift={(id) => {
                    setSelected(id);
                    setError("");
                    setSuccess("");
                  }}
                />
              )}
              {["Overview", "Shifts", "Find shifts"].includes(tab) && (
                <section className="panel shift-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>
                        {role === "nurse" ? "Shift marketplace" : "Your shifts"}
                      </h2>
                      <p>
                        {role === "facility"
                          ? "Create a draft, review the details, and publish when ready."
                          : "Search opportunities from verified facilities."}
                      </p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => navigate("Schedule")}
                    >
                      View schedule
                      <ArrowRight size={15} />
                    </button>
                  </div>
                  <div className="table-tools">
                    <label className="search">
                      <Search size={16} />
                      <input
                        aria-label="Search shifts"
                        placeholder="Title, facility, department…"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setPage(1);
                        }}
                      />
                    </label>
                    <select
                      aria-label="Shift status"
                      value={filter}
                      onChange={(e) => {
                        setFilter(e.target.value);
                        setPage(1);
                      }}
                    >
                      {[
                        "all",
                        ...(role === "nurse" ? [] : ["draft"]),
                        "open",
                        "filled",
                        "completed",
                        "cancelled",
                      ].map((x) => (
                        <option key={x} value={x}>
                          {x === "all"
                            ? "All statuses"
                            : x[0].toUpperCase() + x.slice(1)}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Credential filter"
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
                    {visible.slice((page - 1) * 10, page * 10).map((s) => (
                      <div className="shift-row" key={s.id}>
                        <div className="shift-title">
                          <div
                            className={"role-icon " + s.specialty.toLowerCase()}
                          >
                            <HeartPulse size={19} />
                          </div>
                          <div>
                            <button
                              className="shift-name"
                              onClick={() => {
                                setSelected(s.id);
                                setError("");
                                setSuccess("");
                              }}
                            >
                              {s.title}
                            </button>
                            <small>
                              {s.specialty} ·{" "}
                              {role === "facility"
                                ? s.department
                                : location(s.facility_id)}
                              {s.urgent && (
                                <em>
                                  <Zap size={10} />
                                  Urgent
                                </em>
                              )}
                            </small>
                          </div>
                        </div>
                        <div className="shift-date">
                          <strong>{date(s.starts_at)}</strong>
                          <small>
                            {time(s.starts_at)} – {time(s.ends_at)}
                          </small>
                        </div>
                        <div className="rate">
                          <strong>
                            {currency(s.hourly_rate)}
                            <small>/hr</small>
                          </strong>
                          <small>
                            {hoursBetween(s.starts_at, s.ends_at)} hours
                          </small>
                        </div>
                        <span className={"badge " + s.status}>{s.status}</span>
                        <button
                          className="row-action"
                          aria-label={"View " + s.title}
                          onClick={() => setSelected(s.id)}
                        >
                          <ChevronRight size={17} />
                        </button>
                      </div>
                    ))}
                    {!visible.length && (
                      <div className="empty">
                        <CalendarDays size={28} />
                        <h3>
                          {shifts.length
                            ? "No matching shifts"
                            : "Your next connection starts here"}
                        </h3>
                        <p>
                          {role === "facility"
                            ? shifts.length
                              ? "Try another search or clear your filters."
                              : "Create your first shift to start staffing your team."
                            : "Available shifts will appear here when facilities publish them."}
                        </p>
                        {shifts.length > 0 && (
                          <button
                            className="secondary"
                            onClick={() => {
                              setSearch("");
                              setFilter("all");
                              setCredential("all");
                              setUrgent(false);
                              setPage(1);
                            }}
                          >
                            Clear filters
                          </button>
                        )}
                        {role === "facility" && !shifts.length && (
                          <button
                            className="primary"
                            onClick={() => setEditor("new")}
                          >
                            <Plus size={16} />
                            Create a shift
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="table-footer">
                    <span>
                      {visible.length} matching records · up to 500 shifts
                      loaded
                    </span>
                    <div>
                      <button
                        aria-label="Previous page"
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                      >
                        <ChevronLeft size={15} />
                      </button>
                      <span>{page}</span>
                      <button
                        aria-label="Next page"
                        disabled={page * 10 >= visible.length}
                        onClick={() => setPage(page + 1)}
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>
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
                        Acceptance confirms the booking and prevents overlapping
                        assignments.
                      </p>
                    </div>
                    <select
                      aria-label="Application status"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="all">All applications</option>
                      {["pending", "accepted", "declined", "withdrawn"].map(
                        (x) => (
                          <option key={x}>{x}</option>
                        ),
                      )}
                    </select>
                  </div>
                  {applications
                    .filter((a) => filter === "all" || a.status === filter)
                    .map((a) => {
                      const s = shifts.find((s) => s.id === a.shift_id);
                      return (
                        <article className="application-card" key={a.id}>
                          <div className="avatar">
                            {person(a.nurse_id)
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")}
                          </div>
                          <div className="application-main">
                            <strong>
                              {role === "nurse"
                                ? (s?.title ?? "Shift")
                                : person(a.nurse_id)}
                            </strong>
                            <p>
                              {role === "nurse"
                                ? location(s?.facility_id ?? "")
                                : s?.title}
                            </p>
                            <small>
                              {s
                                ? date(s.starts_at) +
                                  " · " +
                                  currency(s.hourly_rate) +
                                  "/hr"
                                : "Shift details unavailable"}
                            </small>
                          </div>
                          <span className={"badge " + a.status}>
                            {a.status}
                          </span>
                          <div className="application-actions">
                            {s && (
                              <button
                                className="secondary"
                                onClick={() => setSelected(s.id)}
                              >
                                View shift
                              </button>
                            )}
                            {a.status === "pending" &&
                              (role === "facility" ? (
                                <>
                                  <button
                                    className="secondary"
                                    disabled={busy}
                                    onClick={() =>
                                      void action("decline", {
                                        application_id: a.id,
                                      })
                                    }
                                  >
                                    Decline
                                  </button>
                                  <button
                                    className="primary"
                                    disabled={busy}
                                    onClick={() =>
                                      void action("accept", {
                                        application_id: a.id,
                                      })
                                    }
                                  >
                                    Approve & book
                                  </button>
                                </>
                              ) : role === "nurse" ? (
                                <button
                                  className="secondary"
                                  disabled={busy}
                                  onClick={() =>
                                    void action("withdraw", {
                                      application_id: a.id,
                                    })
                                  }
                                >
                                  Withdraw
                                </button>
                              ) : null)}
                          </div>
                        </article>
                      );
                    })}
                  {!applications.filter(
                    (a) => filter === "all" || a.status === filter,
                  ).length && (
                    <div className="empty">No applications in this view.</div>
                  )}
                </section>
              )}
              {tab === "Schedule" && (
                <section className="panel schedule-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>
                        {role === "nurse"
                          ? "My confirmed schedule"
                          : "Staffing schedule"}
                      </h2>
                      <p>Times use your device’s local timezone.</p>
                    </div>
                    <div className="calendar-controls">
                      <button
                        aria-label="Previous week"
                        className="secondary"
                        onClick={() => setWeek(week - 1)}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button className="secondary" onClick={() => setWeek(0)}>
                        Today
                      </button>
                      <button
                        aria-label="Next week"
                        className="secondary"
                        onClick={() => setWeek(week + 1)}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="week-grid">
                    {Array.from({ length: 7 }, (_, i) => {
                      const d = new Date();
                      d.setDate(
                        d.getDate() - ((d.getDay() + 6) % 7) + week * 7 + i,
                      );
                      const items = shifts.filter(
                        (s) =>
                          new Date(s.starts_at).toDateString() ===
                            d.toDateString() &&
                          s.status !== "cancelled" &&
                          (role !== "nurse" ||
                            s.assigned_nurse_id === profile.id),
                      );
                      return (
                        <div className="week-day" key={i}>
                          <div className="day-heading">
                            <span>
                              {d.toLocaleDateString("en-US", {
                                weekday: "short",
                              })}
                            </span>
                            <strong
                              className={
                                d.toDateString() === new Date().toDateString()
                                  ? "is-today"
                                  : ""
                              }
                            >
                              {d.getDate()}
                            </strong>
                            <small>
                              {d.toLocaleDateString("en-US", {
                                month: "short",
                              })}
                            </small>
                          </div>
                          {items.map((s) => (
                            <button
                              key={s.id}
                              className={
                                "schedule-event " +
                                (s.status === "filled" ? "booked" : "")
                              }
                              onClick={() => setSelected(s.id)}
                            >
                              <span>{time(s.starts_at)}</span>
                              <strong>{s.title}</strong>
                              <small>{s.status}</small>
                            </button>
                          ))}
                          {!items.length && (
                            <span className="free-day">No shifts</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
              {tab === "Nurse network" && (
                <section className="panel resource-panel">
                  <h2>Your nurse network</h2>
                  <p>
                    Only verified professionals can be booked. Priority nurses
                    are highlighted in staffing blasts.
                  </p>
                  <div className="directory-tools">
                    <label className="search">
                      <Search size={16} />
                      <input
                        aria-label="Search nurses"
                        placeholder="Name or credential…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="nurse-grid">
                    {profiles
                      .filter(
                        (p) =>
                          p.role === "nurse" &&
                          (p.full_name + " " + p.credential)
                            .toLowerCase()
                            .includes(search.toLowerCase()),
                      )
                      .map((p) => {
                        const details = data.nurse_details.find(
                          (n) => n.id === p.id,
                        );
                        const priority = data.priority_nurses.some(
                          (n) => n.nurse_id === p.id,
                        );
                        return (
                          <article className="nurse-card" key={p.id}>
                            <div className="nurse-card-top">
                              <div className="avatar">{p.full_name[0]}</div>
                              <span className="badge">
                                {p.verified ? "Verified" : "Review pending"}
                              </span>
                            </div>
                            <h3>{p.full_name}</h3>
                            <p>
                              {p.credential ?? "Credential pending"} ·{" "}
                              {details?.specialty ?? "Profile incomplete"}
                            </p>
                            <small>
                              {details?.city} {details?.state}{" "}
                              {details
                                ? `· ${details.experience_years} years experience`
                                : ""}
                            </small>
                            <p>{details?.bio}</p>
                            <button
                              className="secondary"
                              disabled={busy || !p.verified || p.suspended}
                              onClick={() =>
                                void action("priority", {
                                  nurse_id: p.id,
                                  enabled: !priority,
                                })
                              }
                            >
                              <Star size={14} />
                              {priority ? "Remove priority" : "Add priority"}
                            </button>
                          </article>
                        );
                      })}
                  </div>
                </section>
              )}
              {tab === "Timesheets" && (
                <AttendancePanel
                  key={
                    previewData
                      ? data.shifts.map((s) => s.updated_at).join("|")
                      : undefined
                  }
                  data={data}
                  busy={busy}
                  action={action}
                  simulated={!!previewData}
                />
              )}
              {tab === "Profile" && (
                <ProfessionalProfile
                  key={JSON.stringify([
                    data.profile,
                    data.nurse_details,
                    data.nurse_credentials,
                  ])}
                  data={data}
                  busy={busy}
                  request={request}
                />
              )}
              {["Members", "Facilities"].includes(tab) && role === "admin" && (
                <AdminPanel
                  key={tab}
                  data={data}
                  tab={tab}
                  busy={busy}
                  action={action}
                />
              )}
              {tab === "Notifications" && (
                <section className="panel resource-panel">
                  <h2>Your notifications</h2>
                  <p>
                    In-app updates refresh automatically while this workspace is
                    visible.
                  </p>
                  {notifications.map((n) => (
                    <article
                      className={
                        "notification-card " + (!n.read_at ? "unread" : "")
                      }
                      key={n.id}
                    >
                      <Bell size={19} />
                      <div>
                        <strong>{n.title}</strong>
                        <p>{n.body}</p>
                        <small>{new Date(n.created_at).toLocaleString()}</small>
                      </div>
                      {!n.read_at && (
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() =>
                            void action("read_notification", {
                              notification_id: n.id,
                            })
                          }
                        >
                          Mark read
                        </button>
                      )}
                    </article>
                  ))}
                  {!notifications.length && (
                    <div className="empty">You’re all caught up.</div>
                  )}
                </section>
              )}
              {tab === "Reports" && (
                <section className="panel resource-panel">
                  <h2>Staffing report</h2>
                  <p>
                    Based on up to 500 accessible shifts and timesheets.
                    Facilities pay nurses directly.
                  </p>
                  <div className="report-bars">
                    {["draft", "open", "filled", "completed", "cancelled"].map(
                      (status) => (
                        <div key={status}>
                          <span>{status}</span>
                          <div>
                            <i
                              style={{
                                width:
                                  (shifts.filter((s) => s.status === status)
                                    .length /
                                    (shifts.length || 1)) *
                                    100 +
                                  "%",
                              }}
                            />
                          </div>
                          <strong>
                            {shifts.filter((s) => s.status === status).length}
                          </strong>
                        </div>
                      ),
                    )}
                  </div>
                  <button className="primary" onClick={exportReport}>
                    <ArrowDownToLine size={16} />
                    Download shift CSV
                  </button>
                </section>
              )}
              {tab === "Subscription" && (
                <section className="panel billing-panel">
                  <span className="eyebrow">FACILITY MEMBERSHIP</span>
                  <h2>One plan. Better staffing.</h2>
                  <div className="price">
                    $399<span>/ month</span>
                  </div>
                  <p>
                    Subscription status:{" "}
                    <strong>{facility?.subscription_status}</strong>
                  </p>
                  <p className="notice">
                    An active subscription and facility verification are
                    required to publish shifts. Nurse compensation is arranged
                    directly with your facility.
                  </p>
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={async () => {
                      const d = await request(
                        "/api/billing",
                        "POST",
                        {
                          portal: ["active", "trialing"].includes(
                            facility?.subscription_status ?? "",
                          ),
                        },
                        "Opening secure billing…",
                      );
                      if (d?.url) window.location.assign(d.url);
                    }}
                  >
                    {["active", "trialing"].includes(
                      facility?.subscription_status ?? "",
                    )
                      ? "Manage subscription"
                      : "Activate subscription"}
                  </button>
                </section>
              )}
            </>
          )}
          <footer className="footer">
            <span>
              © {new Date().getFullYear()} STAFTIFY{" "}
              {previewData ? "· Development preview" : ""}
            </span>
            <span>Connecting people. Elevating care.</span>
          </footer>
        </main>
      </div>
      {resetOpen && (
        <Dialog
          title="Reset local test data?"
          onClose={() => setResetOpen(false)}
        >
          <p>
            This clears fictional shifts, requests, bookings, attendance and
            local activity in this browser for all three test portals. Live
            Supabase data is never affected.
          </p>
          <div className="heading-actions">
            <button className="secondary" onClick={() => setResetOpen(false)}>
              Keep local data
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await resetLocalWorkspace();
                  await load();
                  setResetOpen(false);
                  setSuccess(
                    "Local test data reset. You can start the workflow again.",
                  );
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Unable to reset.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Confirm reset
            </button>
          </div>
        </Dialog>
      )}
      {history && (
        <Dialog title="Simulated activity" onClose={() => setHistory(null)}>
          <p>
            Local test operations, newest first. No real accounts, payments, or
            messages are involved.
          </p>
          {history.length ? (
            history.map((event) => (
              <article className="notification-card" key={event.id}>
                <div>
                  <strong>{event.operation}</strong>
                  <p>
                    {event.actor} · {new Date(event.at).toLocaleString()}
                  </p>
                </div>
              </article>
            ))
          ) : (
            <p>No local operations yet. Request a shift to get started.</p>
          )}
        </Dialog>
      )}
      {billingOpen && (
        <Dialog
          title="Simulated subscription management"
          onClose={() => setBillingOpen(false)}
        >
          {feedback}
          <p>
            STAFTIFY facility plan · $399/month. This local test control never
            collects payment or contacts Stripe.
          </p>
          <p>
            Local subscription: <strong>{facility?.subscription_status}</strong>
          </p>
          <button
            className="primary"
            disabled={busy}
            onClick={async () => {
              const r = await request(
                "/development/subscription",
                "POST",
                {
                  status: ["active", "trialing"].includes(
                    facility?.subscription_status ?? "",
                  )
                    ? "inactive"
                    : "active",
                },
                "Local subscription updated. No charge was made.",
              );
              if (r) setBillingOpen(false);
            }}
          >
            {["active", "trialing"].includes(
              facility?.subscription_status ?? "",
            )
              ? "Pause test subscription"
              : "Activate test subscription"}
          </button>
        </Dialog>
      )}
      {requirementsOpen && (
        <Dialog
          title="What needs live access?"
          onClose={() => setRequirementsOpen(false)}
        >
          <p>
            You are reviewing the actual Next.js workspace components with
            fictional records. Shifts, requests, approvals, notifications,
            profiles, attendance and verification work as simulated local
            operations. Changes are stored in IndexedDB in this browser, persist
            after reload, and are shared between test portals and tabs on this
            origin.
          </p>
          <ul className="access-requirements">
            <li>
              <strong>Supabase Auth:</strong> registration, email confirmation,
              sign-in, and real account permissions.
            </li>
            <li>
              <strong>Supabase database:</strong> real multi-user persistence
              and server-enforced permissions. The local workflow is a
              simulation, not a database connection.
            </li>
            <li>
              <strong>Stripe:</strong> facility subscription checkout and
              billing management. Facilities pay nurses directly.
            </li>
            <li>
              <strong>Hosting:</strong> a publicly accessible website address.
              This development route runs inside the actual Next.js app.
            </li>
          </ul>
          <p className="notice">
            Test identities do not sign in through Supabase and cannot access
            authenticated APIs. Only fictional information belongs here. Local
            attendance ignores real shift-time windows; clock-out records at
            least one simulated minute so you can test the complete flow now.
            Reset local test data clears all three test portals in this browser.
          </p>
          <Link className="primary" href="/login">
            Open real sign-in
            <ArrowRight size={15} />
          </Link>
        </Dialog>
      )}
      {editor && (
        <Dialog
          title={editor === "new" ? "Create a shift" : "Edit shift"}
          onClose={() => {
            if (!busy) setEditor(null);
          }}
        >
          {feedback}
          <ShiftEditor
            shift={editor === "new" ? undefined : editor}
            busy={busy}
            onSave={async (body) => {
              const r = await request(
                editor === "new" ? "/api/shifts" : "/api/shifts/" + editor.id,
                editor === "new" ? "POST" : "PATCH",
                editor === "new"
                  ? body
                  : {
                      operation: "edit",
                      details: { ...body, updated_at: editor.updated_at },
                    },
                editor === "new"
                  ? "Draft saved to your facility."
                  : "Shift changes saved.",
              );
              if (r) setEditor(null);
              return !!r;
            }}
          />
        </Dialog>
      )}
      {selectedShift && (
        <Dialog
          title={selectedShift.title}
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          {feedback}
          <span className={"badge " + selectedShift.status}>
            {selectedShift.status}
          </span>
          <p className="detail-facility">
            {location(selectedShift.facility_id)} ·{" "}
            {facilities.find((f) => f.id === selectedShift.facility_id)?.city},{" "}
            {facilities.find((f) => f.id === selectedShift.facility_id)?.state}
          </p>
          <div className="detail-grid">
            <div>
              <small>DATE</small>
              <strong>{date(selectedShift.starts_at)}</strong>
            </div>
            <div>
              <small>TIME</small>
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
          <h3>Shift requirements</h3>
          <p>{selectedShift.notes || "No additional notes provided."}</p>
          <p>
            {selectedShift.specialty} · {selectedShift.department}
          </p>
          {selectedShift.assigned_nurse_id && (
            <p>
              Assigned professional: {person(selectedShift.assigned_nurse_id)}
            </p>
          )}
          <p className="notice">
            The facility pays the nurse directly. Publishing and booking require
            verified accounts and current credentials.
          </p>
          {role === "nurse" &&
            selectedShift.status === "open" &&
            (!profile.verified ||
              profile.credential !== selectedShift.specialty ||
              profile.suspended) && (
              <p className="notice">
                {profile.suspended
                  ? "This account is suspended. Ask an administrator to review it."
                  : !profile.verified
                    ? "Your professional credentials must be verified before applying."
                    : `This shift requires ${selectedShift.specialty} credentials. Your profile lists ${profile.credential ?? "no credential"}.`}
              </p>
            )}
          <div className="heading-actions detail-actions">
            {role === "facility" &&
              selectedShift.facility_id === profile.facility_id && (
                <>
                  {["draft", "open"].includes(selectedShift.status) && (
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() => {
                        setEditor(selectedShift);
                        setSelected(null);
                      }}
                    >
                      Edit shift
                    </button>
                  )}
                  {selectedShift.status === "draft" && (
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() => void mutateShift(selectedShift, "publish")}
                    >
                      Publish shift
                    </button>
                  )}
                  {selectedShift.status === "open" && (
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() =>
                        void action("blast", { shift_id: selectedShift.id })
                      }
                    >
                      <Zap size={16} />
                      Send urgent blast
                    </button>
                  )}
                  {["draft", "open", "filled"].includes(
                    selectedShift.status,
                  ) && (
                    <button
                      className="danger-link"
                      disabled={busy}
                      onClick={() => {
                        setCancelId(selectedShift.id);
                        setSelected(null);
                      }}
                    >
                      Cancel shift
                    </button>
                  )}
                </>
              )}
            {role === "nurse" &&
              selectedShift.status === "open" &&
              (applications.some(
                (a) =>
                  a.nurse_id === profile.id &&
                  a.shift_id === selectedShift.id &&
                  ["pending", "accepted"].includes(a.status),
              ) ? (
                <span className="badge">
                  Application:{" "}
                  {
                    applications.find(
                      (a) =>
                        a.nurse_id === profile.id &&
                        a.shift_id === selectedShift.id,
                    )?.status
                  }
                </span>
              ) : (
                <button
                  className="primary"
                  disabled={
                    busy ||
                    !profile.verified ||
                    profile.suspended ||
                    profile.credential !== selectedShift.specialty
                  }
                  onClick={async () => {
                    if (await action("apply", { shift_id: selectedShift.id })) {
                      setSelected(null);
                      navigate("My applications");
                      setSuccess(
                        previewData
                          ? "Simulated · Shift requested. Your pending application is saved in this browser."
                          : "Shift requested. Your application is pending facility approval.",
                      );
                    }
                  }}
                >
                  Apply for shift
                </button>
              ))}
            {selectedShift.status === "filled" && (
              <button
                className="secondary"
                onClick={() => {
                  setSelected(null);
                  navigate("Timesheets");
                }}
              >
                View attendance
              </button>
            )}
            <button className="secondary" onClick={() => setSelected(null)}>
              Close details
            </button>
          </div>
        </Dialog>
      )}
      {cancellation && (
        <Dialog title="Cancel this shift?" onClose={() => setCancelId(null)}>
          {feedback}
          <p>
            {cancellation.title} · {date(cancellation.starts_at)}
          </p>
          <p>
            Pending and accepted applicants will be notified. Shifts with
            recorded attendance cannot be cancelled through this control.
          </p>
          <div className="heading-actions">
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setCancelId(null)}
            >
              Keep shift
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={() => void mutateShift(cancellation, "cancel")}
            >
              Confirm cancellation
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
