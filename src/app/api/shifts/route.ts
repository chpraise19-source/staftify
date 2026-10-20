import { requireUser, apiError } from "@/lib/auth";
import { shiftSchema } from "@/lib/domain";
import { z } from "zod";
export async function GET() {
  try {
    const { db } = await requireUser();
    const { data, error } = await db
      .from("shifts")
      .select("*, facilities(name,city,state)")
      .order("starts_at")
      .limit(500);
    if (error) throw error;
    return Response.json({ shifts: data });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(req: Request) {
  try {
    const { db } = await requireUser(["facility"]);
    const input = shiftSchema
      .and(z.object({ department: z.string().trim().min(2).max(120) }))
      .parse(await req.json());
    const { data, error } = await db.rpc("manage_shift", {
      operation: "create",
      shift_id: null,
      details: input,
    });
    if (error) throw error;
    return Response.json({ shift: data }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
