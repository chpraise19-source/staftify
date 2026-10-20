import type { Role } from "./domain";
export type Profile = {
  id: string;
  full_name: string;
  role: Role;
  facility_id: string | null;
  credential: "RN" | "LPN" | "CNA" | null;
  verified: boolean;
  onboarding_completed: boolean;
  suspended: boolean;
};
export type Facility = {
  id: string;
  name: string;
  city: string;
  state: string;
  address: string;
  verification_status: "pending" | "verified" | "rejected";
  subscription_status: string;
  active: boolean;
};
export type Shift = {
  id: string;
  facility_id: string;
  title: string;
  specialty: "RN" | "LPN" | "CNA";
  department: string;
  starts_at: string;
  ends_at: string;
  hourly_rate: number;
  urgent: boolean;
  notes: string;
  status: "draft" | "open" | "filled" | "completed" | "cancelled";
  assigned_nurse_id: string | null;
  updated_at: string;
};
export type Application = {
  id: string;
  shift_id: string;
  nurse_id: string;
  status: "pending" | "accepted" | "declined" | "withdrawn";
  created_at: string;
};
export type Timesheet = {
  id: string;
  shift_id: string;
  nurse_id: string;
  clock_in: string;
  clock_out: string | null;
  approved_at: string | null;
};
export type Notification = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};
export type NurseDetails = {
  id: string;
  specialty: string;
  city: string;
  state: string;
  experience_years: number;
  bio: string;
};
export type Credential = {
  nurse_id: string;
  license_number: string;
  license_state: string;
  license_expires: string;
};
export type WorkspaceData = {
  profile: Profile;
  profiles: Profile[];
  facilities: Facility[];
  shifts: Shift[];
  applications: Application[];
  timesheets: Timesheet[];
  notifications: Notification[];
  priority_nurses: { facility_id: string; nurse_id: string }[];
  nurse_details: NurseDetails[];
  nurse_credentials: Credential[];
};
