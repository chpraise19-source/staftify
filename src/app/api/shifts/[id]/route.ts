import { requireUser, apiError } from "@/lib/auth";
import { shiftSchema } from "@/lib/domain";
import { z } from "zod";
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db } = await requireUser(["facility"]);
    const { id } = await params;
    z.uuid().parse(id);
    const body = await req.json();
    const op = z.enum(["edit", "publish", "cancel"]).parse(body.operation);
    const details =
      op === "edit"
        ? shiftSchema
            .and(
              z.object({
                department: z.string().trim().min(2).max(120),
                updated_at: z.iso.datetime({ offset: true }),
              }),
            )
            .parse(body.details)
        : z
            .object({ updated_at: z.iso.datetime({ offset: true }) })
            .parse(body.details);
    const { data, error } = await db.rpc("manage_shift", {
      operation: op,
      shift_id: id,
      details,
    });
    if (error) throw error;
    return Response.json({ shift: data });
  } catch (e) {
    return apiError(e);
  }
}
