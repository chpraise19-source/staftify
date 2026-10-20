import { requireUser, apiError } from "@/lib/auth";
import { professionalSchema } from "@/lib/validation";
export async function PUT(req: Request) {
  try {
    const { db } = await requireUser(["nurse"]);
    const input = professionalSchema.parse(await req.json());
    const { data, error } = await db.rpc("save_professional_profile", {
      details: input,
    });
    if (error) throw error;
    return Response.json({ result: data });
  } catch (e) {
    return apiError(e);
  }
}
