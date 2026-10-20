import { supabase, configured } from "@/lib/supabase";
import { accountSchema } from "@/lib/validation";
import { apiError } from "@/lib/auth";
export async function POST(req: Request) {
  try {
    if (!configured() || !process.env.APP_URL)
      return Response.json(
        {
          error:
            "Registration is awaiting the secure Supabase connection and application URL.",
        },
        { status: 503 },
      );
    const input = accountSchema.parse(await req.json());
    const db = await supabase();
    const { data, error } = await db.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: new URL(
          "/auth/callback",
          process.env.APP_URL,
        ).toString(),
        data: { full_name: input.full_name, account_type: input.account_type },
      },
    });
    if (error)
      return Response.json(
        {
          error:
            error.status === 429
              ? "Too many requests. Please wait before trying again."
              : "Registration could not be completed. If you already have an account, sign in.",
        },
        { status: error.status === 429 ? 429 : 400 },
      );
    return Response.json(
      {
        next: data.session ? "/onboarding" : null,
        message: data.session
          ? "Continue to account setup."
          : "Check your email to confirm your account, then sign in.",
      },
      { status: 201 },
    );
  } catch (e) {
    return apiError(e);
  }
}
