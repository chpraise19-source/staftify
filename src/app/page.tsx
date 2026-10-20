import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  HeartPulse,
  ShieldCheck,
} from "lucide-react";
import BrandMark from "@/components/brand-mark";
import { developmentPreviewEnabled } from "@/lib/development/config";
export const dynamic = "force-dynamic";
export default function Page() {
  const review = developmentPreviewEnabled();
  return (
    <div className="welcome-page">
      <a className="welcome-skip" href="#get-started">
        Skip to getting started
      </a>
      <header className="welcome-header">
        <Link className="welcome-logo" href="/" aria-label="STAFTIFY home">
          <BrandMark />
        </Link>
        <nav className="welcome-nav" aria-label="Account navigation">
          <Link
            className="welcome-signin"
            href={review ? "/development" : "/login"}
          >
            Sign In
          </Link>
          <Link
            className="welcome-create"
            href={review ? "/development" : "/register"}
          >
            Create Account
            <ArrowUpRight size={14} />
          </Link>
        </nav>
      </header>
      <main className="welcome-main" id="get-started">
        <section className="welcome-copy" aria-labelledby="welcome-title">
          <div className="welcome-eyebrow">
            <span />
            CARE CAN’T WAIT. NEITHER SHOULD YOU.
          </div>
          <h1 id="welcome-title">
            Healthcare
            <br className="welcome-desktop-break" /> staffing.
            <br /> <span>On demand.</span>
          </h1>
          <p className="welcome-subtitle">
            Connecting qualified nurses with healthcare facilities, one shift at
            a time.
          </p>
          <div className="welcome-paths">
            <Link
              className="welcome-path nurse-path"
              href={
                review
                  ? "/development/nurse#Find%20shifts"
                  : "/register?type=nurse"
              }
            >
              <span className="path-symbol">
                <HeartPulse size={23} strokeWidth={1.6} />
              </span>
              <span>
                I&apos;m a Nurse <span className="path-dash">—</span> Find
                Shifts
              </span>
              <ArrowRight size={21} className="path-arrow" />
            </Link>
            <Link
              className="welcome-path facility-path"
              href={
                review
                  ? "/development/facility#Nurse%20network"
                  : "/register?type=facility"
              }
            >
              <span className="path-symbol">
                <ShieldCheck size={23} strokeWidth={1.6} />
              </span>
              <span>
                I&apos;m a Facility <span className="path-dash">—</span> Find
                Nurses
              </span>
              <ArrowRight size={21} className="path-arrow" />
            </Link>
          </div>
          <div className="welcome-reassurance">
            <span>
              <Check size={13} />
              Your skills. Your schedule.
            </span>
            <span>
              <Check size={13} />
              Better care, connected.
            </span>
          </div>
          {review && (
            <div className="welcome-review">
              <span className="welcome-review-label">
                DEVELOPMENT WORKSPACE
              </span>
              <p>
                Buttons open local test accounts. Shifts, requests and approvals
                are simulated and saved in this browser.
              </p>
              <div>
                <Link href="/development/nurse">
                  Nurse portal
                  <ArrowUpRight size={12} />
                </Link>
                <Link href="/development/facility">
                  Facility portal
                  <ArrowUpRight size={12} />
                </Link>
                <Link href="/development">
                  All test accounts
                  <ArrowUpRight size={12} />
                </Link>
              </div>
            </div>
          )}
        </section>
        <section
          className="welcome-visual"
          aria-label="A nursing professional in a modern healthcare setting"
        >
          <div className="welcome-photo">
            <Image
              src="/images/staftify-care-team.webp"
              alt="Nursing professional in dark scrubs with a stethoscope, holding a tablet in a bright hospital corridor"
              fill
              priority
              sizes="(max-width: 760px) 100vw, (max-width: 1200px) 47vw, 580px"
              quality={85}
            />
            <div className="welcome-photo-shade" />
            <div className="visual-topline">
              <span className="visual-pulse" />
              <span>PEOPLE FIRST. ALWAYS.</span>
              <span className="visual-topline-rule" />
            </div>
            <div className="visual-caption">
              <span>MADE FOR THE PEOPLE WHO CARE.</span>
              <p>
                Great care starts
                <br />
                with a connection.
              </p>
            </div>
          </div>
          <div className="care-connection-card" aria-hidden="true">
            <div className="care-connection-icon">
              <HeartPulse size={22} strokeWidth={1.6} />
            </div>
            <div>
              <strong>Care, without the wait.</strong>
              <span>Bringing people and possibility together.</span>
            </div>
            <span className="care-connection-check">
              <Check size={14} />
            </span>
          </div>
          <div className="visual-index">
            <span>01 / A BETTER WAY TO CARE</span>
            <span className="visual-index-line" />
          </div>
        </section>
      </main>
      <section className="welcome-principles" aria-label="STAFTIFY principles">
        <div>
          <span className="principle-number">01</span>
          <p>
            <strong>Flexibility that fits.</strong>
            <span>Find the connection that works for you.</span>
          </p>
        </div>
        <div>
          <span className="principle-number">02</span>
          <p>
            <strong>People you can count on.</strong>
            <span>Professional profiles. Clear expectations.</span>
          </p>
        </div>
        <div>
          <span className="principle-number">03</span>
          <p>
            <strong>More focus on care.</strong>
            <span>Less back and forth. More moving forward.</span>
          </p>
        </div>
      </section>
      <footer className="welcome-footer">
        <span>© {new Date().getFullYear()} STAFTIFY</span>
        <span className="welcome-footer-note">
          Connecting people. Elevating care.
        </span>
        <Link href="/admin/login">
          Administrator access
          <ArrowUpRight size={12} />
        </Link>
      </footer>
    </div>
  );
}
