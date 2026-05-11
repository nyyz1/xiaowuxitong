"use client";

import { useState, type PropsWithChildren } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button, Drawer, Grid, Layout, Menu, Space, Typography } from "antd";
import type { MenuProps } from "antd";
import { TeacherDepartmentIdentityType, UserRole } from "@/generated/prisma/enums";
import { LogoutButton } from "@/components/shell/logout-button";
import { appConfig } from "@/lib/app-config";
import { userRoleLabels } from "@/lib/role-labels";

const { Header, Content, Sider } = Layout;
const { useBreakpoint } = Grid;

type DashboardShellProps = PropsWithChildren<{
  userName: string;
  userRole: UserRole;
  teacherIdentityTypes?: TeacherDepartmentIdentityType[];
}>;

function hasIdentity(
  teacherIdentityTypes: TeacherDepartmentIdentityType[],
  identityType: TeacherDepartmentIdentityType,
) {
  return teacherIdentityTypes.includes(identityType);
}

function canSeeArchiveMenu(userRole: UserRole) {
  return (
    userRole === UserRole.SYSTEM_ADMIN ||
    userRole === UserRole.ACADEMIC_AFFAIRS_STAFF ||
    userRole === UserRole.ADMIN_OFFICE_STAFF ||
    userRole === UserRole.SCHOOL_LEADER
  );
}

function canSeeDataManagementMenu(userRole: UserRole) {
  return userRole === UserRole.SYSTEM_ADMIN;
}

function canSeePeopleMenu(
  userRole: UserRole,
  teacherIdentityTypes: TeacherDepartmentIdentityType[],
) {
  if (
    hasIdentity(teacherIdentityTypes, TeacherDepartmentIdentityType.STUDENT_AFFAIRS_STAFF) ||
    hasIdentity(teacherIdentityTypes, TeacherDepartmentIdentityType.ACADEMIC_AFFAIRS_STAFF) ||
    hasIdentity(teacherIdentityTypes, TeacherDepartmentIdentityType.DEPARTMENT_LEADER)
  ) {
    return true;
  }

  return (
    userRole !== UserRole.TEACHER &&
    userRole !== UserRole.LOGISTICS_STAFF &&
    userRole !== UserRole.DEPARTMENT_LEADER
  );
}

function canSeeInspectionMenu(
  userRole: UserRole,
  teacherIdentityTypes: TeacherDepartmentIdentityType[],
) {
  if (
    hasIdentity(teacherIdentityTypes, TeacherDepartmentIdentityType.STUDENT_AFFAIRS_STAFF) ||
    hasIdentity(teacherIdentityTypes, TeacherDepartmentIdentityType.ACADEMIC_AFFAIRS_STAFF)
  ) {
    return true;
  }

  return (
    userRole === UserRole.SYSTEM_ADMIN ||
    userRole === UserRole.SCHOOL_LEADER ||
    userRole === UserRole.STUDENT_AFFAIRS_STAFF ||
    userRole === UserRole.ACADEMIC_AFFAIRS_STAFF ||
    userRole === UserRole.GRADE_MANAGER
  );
}

function canSeeReportMenu(userRole: UserRole) {
  return userRole !== UserRole.TEACHER && userRole !== UserRole.LOGISTICS_STAFF;
}

function canSeeStudentQuickSearch(userRole: UserRole) {
  return (
    userRole === UserRole.SYSTEM_ADMIN ||
    userRole === UserRole.ACADEMIC_AFFAIRS_STAFF ||
    userRole === UserRole.ADMIN_OFFICE_STAFF ||
    userRole === UserRole.SCHOOL_LEADER ||
    userRole === UserRole.DEPARTMENT_LEADER ||
    userRole === UserRole.GRADE_MANAGER
  );
}

function canSeeInspectionQuickEntry(
  userRole: UserRole,
  teacherIdentityTypes: TeacherDepartmentIdentityType[],
) {
  if (
    hasIdentity(teacherIdentityTypes, TeacherDepartmentIdentityType.STUDENT_AFFAIRS_STAFF) ||
    hasIdentity(teacherIdentityTypes, TeacherDepartmentIdentityType.ACADEMIC_AFFAIRS_STAFF)
  ) {
    return true;
  }

  return (
    userRole === UserRole.SYSTEM_ADMIN ||
    userRole === UserRole.STUDENT_AFFAIRS_STAFF ||
    userRole === UserRole.GRADE_MANAGER
  );
}

