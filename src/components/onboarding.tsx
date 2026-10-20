"use client";
import { useState } from "react";
import { ArrowRight, HeartPulse } from "lucide-react";
export default function Onboarding({
  name,
  initialType,
}: {
  name: string;
  initialType: "facility" | "nurse";
}) {
  const [type, setType] = useState(initialType);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <main className="onboarding-page">
      <div className="brand">
        staftify<span>✦</span>
      </div>
      <section className="onboarding-card">
        <div className="workspace-icon">
          <HeartPulse size={26} />
        </div>
        <span className="eyebrow">LET’S SET UP YOUR WORKSPACE</span>
        <h1>
          A few details.
          <br />A better way to staff.
        </h1>
        <p>
          Your account is authenticated. Complete your workspace details to get
          started.
        </p>
        <div className="account-type">
          {(["facility", "nurse"] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={type === t}
              className={type === t ? "selected" : ""}
              onClick={() => setType(t)}
            >
              {t === "facility"
                ? "Healthcare facility"
                : "Nursing professional"}
            </button>
          ))}
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const f = new FormData(e.currentTarget);
            try {
              const r = await fetch("/api/onboarding", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  account_type: type,
                  full_name: f.get("full_name"),
                  ...(type === "facility"
                    ? {
                        facility_name: f.get("facility_name"),
                        city: f.get("city"),
                        state: f.get("state"),
                        address: f.get("address"),
                      }
                    : {}),
                }),
              });
              const d = await r.json();
              if (!r.ok) throw new Error(d.error);
              window.location.assign("/dashboard");
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Unable to finish setup.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Your full name
            <input
              name="full_name"
              defaultValue={name}
              minLength={2}
              maxLength={120}
              autoComplete="name"
              required
            />
          </label>
          {type === "facility" && (
            <>
              <label>
                Facility name
                <input
                  name="facility_name"
                  minLength={2}
                  maxLength={200}
                  autoComplete="organization"
                  required
                />
              </label>
              <label>
                Street address
                <input
                  name="address"
                  minLength={5}
                  maxLength={300}
                  autoComplete="street-address"
                  required
                />
              </label>
              <div className="form-grid">
                <label>
                  City
                  <input
                    name="city"
                    minLength={2}
                    maxLength={120}
                    autoComplete="address-level2"
                    required
                  />
                </label>
                <label>
                  State (two letters)
                  <input
                    name="state"
                    minLength={2}
                    maxLength={2}
                    pattern="[A-Za-z]{2}"
                    autoComplete="address-level1"
                    required
                  />
                </label>
              </div>
              <p className="notice">
                Your facility will be submitted for review. You can prepare
                draft shifts while verification and subscription activation are
                pending.
              </p>
            </>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : "Create my workspace"}
            <ArrowRight size={16} />
          </button>
        </form>
        <button
          className="text-button"
          onClick={async () => {
            await fetch("/api/logout", { method: "POST" });
            window.location.assign("/login");
          }}
        >
          Sign out
        </button>
      </section>
    </main>
  );
}
