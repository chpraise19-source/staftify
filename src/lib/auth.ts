import { supabase } from "./supabase";
import type { Role } from "./domain";
import type { Profile } from "./types";
import { ZodError } from "zod";
export class AccessError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function requireUser(roles?: Role[], onboarded = true) {
  const db = await supabase();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) throw new AccessError("Please sign in to continue.", 401);
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (profileError)
    throw new AccessError(
      "Your account profile could not be loaded. Check the database migrations.",
      503,
    );
  if (!profile || profile.suspended)
    throw new AccessError(
      "Your account is unavailable. Contact your administrator.",
      403,
    );
  if (roles && !roles.includes(profile.role))
    throw new AccessError("You do not have permission to do this.", 403);
  if (onboarded && !profile.onboarding_completed && profile.role !== "admin")
    throw new AccessError("Complete your account setup first.", 409);
  return { db, user, profile: profile as Profile };
}
export function apiError(error: unknown) {
  if (error instanceof AccessError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError)
    return Response.json(
      { error: error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  if (error instanceof Error && error.message === "Supabase is not configured")
    return Response.json(
      { error: "STAFTIFY is awaiting its secure Supabase connection." },
      { status: 503 },
    );
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "P0001" &&
    "message" in error
  )
    return Response.json({ error: String(error.message) }, { status: 409 });
  return Response.json(
    {
      error:
        "The operation could not be completed. Please retry or contact your administrator.",
    },
    { status: 500 },
  );
}
