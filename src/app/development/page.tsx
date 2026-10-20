import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, HeartPulse, ShieldCheck, Building2 } from "lucide-react";
import { developmentPreviewEnabled } from "@/lib/development/config";
import BrandMark from "@/components/brand-mark";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Local test accounts | STAFTIFY",
  robots: { index: false, follow: false },
};
export default function Page() {
  if (!developmentPreviewEnabled()) notFound();
  return (
    <main className="test-entry">
      <Link href="/" className="welcome-logo">
        <BrandMark />
      </Link>
      <span className="test-entry-label">
        DEVELOPMENT WORKSPACE · SIMULATED OPERATIONS
      </span>
      <h1>Choose a local test account.</h1>
      <p>
        Use the actual application with fictional, persistent test records. No
        registration or password is needed. Your changes stay in this browser
        and are shared as you switch portals.
      </p>
      <div className="test-account-grid">
        {(
          [
            {
              role: "nurse",
              name: "Sarah Mitchell",
              description:
                "Find shifts, send requests, view bookings and record test attendance.",
              icon: HeartPulse,
            },
            {
              role: "facility",
              name: "Alex Morgan",
              description:
                "Post shifts, approve nurses, issue attendance codes and approve hours.",
              icon: Building2,
            },
            {
              role: "admin",
              name: "Jordan Ellis",
              description:
                "Review facilities, verify credentials and manage local test accounts.",
              icon: ShieldCheck,
            },
          ] as const
        ).map(({ role, name, description, icon: Icon }) => (
          <Link
            className="test-account-card"
            href={"/development/" + role}
            key={role}
          >
            <Icon size={27} />
            <span>{role} portal</span>
            <h2>{name}</h2>
            <p>{description}</p>
            <strong>
              Enter test workspace
              <ArrowRight size={17} />
            </strong>
          </Link>
        ))}
      </div>
      <section className="test-workflow-guide">
        <h2>Try the complete staffing workflow</h2>
        <ol>
          <li>Enter Nurse, find Med/Surg, and apply for the shift.</li>
          <li>
            Switch to Facility, open Applications, and approve Sarah’s request.
          </li>
          <li>
            Switch to Nurse to see the accepted application and confirmed
            schedule.
          </li>
          <li>
            In Facility Timesheets, generate a clock-in code. Enter it in Nurse
            Timesheets.
          </li>
          <li>
            Repeat with a clock-out code, then approve the timesheet in
            Facility.
          </li>
        </ol>
        <p>
          Use “Local activity” to review changes and “Reset local test data” to
          start again. Simulated codes work outside real shift times so you can
          test now. Only fictional information belongs in this workspace.
        </p>
      </section>
      <footer>
        <Link href="/login">Real account sign-in</Link>
        <Link href="/register">Real account registration</Link>
        <Link href="/admin/login">Real administrator sign-in</Link>
      </footer>
    </main>
  );
}
