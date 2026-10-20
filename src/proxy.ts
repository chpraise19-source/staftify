import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function proxy(req: NextRequest) {
  if (
    ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
    req.nextUrl.pathname !== "/api/stripe/webhook"
  ) {
    const origin = req.headers.get("origin");
    const trusted = process.env.APP_URL
      ? new URL(process.env.APP_URL).origin
      : req.nextUrl.origin;
    if (origin && origin !== trusted)
      return NextResponse.json(
        { error: "Invalid request origin" },
        { status: 403 },
      );
  }
  let response = NextResponse.next({ request: req });
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    return response;
  const db = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (values) => {
          values.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: req });
          values.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  // Validate/refresh tokens server-side. Never authorize from an unverified getSession() payload.
  await db.auth.getUser();
  return response;
}
export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/api/:path*"],
};
