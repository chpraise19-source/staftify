import { requireUser, apiError } from "@/lib/auth";
export async function GET(req: Request) {
  try {
    const { db } = await requireUser();
    const table = new URL(req.url).searchParams.get("table");
    if (
      !table ||
      ![
        "applications",
        "timesheets",
        "notifications",
        "priority_nurses",
        "profiles",
        "facilities",
        "audit_events",
      ].includes(table)
    )
      throw new Error("Invalid resource");
    const { data, error } = await db.from(table).select("*").limit(200);
    if (error) throw error;
    return Response.json({ data });
  } catch (e) {
    return apiError(e);
  }
}
