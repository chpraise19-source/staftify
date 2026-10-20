"use client";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { shiftSchema } from "@/lib/domain";
import type { Credential, DemoCommand } from "@/lib/demo/store";
export default function ShiftForm({
  dispatch,
  onClose,
}: {
  dispatch: (command: DemoCommand) => unknown;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const start = new Date(String(f.get("starts_at")));
        const end = new Date(String(f.get("ends_at")));
        if (
          !Number.isFinite(start.getTime()) ||
          !Number.isFinite(end.getTime())
        ) {
          setError("Choose valid start and end times.");
          return;
        }
        const shift = {
          title: String(f.get("title")),
          specialty: String(f.get("specialty")) as Credential,
          department: String(f.get("department")),
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
          hourly_rate: Number(f.get("hourly_rate")),
          urgent: f.get("urgent") === "on",
          notes: String(f.get("notes")),
        };
        const valid = shiftSchema.safeParse(shift);
        if (!valid.success) {
          setError(valid.error.issues[0].message);
          return;
        }
        if (dispatch({ type: "post", shift })) onClose();
      }}
    >
      <p>
        Find a great match for your team. This creates a local sample posting.
      </p>
      <label>
        Shift title
        <input
          name="title"
          placeholder="Registered Nurse · Med/Surg"
          minLength={3}
          maxLength={120}
          required
          autoFocus
        />
      </label>
      <div className="form-grid">
        <label>
          Credential
          <select name="specialty">
            <option>RN</option>
            <option>LPN</option>
            <option>CNA</option>
          </select>
        </label>
        <label>
          Hourly rate (USD)
          <input
            type="number"
            name="hourly_rate"
            min={15}
            max={500}
            step="0.01"
            defaultValue={52}
            required
          />
        </label>
        <label>
          Start date & time
          <input
            name="starts_at"
            aria-label="Start date and time"
            type="datetime-local"
            required
          />
        </label>
        <label>
          End date & time
          <input
            name="ends_at"
            aria-label="End date and time"
            type="datetime-local"
            required
          />
        </label>
      </div>
      <label>
        Department
        <input
          name="department"
          placeholder="Medical / Surgical"
          maxLength={100}
          required
        />
      </label>
      <label>
        Shift notes
        <textarea
          name="notes"
          maxLength={2000}
          placeholder="Unit details and required experience. Do not include patient information."
        />
      </label>
      <label className="checkbox">
        <input type="checkbox" name="urgent" /> Mark as urgent
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <p className="notice">
        Facilities pay nurses directly. Demo actions never create real bookings.
      </p>
      <button className="primary" type="submit">
        Add demo shift <ArrowRight size={16} />
      </button>
    </form>
  );
}
