import { requireUser, apiError } from "@/lib/auth";
import { onboardingSchema } from "@/lib/validation";
export async function POST(req: Request) {
  try {
    const { db, user } = await requireUser(undefined, false);
    if (!user.email_confirmed_at)
      return Response.json(
        { error: "Confirm your email before completing registration." },
        { status: 403 },
      );
    const input = onboardingSchema.parse(await req.json());
    const { data, error } = await db.rpc("complete_onboarding", {
      details: input,
    });
    if (error) throw error;
    return Response.json({ result: data, next: "/dashboard" });
  } catch (e) {
    return apiError(e);
  }
}
