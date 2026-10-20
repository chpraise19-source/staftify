import { configured, supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (code && configured()) {
    try {
      const db = await supabase();
      const { error } = await db.auth.exchangeCodeForSession(code);
      if (!error)
        return NextResponse.redirect(new URL("/onboarding", url.origin));
    } catch {
      /* Invalid, expired, or temporarily unavailable auth exchange. */
    }
  }
  return NextResponse.redirect(
    new URL("/login?error=invalid_link", url.origin),
  );
}
