import { redirect } from "next/navigation";
import { requireUser, AccessError } from "@/lib/auth";
import { configured } from "@/lib/supabase";
import Onboarding from "@/components/onboarding";
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
  if (session.profile.onboarding_completed || session.profile.role === "admin")
    redirect("/dashboard");
  return (
    <Onboarding
      name={session.profile.full_name}
      initialType={
        session.user.user_metadata.account_type === "facility"
          ? "facility"
          : "nurse"
      }
    />
  );
}
