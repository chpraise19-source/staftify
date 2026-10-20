import { supabase, configured } from "@/lib/supabase";
import { loginSchema } from "@/lib/validation";
import { apiError } from "@/lib/auth";
export async function POST(req: Request) {
  try {
    if (!configured())
      return Response.json(
        { error: "Sign-in is awaiting the secure Supabase connection." },
        { status: 503 },
      );
    const input = loginSchema.parse(await req.json());
    const db = await supabase();
    const { error } = await db.auth.signInWithPassword(input);
    if (error)
      return Response.json(
        {
          error:
            "Unable to sign in. Check your email/password and confirm your email address.",
        },
        { status: 401 },
      );
    return Response.json({ next: "/dashboard" });
  } catch (e) {
    return apiError(e);
  }
}
