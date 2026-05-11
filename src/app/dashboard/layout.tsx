import { redirect } from "next/navigation";
import { UserRole } from "@/generated/prisma/enums";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { getBrowserBoundServerSession } from "@/lib/auth";
import {
  getTeacherPositionContext,
  type AuthorizedSession,
} from "@/lib/authorization";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { session } = await getBrowserBoundServerSession();

  if (!session) {
    redirect("/login");
  }

  const role = (session.user?.role as UserRole | undefined) ?? UserRole.SYSTEM_ADMIN;
  const positions = await getTeacherPositionContext(session as AuthorizedSession);

  return (
    <DashboardShell
      userName={session.user?.name ?? "系统管理员"}
      userRole={role}
      teacherIdentityTypes={Array.from(positions.identityTypes)}
    >
      {children}
    </DashboardShell>
  );
}
