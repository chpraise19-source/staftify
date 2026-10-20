import { test } from "node:test";
import assert from "node:assert/strict";
import {
  accountSchema,
  onboardingSchema,
  professionalSchema,
} from "../src/lib/validation";
test("registration only permits nurse/facility and requires a strong password", () => {
  const input = {
    full_name: "Account Owner",
    email: "owner@example.test",
    password: "strong password for test",
    account_type: "facility",
  };
  assert.equal(accountSchema.safeParse(input).success, true);
  assert.equal(
    accountSchema.safeParse({ ...input, account_type: "admin" }).success,
    false,
  );
  assert.equal(
    accountSchema.safeParse({ ...input, password: "short" }).success,
    false,
  );
});
test("facility onboarding requires location and ownership details", () => {
  const input = {
    account_type: "facility",
    full_name: "Account Owner",
    facility_name: "Real Facility",
    city: "Charlotte",
    state: "NC",
    address: "123 Main Street",
  };
  assert.equal(onboardingSchema.safeParse(input).success, true);
  assert.equal(
    onboardingSchema.safeParse({ ...input, address: "" }).success,
    false,
  );
  assert.equal(
    onboardingSchema.safeParse({ ...input, account_type: "admin" }).success,
    false,
  );
});
test("professional profile requires a current license and valid experience", () => {
  const input = {
    full_name: "Nurse Account",
    credential: "RN",
    specialty: "ICU",
    city: "Charlotte",
    state: "NC",
    experience_years: 5,
    bio: "Critical care experience",
    license_number: "RN12345",
    license_state: "NC",
    license_expires: "2030-01-01",
  };
  assert.equal(professionalSchema.safeParse(input).success, true);
  assert.equal(
    professionalSchema.safeParse({ ...input, license_expires: "2020-01-01" })
      .success,
    false,
  );
  assert.equal(
    professionalSchema.safeParse({ ...input, experience_years: -1 }).success,
    false,
  );
});
