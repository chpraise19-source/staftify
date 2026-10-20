import { notFound } from "next/navigation";
import Workspace from "@/components/workspace";
import { developmentPreviewEnabled } from "@/lib/development/config";
import { developmentWorkspace } from "@/lib/development/fixtures";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Development preview | STAFTIFY",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  if (!developmentPreviewEnabled()) notFound();
  const { role } = await params;
  if (role !== "facility" && role !== "nurse" && role !== "admin") notFound();
  const data = developmentWorkspace(role);
  return <Workspace key={role} profile={data.profile} previewData={data} />;
}
