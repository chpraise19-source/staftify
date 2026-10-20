"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="onboarding-page">
      <section className="onboarding-card">
        <h1>Your workspace could not load.</h1>
        <p>
          Please retry. If this continues, check the Supabase connection and
          database migrations.
        </p>
        <button className="primary" onClick={reset}>
          Retry
        </button>
        <a className="secondary" href="/login">
          Back to sign in
        </a>
      </section>
    </main>
  );
}
