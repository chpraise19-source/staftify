import { developmentPreviewEnabled } from "@/lib/development/config";
import AccountForm from "@/components/account-form";
import { configured } from "@/lib/supabase";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  return (
    <AccountForm
      mode="register"
      configured={configured()}
      previewEnabled={developmentPreviewEnabled()}
      initialType={type === "nurse" ? "nurse" : "facility"}
    />
  );
}
