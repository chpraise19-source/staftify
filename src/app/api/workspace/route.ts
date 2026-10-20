import { requireUser, apiError } from "@/lib/auth";
export async function GET() {
  try {
    const { db, profile } = await requireUser();
    const tables = [
      "profiles",
      "facilities",
      "shifts",
      "applications",
      "timesheets",
      "notifications",
      "priority_nurses",
      "nurse_details",
      "nurse_credentials",
    ] as const;
    const results = await Promise.all(
      tables.map(async (table) => {
        let query = db.from(table).select("*");
        if (table === "shifts")
          query = query.order("starts_at", { ascending: false });
        if (table === "notifications")
          query = query.order("created_at", { ascending: false });
        const { data, error } = await query.limit(500);
        if (error) throw error;
        return [table, data] as const;
      }),
    );
    return Response.json(
      { profile, ...Object.fromEntries(results) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
