import { requireCompletedProfile } from "@/lib/auth";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCompletedProfile();
  return <>{children}</>;
}