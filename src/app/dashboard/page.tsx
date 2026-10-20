import { redirect } from "next/navigation";
import { requireUser, AccessError } from "@/lib/auth";
import { configured } from "@/lib/supabase";
import Workspace from "@/components/workspace";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (!configured()) redirect("/login");
  let session;
  try {
    session = await requireUser(undefined, false);
  } catch (e) {
    if (e instanceof AccessError && e.status === 401) redirect("/login");
    throw e;
  }
  if (!session.profile.onboarding_completed && session.profile.role !== "admin")
    redirect("/onboarding");
  return <Workspace profile={session.profile} />;
}
