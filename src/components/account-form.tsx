"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, HeartPulse, ShieldCheck } from "lucide-react";
export default function AccountForm({
  mode,
  configured,
  initialType = "facility",
  initialError,
  previewEnabled = false,
}: {
  mode: "login" | "register";
  configured: boolean;
  initialType?: "facility" | "nurse";
  initialError?: string;
  previewEnabled?: boolean;
}) {
  const [accountType, setAccountType] = useState(initialType);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError ?? "");
  const [message, setMessage] = useState("");
  return (
    <main className="account-page">
      <section className="account-story">
        <Link href="/" className="brand">
          staftify<span>✦</span>
        </Link>
        <div className="story-content">
          <span className="eyebrow">BUILT FOR BETTER CARE</span>
          <h1>
            The right people.
            <br />
            Right when care
            <br />
            needs them.
          </h1>
          <p>
            A connected staffing workspace for healthcare facilities and nursing
            professionals.
          </p>
          <div className="story-feature">
            <ShieldCheck size={23} />
            <div>
              <strong>People first. Always.</strong>
              <span>
                Secure accounts, verified credentials, and clear shift
                expectations.
              </span>
            </div>
          </div>
          <div className="story-feature">
            <HeartPulse size={23} />
            <div>
              <strong>More care. Less admin.</strong>
              <span>
                From staffing requests to approved hours, all in one place.
              </span>
            </div>
          </div>
        </div>
        <small>
          Facilities pay nurses directly. STAFTIFY manages the staffing
          workflow.
        </small>
      </section>
      <section className="account-main">
        <div className="account-top">
          {mode === "login" ? (
            <>
              New to STAFTIFY?{" "}
              <Link href="/register">
                Create an account <ArrowRight size={14} />
              </Link>
            </>
          ) : (
            <>
              Already a member?{" "}
              <Link href="/login">
                Sign in <ArrowRight size={14} />
              </Link>
            </>
          )}
        </div>
        <div className="account-card">
          <span className="eyebrow">YOUR NEXT CONNECTION STARTS HERE</span>
          <h2>
            {mode === "login"
              ? "Welcome back."
              : "Better care starts with you."}
          </h2>
          <p>
            {mode === "login"
              ? "Sign in to your STAFTIFY workspace."
              : "Create your account and complete your professional workspace."}
          </p>
          {!configured && (
            <div className="connection-notice" role="status">
              <ShieldCheck size={19} />
              <div>
                <strong>Secure connection pending</strong>
                <p>
                  The application needs its STAFTIFY Supabase connection before
                  accounts can be created or used. No sample accounts or data
                  are shown.
                </p>
              </div>
            </div>
          )}
          {mode === "register" && (
            <div className="account-type" aria-label="Account type">
              {(["facility", "nurse"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={accountType === t}
                  className={accountType === t ? "selected" : ""}
                  onClick={() => setAccountType(t)}
                >
                  {t === "facility"
                    ? "Healthcare facility"
                    : "Nursing professional"}
                </button>
              ))}
            </div>
          )}
          {previewEnabled && (
            <Link className="screen-review-link" href="/development/facility">
              <span>
                <strong>Review the application screens</strong>
                <small>
                  Development preview · sample records · no sign-in needed
                </small>
              </span>
              <ArrowRight size={18} />
            </Link>
          )}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              setMessage("");
              const f = new FormData(e.currentTarget);
              const password = String(f.get("password"));
              if (
                mode === "register" &&
                password !== f.get("confirm_password")
              ) {
                setError("The passwords do not match.");
                return;
              }
              setBusy(true);
              try {
                const r = await fetch("/api/auth/" + mode, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    email: f.get("email"),
                    password,
                    ...(mode === "register"
                      ? {
                          full_name: f.get("full_name"),
                          account_type: accountType,
                        }
                      : {}),
                  }),
                });
                const data = await r.json();
                if (!r.ok) throw new Error(data.error);
                if (data.next) window.location.assign(data.next);
                else setMessage(data.message);
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : "Unable to connect. Please retry.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {mode === "register" && (
              <label>
                Your full name
                <input
                  name="full_name"
                  autoComplete="name"
                  minLength={2}
                  maxLength={120}
                  required
                  placeholder="Full name"
                />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@organization.com"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={mode === "register" ? 12 : 1}
                maxLength={128}
                required
                placeholder={
                  mode === "register"
                    ? "At least 12 characters"
                    : "Your password"
                }
              />
            </label>
            {mode === "register" && (
              <label>
                Confirm password
                <input
                  name="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                />
              </label>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {message && (
              <p className="success-message" role="status">
                {message}
              </p>
            )}
            <button className="primary" disabled={!configured || busy}>
              {busy
                ? "Please wait…"
                : mode === "login"
                  ? "Sign in"
                  : "Create " +
                    (accountType === "facility" ? "facility" : "nurse") +
                    " account"}
              <ArrowRight size={16} />
            </button>
          </form>
          <p className="account-footnote">
            {mode === "register"
              ? "We’ll ask you to confirm your email. Facility verification and nurse credential review take place before shifts can be booked."
              : "Access is determined by your verified account and workspace permissions."}
          </p>
        </div>
        <div className="account-bottom">
          © {new Date().getFullYear()} STAFTIFY{" "}
          <span>Connecting people. Elevating care.</span>
        </div>
      </section>
    </main>
  );
}
