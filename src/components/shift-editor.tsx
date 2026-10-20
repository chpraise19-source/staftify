"use client";
import { useState } from "react";
import { shiftSchema } from "@/lib/domain";
import type { Shift } from "@/lib/types";
export default function ShiftEditor({
  shift,
  onSave,
  busy,
}: {
  shift?: Shift;
  onSave: (body: Record<string, unknown>) => Promise<boolean>;
  busy: boolean;
}) {
  const [error, setError] = useState("");
  const localTime = (value: string) => {
    const d = new Date(value);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        const f = new FormData(e.currentTarget);
        const start = new Date(String(f.get("starts_at")));
        const end = new Date(String(f.get("ends_at")));
        if (
          !Number.isFinite(start.getTime()) ||
          !Number.isFinite(end.getTime())
        ) {
          setError("Choose valid shift times.");
          return;
        }
        const input = {
          title: f.get("title"),
          specialty: f.get("specialty"),
          department: f.get("department"),
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
          hourly_rate: Number(f.get("hourly_rate")),
          urgent: f.get("urgent") === "on",
          notes: f.get("notes"),
        };
        const result = shiftSchema.safeParse(input);
        if (!result.success) {
          setError(result.error.issues[0].message);
          return;
        }
        await onSave(input);
      }}
    >
      <p>
        {shift
          ? "Update this shift’s staffing requirements."
          : "Prepare a draft shift. Review it before publishing to verified nurses."}
      </p>
      <label>
        Shift title
        <input
          name="title"
          defaultValue={shift?.title}
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
          <select name="specialty" defaultValue={shift?.specialty ?? "RN"}>
            <option>RN</option>
            <option>LPN</option>
            <option>CNA</option>
          </select>
        </label>
        <label>
          Hourly rate (USD)
          <input
            name="hourly_rate"
            type="number"
            min={15}
            max={500}
            step="0.01"
            defaultValue={shift?.hourly_rate}
            required
          />
        </label>
        <label>
          Start date & time
          <input
            type="datetime-local"
            name="starts_at"
            defaultValue={shift ? localTime(shift.starts_at) : undefined}
            required
          />
        </label>
        <label>
          End date & time
          <input
            type="datetime-local"
            name="ends_at"
            defaultValue={shift ? localTime(shift.ends_at) : undefined}
            required
          />
        </label>
      </div>
      <label>
        Department
        <input
          name="department"
          defaultValue={shift?.department}
          minLength={2}
          maxLength={120}
          required
        />
      </label>
      <label>
        Shift requirements & notes
        <textarea
          name="notes"
          defaultValue={shift?.notes}
          maxLength={2000}
          placeholder="Unit details, experience and requirements. Do not include patient information."
        />
      </label>
      <label className="checkbox">
        <input name="urgent" type="checkbox" defaultChecked={shift?.urgent} />
        Urgent coverage needed
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <p className="notice">
        Your facility pays the assigned nurse directly. All times use your
        device’s local timezone.
      </p>
      <button className="primary" disabled={busy}>
        {busy ? "Saving…" : shift ? "Save changes" : "Save draft shift"}
      </button>
    </form>
  );
}
