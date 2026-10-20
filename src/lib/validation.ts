import { z } from "zod";
export const accountSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.email(),
  password: z.string().min(12).max(128),
  account_type: z.enum(["facility", "nurse"]),
});
export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(128),
});
export const onboardingSchema = z.discriminatedUnion("account_type", [
  z.object({
    account_type: z.literal("facility"),
    full_name: z.string().trim().min(2).max(120),
    facility_name: z.string().trim().min(2).max(200),
    city: z.string().trim().min(2).max(120),
    state: z.string().trim().length(2),
    address: z.string().trim().min(5).max(300),
  }),
  z.object({
    account_type: z.literal("nurse"),
    full_name: z.string().trim().min(2).max(120),
  }),
]);
export const professionalSchema = z
  .object({
    full_name: z.string().trim().min(2).max(120),
    credential: z.enum(["RN", "LPN", "CNA"]),
    specialty: z.string().trim().min(2).max(120),
    city: z.string().trim().min(2).max(120),
    state: z.string().trim().length(2),
    experience_years: z.number().int().min(0).max(60),
    bio: z.string().trim().max(2000),
    license_number: z.string().trim().min(3).max(100),
    license_state: z.string().trim().length(2),
    license_expires: z.iso.date(),
  })
  .refine(
    (x) => Date.parse(x.license_expires) >= new Date().setHours(0, 0, 0, 0),
    { message: "A current nursing license is required" },
  );
