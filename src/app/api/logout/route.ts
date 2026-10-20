import { supabase } from "@/lib/supabase";
import { apiError } from "@/lib/auth";
export async function POST() {
  try {
    const db = await supabase();
    const { error } = await db.auth.signOut();
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
