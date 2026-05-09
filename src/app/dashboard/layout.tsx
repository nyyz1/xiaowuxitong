import { redirect } from "next/navigation";
import { UserRole } from "@/generated/prisma/enums";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { getBrowserBoundServerSession } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { session } = await getBrowserBoundServerSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardShell
      userName={session.user?.name ?? "系统管理员"}
      userRole={(session.user?.role as UserRole | undefined) ?? UserRole.SYSTEM_ADMIN}
    >
      {children}
    </DashboardShell>
  );
}