function buildMenuItems(
  userRole: UserRole,
  teacherIdentityTypes: TeacherDepartmentIdentityType[],
  onNavigate?: () => void,
): NonNullable<MenuProps["items"]> {
  const items: NonNullable<MenuProps["items"]> = [
    {
      key: "overview",
      label: (
        <Link href="/dashboard" onClick={onNavigate}>
          系统总览
        </Link>
      ),
    },
  ];

  if (userRole === UserRole.SYSTEM_ADMIN) {
    items.push(
      {
        key: "structure",
        label: (
          <Link href="/dashboard/structure" onClick={onNavigate}>
            学校结构
          </Link>
        ),
      },
      {
        key: "users",
        label: (
          <Link href="/dashboard/users" onClick={onNavigate}>
            用户权限
          </Link>
        ),
      },
    );
  }

  if (canSeeDataManagementMenu(userRole)) {
    items.push({
      key: "data-management",
      label: (
        <Link href="/dashboard/data-management" onClick={onNavigate}>
          数据管理
        </Link>
      ),
    });
  }

  if (canSeePeopleMenu(userRole, teacherIdentityTypes)) {
    items.push({
      key: "people",
      label: (
        <Link href="/dashboard/people" onClick={onNavigate}>
          师生档案
        </Link>
      ),
    });
  }

  if (canSeeArchiveMenu(userRole)) {
    items.push({
      key: "archive",
      label: (
        <Link href="/dashboard/archive/students" onClick={onNavigate}>
          往届存档
        </Link>
      ),
    });
  }

  if (canSeeInspectionMenu(userRole, teacherIdentityTypes)) {
    items.push({
      key: "inspection",
      label: (
        <Link href="/dashboard/inspection" onClick={onNavigate}>
          常规检查
        </Link>
      ),
    });
  }

  items.push({
    key: "approvals",
    label: (
      <Link href="/dashboard/approvals" onClick={onNavigate}>
        申请审批
      </Link>
    ),
  });

  if (canSeeReportMenu(userRole)) {
    items.push({
      key: "exports",
      label: (
        <Link href="/dashboard/exports" onClick={onNavigate}>
          统计导出
        </Link>
      ),
    });
  }

  return items;
}

type SearchParamReader = {
  get(name: string): string | null;
};

function getSelectedKey(pathname: string) {
  if (pathname.startsWith("/dashboard/structure")) return "structure";
  if (pathname.startsWith("/dashboard/users")) return "users";
  if (pathname.startsWith("/dashboard/data-management")) return "data-management";
  if (pathname.startsWith("/dashboard/archive")) return "archive";
  if (pathname.startsWith("/dashboard/people")) return "people";
  if (pathname.startsWith("/dashboard/inspection")) return "inspection";
  if (pathname.startsWith("/dashboard/approvals")) return "approvals";
  if (pathname.startsWith("/dashboard/exports")) return "exports";
  return "overview";
}

function getModuleLabel(pathname: string, searchParams: SearchParamReader) {
  if (pathname.startsWith("/dashboard/quick/students")) return "学生快查";
  if (pathname.startsWith("/dashboard/quick/inspection")) return "量化快录";
  if (pathname.startsWith("/dashboard/users")) return "用户权限已启用";
  if (pathname.startsWith("/dashboard/data-management")) return "数据管理已启用";
  if (pathname.startsWith("/dashboard/archive")) return "往届存档已启用";
  if (pathname.startsWith("/dashboard/exports")) return "统计导出已启用";
  if (pathname.startsWith("/dashboard/approvals")) return "申请审批已启用";
  if (pathname.startsWith("/dashboard/inspection")) return "常规检查已就绪";

  if (pathname.startsWith("/dashboard/people")) {
    return searchParams.get("view") === "teachers"
      ? "教师档案已就绪"
      : "学生档案已就绪";
  }

  if (pathname.startsWith("/dashboard/structure")) return "学校结构已就绪";
  return "校务后台";
}

