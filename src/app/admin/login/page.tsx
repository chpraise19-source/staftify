import AccountForm from "@/components/account-form";
import { configured } from "@/lib/supabase";
export const metadata = {
  title: "Administrator sign-in | STAFTIFY",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <AccountForm mode="login" adminOnly configured={configured()} />;
}
