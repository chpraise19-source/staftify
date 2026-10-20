import { supabase, configured } from "@/lib/supabase";
import { loginSchema } from "@/lib/validation";
import { apiError } from "@/lib/auth";
export async function POST(req: Request) {
  try {
    if (!configured())
      return Response.json(
        {
          error:
            "Administrator sign-in is awaiting the secure Supabase connection.",
        },
        { status: 503 },
      );
    const input = loginSchema.parse(await req.json());
    const db = await supabase();
    const { data, error } = await db.auth.signInWithPassword(input);
    if (error || !data.user)
      return Response.json(
        {
          error:
            "Unable to sign in. Check your account details and email confirmation.",
        },
        { status: 401 },
      );
    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("role,suspended")
      .eq("id", data.user.id)
      .single();
    if (profileError || profile?.role !== "admin" || profile.suspended) {
      await db.auth.signOut();
      return Response.json(
        { error: "An authorized administrator account is required." },
        { status: 403 },
      );
    }
    return Response.json({ next: "/dashboard" });
  } catch (e) {
    return apiError(e);
  }
}
