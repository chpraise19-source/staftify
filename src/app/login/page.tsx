import { developmentPreviewEnabled } from "@/lib/development/config";
import AccountForm from "@/components/account-form";
import { configured } from "@/lib/supabase";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; type?: string }>;
}) {
  const { error, type } = await searchParams;
  return (
    <AccountForm
      mode="login"
      initialType={type === "nurse" ? "nurse" : "facility"}
      configured={configured()}
      previewEnabled={developmentPreviewEnabled()}
      initialError={
        error === "invalid_link"
          ? "Your confirmation link expired or is invalid. Sign in again or request another confirmation email."
          : undefined
      }
    />
  );
}
