"use client";

import type { PropsWithChildren } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Layout, Menu, Space, Tag, Typography } from "antd";
import { UserRole } from "@/generated/prisma/enums";
import { LogoutButton } from "@/components/shell/logout-button";
import { appConfig } from "@/lib/app-config";

const { Header, Content, Sider } = Layout;

type DashboardShellProps = PropsWithChildren<{
  userName: string;
  userRole: UserRole;
}>;

const roleLabels: Record<UserRole, string> = {
  SYSTEM_ADMIN: "系统管理员",
  SCHOOL_LEADER: "校领导",
  GRADE_MANAGER: "年级管理员",
  DATA_MANAGER: "数据管理员",
  INSPECTION_STAFF: "检查人员",
};

function canSeeArchiveMenu(userRole: UserRole) {
  return (
    userRole === UserRole.SYSTEM_ADMIN ||
    userRole === UserRole.DATA_MANAGER ||
    userRole === UserRole.SCHOOL_LEADER
  );
}

function canSeeDataManagementMenu(userRole: UserRole) {
  return userRole === UserRole.SYSTEM_ADMIN;
}

function canSeeStudentQuickSearch(userRole: UserRole) {
  return (
    userRole === UserRole.SYSTEM_ADMIN ||
    userRole === UserRole.DATA_MANAGER ||
    userRole === UserRole.SCHOOL_LEADER ||
    userRole === UserRole.GRADE_MANAGER
  );
}

function canSeeInspectionQuickEntry(userRole: UserRole) {
  return (
    userRole === UserRole.SYSTEM_ADMIN ||
    userRole === UserRole.INSPECTION_STAFF ||
    userRole === UserRole.GRADE_MANAGER
  );
}

function buildMenuItems(userRole: UserRole) {
  const items = [
    {
      key: "overview",
      label: <Link href="/dashboard">系统总览</Link>,
    },
    {
      key: "structure",
      label: <Link href="/dashboard/structure">学校结构</Link>,
    },
    {
      key: "users",
      label: <Link href="/dashboard/users">用户权限</Link>,
    },
  ];

  if (canSeeDataManagementMenu(userRole)) {
    items.push({
      key: "data-management",
      label: <Link href="/dashboard/data-management">数据管理</Link>,
    });
  }

  items.push({
    key: "people",
    label: <Link href="/dashboard/people">师生档案</Link>,
  });

  if (canSeeArchiveMenu(userRole)) {
    items.push({
      key: "archive",
      label: <Link href="/dashboard/archive/students">往届存档</Link>,
    });
  }

  items.push(
    {
      key: "inspection",
      label: <Link href="/dashboard/inspection">常规检查</Link>,
    },
    {
      key: "exports",
      label: <Link href="/dashboard/exports">统计导出</Link>,
    },
  );

  return items;
}

type SearchParamReader = {
  get(name: string): string | null;
};

function getSelectedKey(pathname: string) {
  if (pathname.startsWith("/dashboard/structure")) {
    return "structure";
  }

  if (pathname.startsWith("/dashboard/users")) {
    return "users";
  }

  if (pathname.startsWith("/dashboard/data-management")) {
    return "data-management";
  }

  if (pathname.startsWith("/dashboard/archive")) {
    return "archive";
  }

  if (pathname.startsWith("/dashboard/people")) {
    return "people";
  }

  if (pathname.startsWith("/dashboard/inspection")) {
    return "inspection";
  }

  if (pathname.startsWith("/dashboard/exports")) {
    return "exports";
  }

  return "overview";
}

function getModuleLabel(pathname: string, searchParams: SearchParamReader) {
  if (pathname.startsWith("/dashboard/quick/students")) {
    return "学生快查";
  }

  if (pathname.startsWith("/dashboard/quick/inspection")) {
    return "量化快录";
  }

  if (pathname.startsWith("/dashboard/users")) {
    return "用户权限已启用";
  }

  if (pathname.startsWith("/dashboard/data-management")) {
    return "数据管理已启用";
  }

  if (pathname.startsWith("/dashboard/archive")) {
    return "往届存档已启用";
  }

  if (pathname.startsWith("/dashboard/exports")) {
    return "统计导出已启用";
  }

  if (pathname.startsWith("/dashboard/inspection")) {
    return "常规检查已就绪";
  }

  if (pathname.startsWith("/dashboard/people")) {
    return searchParams.get("view") === "teachers"
      ? "教师档案已就绪"
      : "学生档案已就绪";
  }

  if (pathname.startsWith("/dashboard/structure")) {
    return "学校结构已就绪";
  }

  return "校务后台";
}

export function DashboardShell({
  children,
  userName,
  userRole,
}: DashboardShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <Layout className="dashboard-shell">
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
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
              <span>私有部署 · 档案与检查工作台</span>
            </div>
          </div>

          <Menu
            mode="inline"
            selectedKeys={[getSelectedKey(pathname)]}
            items={buildMenuItems(userRole)}
            style={{
              background: "transparent",
              color: "var(--text-secondary)",
              border: "none",
              flex: 1,
            }}
            theme="light"
          />

          <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-soft)] p-3 text-xs leading-6 text-[var(--text-secondary)]">
            <div className="mb-2 flex items-center justify-between border-b border-[var(--panel-border)] pb-2">
              <span>权限边界</span>
              <span className="text-[var(--accent-strong)]">RBAC</span>
            </div>
            导入、导出和删除等敏感操作继续由服务器端权限校验。
          </div>
        </div>
      </Sider>

      <Layout className="!bg-transparent">
        <Header className="dashboard-topbar !sticky !top-0 !z-10 !flex !h-auto !flex-wrap !items-center !justify-between !gap-3 !px-4 !py-3 md:!px-6 md:!py-4">
          <div>
            <Typography.Title level={4} className="!mb-1 !text-[var(--text-primary)]">
              {getModuleLabel(pathname, searchParams)}
            </Typography.Title>
            <Typography.Text className="!text-sm !text-[var(--text-secondary)]">
              当前用户：{userName} · {roleLabels[userRole]}
            </Typography.Text>
          </div>

          <Space size="small" wrap>
            {canSeeStudentQuickSearch(userRole) ? (
              <Link
                href="/dashboard/quick/students"
                className="elegant-secondary-link inline-flex h-9 items-center rounded-md border border-[var(--panel-border)] bg-white px-3 text-sm font-semibold text-[var(--accent-strong)]"
              >
                学生快查
              </Link>
            ) : null}
            {canSeeInspectionQuickEntry(userRole) ? (
              <Link
                href="/dashboard/quick/inspection"
                className="elegant-secondary-link inline-flex h-9 items-center rounded-md border border-[var(--panel-border)] bg-white px-3 text-sm font-semibold text-[var(--accent-strong)]"
              >
                量化快录
              </Link>
            ) : null}
            <Tag
              color="processing"
              className="!rounded-md !border-[var(--panel-border)] !bg-[var(--accent-soft)] !px-3 !py-1 !text-[var(--accent-strong)]"
            >
              私有部署
            </Tag>
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
