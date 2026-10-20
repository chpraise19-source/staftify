import type { Role } from "../domain";
import type { WorkspaceData, Profile, Shift } from "../types";
export function developmentWorkspace(
  role: Role,
  now = new Date(),
): WorkspaceData {
  const at = (day: number, hour: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + day);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  const profiles: Profile[] = [
    {
      id: "preview-owner",
      full_name: "Alex Morgan",
      role: "facility",
      facility_id: "preview-oakwood",
      credential: null,
      verified: false,
      onboarding_completed: true,
      suspended: false,
    },
    {
      id: "preview-sarah",
      full_name: "Sarah Mitchell",
      role: "nurse",
      facility_id: null,
      credential: "RN",
      verified: true,
      onboarding_completed: true,
      suspended: false,
    },
    {
      id: "preview-emily",
      full_name: "Emily Chen",
      role: "nurse",
      facility_id: null,
      credential: "RN",
      verified: true,
      onboarding_completed: true,
      suspended: false,
    },
    {
      id: "preview-james",
      full_name: "James Wilson",
      role: "nurse",
      facility_id: null,
      credential: "LPN",
      verified: true,
      onboarding_completed: true,
      suspended: false,
    },
    {
      id: "preview-amara",
      full_name: "Amara Johnson",
      role: "nurse",
      facility_id: null,
      credential: "CNA",
      verified: false,
      onboarding_completed: true,
      suspended: false,
    },
    {
      id: "preview-admin",
      full_name: "Jordan Ellis",
      role: "admin",
      facility_id: null,
      credential: null,
      verified: false,
      onboarding_completed: true,
      suspended: false,
    },
  ];
  const shifts: Shift[] = [
    {
      id: "preview-medsurg",
      facility_id: "preview-oakwood",
      title: "Registered Nurse · Med/Surg",
      specialty: "RN",
      department: "Medical / Surgical",
      starts_at: at(1, 7),
      ends_at: at(1, 19),
      hourly_rate: 52,
      urgent: true,
      notes:
        "Support a collaborative medical-surgical team. Current BLS certification required. Arrive 15 minutes before handover.",
      status: "open",
      assigned_nurse_id: null,
      updated_at: now.toISOString(),
    },
    {
      id: "preview-icu",
      facility_id: "preview-oakwood",
      title: "Registered Nurse · ICU",
      specialty: "RN",
      department: "Intensive Care",
      starts_at: at(2, 19),
      ends_at: at(3, 7),
      hourly_rate: 64,
      urgent: true,
      notes:
        "Overnight critical care coverage. ACLS certification and two years of ICU experience required.",
      status: "open",
      assigned_nurse_id: null,
      updated_at: now.toISOString(),
    },
    {
      id: "preview-lpn",
      facility_id: "preview-oakwood",
      title: "LPN · Long-term Care",
      specialty: "LPN",
      department: "Resident Care",
      starts_at: at(3, 7),
      ends_at: at(3, 15),
      hourly_rate: 38,
      urgent: false,
      notes:
        "Resident-focused nursing care and medication administration. Handover with the charge nurse on arrival.",
      status: "open",
      assigned_nurse_id: null,
      updated_at: now.toISOString(),
    },
    {
      id: "preview-cardiology",
      facility_id: "preview-oakwood",
      title: "Registered Nurse · Cardiology",
      specialty: "RN",
      department: "Cardiology",
      starts_at: at(0, 7),
      ends_at: at(0, 19),
      hourly_rate: 55,
      urgent: false,
      notes:
        "Telemetry experience preferred. This record illustrates an assigned shift and the attendance screen.",
      status: "filled",
      assigned_nurse_id: "preview-sarah",
      updated_at: now.toISOString(),
    },
    {
      id: "preview-recovery",
      facility_id: "preview-oakwood",
      title: "Registered Nurse · Recovery",
      specialty: "RN",
      department: "Post-operative Recovery",
      starts_at: at(-1, 7),
      ends_at: at(-1, 19),
      hourly_rate: 52,
      urgent: false,
      notes: "Post-operative recovery coverage.",
      status: "completed",
      assigned_nurse_id: "preview-sarah",
      updated_at: now.toISOString(),
    },
    {
      id: "preview-draft",
      facility_id: "preview-oakwood",
      title: "CNA · Rehabilitation",
      specialty: "CNA",
      department: "Rehabilitation",
      starts_at: at(4, 15),
      ends_at: at(4, 23),
      hourly_rate: 28,
      urgent: false,
      notes:
        "Draft coverage request for rehabilitation support. Review requirements before publishing.",
      status: "draft",
      assigned_nurse_id: null,
      updated_at: now.toISOString(),
    },
    {
      id: "preview-emergency",
      facility_id: "preview-riverside",
      title: "Registered Nurse · Emergency",
      specialty: "RN",
      department: "Emergency Department",
      starts_at: at(5, 7),
      ends_at: at(5, 19),
      hourly_rate: 60,
      urgent: false,
      notes:
        "Emergency department coverage. Current BLS, ACLS, and emergency nursing experience required.",
      status: "open",
      assigned_nurse_id: null,
      updated_at: now.toISOString(),
    },
  ];
  const profile = profiles.find((p) => p.role === role)!;
  return {
    profile,
    profiles:
      role === "admin"
        ? profiles
        : role === "facility"
          ? profiles.filter((p) => p.role === "nurse" || p.id === profile.id)
          : [profile],
    facilities: [
      {
        id: "preview-oakwood",
        name: "Oakwood Medical Center",
        city: "Charlotte",
        state: "NC",
        address: "100 Oakwood Avenue",
        verification_status: "verified",
        subscription_status: "active",
        active: true,
      },
      ...(role === "facility"
        ? []
        : [
            {
              id: "preview-riverside",
              name: "Riverside Care Hospital",
              city: "Raleigh",
              state: "NC",
              address: "240 Riverside Drive",
              verification_status: "pending" as const,
              subscription_status: "inactive",
              active: true,
            },
          ]),
    ],
    shifts: shifts.filter(
      (s) =>
        role === "admin" ||
        (role === "facility" && s.facility_id === profile.facility_id) ||
        (role === "nurse" &&
          ((s.status === "open" && s.facility_id === "preview-oakwood") ||
            s.assigned_nurse_id === profile.id)),
    ),
    applications: [
      {
        id: "preview-app-1",
        shift_id: "preview-medsurg",
        nurse_id: "preview-emily",
        status: "pending",
        created_at: at(-1, 14),
      },
      {
        id: "preview-app-2",
        shift_id: "preview-lpn",
        nurse_id: "preview-james",
        status: "pending",
        created_at: at(-1, 15),
      },
      {
        id: "preview-app-3",
        shift_id: "preview-icu",
        nurse_id: "preview-sarah",
        status: "pending",
        created_at: at(-1, 16),
      },
    ].filter(
      (a) => role !== "nurse" || a.nurse_id === profile.id,
    ) as WorkspaceData["applications"],
    timesheets: [
      {
        id: "preview-timesheet",
        shift_id: "preview-recovery",
        nurse_id: "preview-sarah",
        clock_in: at(-1, 7),
        clock_out: at(-1, 19),
        approved_at: null,
      },
    ],
    notifications: [
      {
        id: "preview-notification-1",
        user_id: profile.id,
        title:
          role === "facility"
            ? "Applications ready to review"
            : role === "nurse"
              ? "Urgent coverage opportunity"
              : "Facility verification needed",
        body:
          role === "facility"
            ? "Review the sample applications to explore your approval workflow."
            : role === "nurse"
              ? "Explore the sample Med/Surg shift and its requirements."
              : "Riverside Care Hospital illustrates a facility awaiting review.",
        read_at: null,
        created_at: at(0, 8),
      },
      {
        id: "preview-notification-2",
        user_id: profile.id,
        title: "Development screen review",
        body: "These fictional records let you review the actual Next.js screens. Live actions require Supabase.",
        read_at: at(0, 9),
        created_at: at(-1, 11),
      },
    ],
    priority_nurses:
      role === "nurse"
        ? []
        : [
            { facility_id: "preview-oakwood", nurse_id: "preview-sarah" },
            { facility_id: "preview-oakwood", nurse_id: "preview-emily" },
          ],
    nurse_details: profiles
      .filter(
        (p) => p.role === "nurse" && (role !== "nurse" || p.id === profile.id),
      )
      .map((p, i) => ({
        id: p.id,
        specialty:
          [
            "Critical Care",
            "Medical / Surgical",
            "Long-term Care",
            "Rehabilitation",
          ][i] ?? "Nursing",
        city: "Charlotte",
        state: "NC",
        experience_years: [8, 6, 5, 3][i] ?? 3,
        bio: "Fictional professional profile for development screen review. Experienced in collaborative, patient-centered care.",
      })),
    nurse_credentials:
      role === "facility"
        ? []
        : profiles
            .filter(
              (p) =>
                p.role === "nurse" && (role === "admin" || p.id === profile.id),
            )
            .map((p) => ({
              nurse_id: p.id,
              license_number:
                "FICTIONAL-PREVIEW-" +
                p.id.replace("preview-", "").toUpperCase(),
              license_state: "NC",
              license_expires: at(365, 12).slice(0, 10),
            })),
  };
}