export function DashboardShell({
  children,
  userName,
  userRole,
  teacherIdentityTypes = [],
}: DashboardShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const screens = useBreakpoint();
  const isDesktop = screens.lg ?? false;
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const menuItems = buildMenuItems(userRole, teacherIdentityTypes, () =>
    setIsMobileNavOpen(false),
  );
  const roleLabel = userRoleLabels[userRole];
  const userSummary =
    userName.trim() && userName.trim() !== roleLabel
      ? `当前用户：${userName} · ${roleLabel}`
      : `当前用户：${roleLabel}`;

  return (
    <Layout className="dashboard-shell">
      {isDesktop ? (
        <Sider
          width={248}
          theme="light"
          className="dashboard-sidebar"
          style={{
            background: "rgba(255,255,255,0.86)",
            borderRight: "1px solid var(--panel-border)",
            boxShadow: "12px 0 34px rgba(15,23,42,0.045)",
            backdropFilter: "blur(22px)",
          }}
        >
          <div className="flex h-full flex-col px-4 py-5 text-[var(--text-primary)]">
            <div className="mb-6 border-b border-[var(--panel-border)] pb-5">
              <div className="flex items-center gap-3">
                <div className="archive-mark">校</div>
                <div>
                  <Typography.Text className="!text-xs !font-semibold !text-[var(--text-muted)]">
                    SCHOOL AFFAIRS
                  </Typography.Text>
                  <Typography.Title
                    level={4}
                    className="!mb-0 !mt-0 !text-[var(--text-primary)]"
                  >
                    {appConfig.name}
                  </Typography.Title>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <span className="coral-dot" />
                <span>档案、检查与审批工作台</span>
              </div>
            </div>

            <Menu
              mode="inline"
              selectedKeys={[getSelectedKey(pathname)]}
              items={menuItems}
              style={{
                background: "transparent",
                color: "var(--text-secondary)",
                border: "none",
                flex: 1,
              }}
              theme="light"
            />
          </div>
        </Sider>
      ) : (
        <Drawer
          open={isMobileNavOpen}
          placement="left"
          width={264}
          onClose={() => setIsMobileNavOpen(false)}
          title={
            <div className="flex items-center gap-3">
              <div className="archive-mark">校</div>
              <div>
                <div className="text-xs font-semibold text-[var(--text-muted)]">
                  SCHOOL AFFAIRS
                </div>
                <div className="text-base font-semibold text-[var(--text-primary)]">
                  {appConfig.name}
                </div>
              </div>
            </div>
          }
          className="dashboard-mobile-drawer"
          styles={{
            body: {
              padding: 12,
            },
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[getSelectedKey(pathname)]}
            items={menuItems}
            style={{
              background: "transparent",
              color: "var(--text-secondary)",
              border: "none",
            }}
            theme="light"
          />
        </Drawer>
      )}

      <Layout className="!bg-transparent">
        <Header
          className={`dashboard-topbar !z-10 !flex !h-auto !flex-wrap !items-center !justify-between !gap-3 !px-4 !py-3 md:!px-6 md:!py-4 ${
            isDesktop ? "!sticky !top-0" : "!relative"
          }`}
        >
          <div className="flex items-start gap-3">
            {!isDesktop ? (
              <Button
                className="dashboard-mobile-nav-trigger"
                onClick={() => setIsMobileNavOpen(true)}
              >
                菜单
              </Button>
            ) : null}
            <div>
              <Typography.Title level={4} className="!mb-1 !text-[var(--text-primary)]">
                {getModuleLabel(pathname, searchParams)}
              </Typography.Title>
              <Typography.Text className="!text-sm !text-[var(--text-secondary)]">
                {userSummary}
              </Typography.Text>
            </div>
          </div>

          <Space size="small" wrap className="dashboard-topbar-actions !justify-end">
            {canSeeStudentQuickSearch(userRole) ? (
              <Link
                href="/dashboard/quick/students"
                className="elegant-secondary-link inline-flex h-9 items-center rounded-md border border-[var(--panel-border)] bg-white px-3 text-sm font-semibold text-[var(--accent-strong)]"
              >
                学生快查
              </Link>
            ) : null}
            {canSeeInspectionQuickEntry(userRole, teacherIdentityTypes) ? (
              <Link
                href="/dashboard/quick/inspection"
                className="elegant-secondary-link inline-flex h-9 items-center rounded-md border border-[var(--panel-border)] bg-white px-3 text-sm font-semibold text-[var(--accent-strong)]"
              >
                量化快录
              </Link>
            ) : null}
            <Link
              href="/dashboard/approvals"
              className="elegant-secondary-link inline-flex h-9 items-center rounded-md border border-[var(--panel-border)] bg-white px-3 text-sm font-semibold text-[var(--accent-strong)]"
            >
              申请审批
            </Link>
            <LogoutButton />
          </Space>
        </Header>

        <Content className="px-4 py-5 md:px-6 md:py-6">
          <main className="dashboard-content min-h-[calc(100vh-116px)]">
            {children}
          </main>
        </Content>
      </Layout>
    </Layout>
  );
}
