import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountType, UserRole } from "@/generated/prisma/enums";
import { moduleHighlights } from "@/lib/app-config";
import {
  canRecordInspection,
  getTeacherPositionContext,
  requireAuthenticatedSession,
} from "@/lib/authorization";

const moduleLinks = [
  { href: "/dashboard/structure", label: "学校结构", meta: "年级、班级、部门、学科" },
  { href: "/dashboard/users", label: "用户权限", meta: "账号、角色、年级与教师绑定" },
  { href: "/dashboard/people", label: "师生档案", meta: "维护、筛选、导入导出" },
  { href: "/dashboard/archive/students", label: "往届存档", meta: "归档学生查询与修正" },
  { href: "/dashboard/inspection", label: "常规检查", meta: "学生/教师量化记录" },
  { href: "/dashboard/approvals", label: "申请审批", meta: "报修、打印、其他申请" },
  { href: "/dashboard/exports", label: "统计导出", meta: "汇总、Excel、CSV" },
];

const operationsLink = {
  href: "/dashboard/data-management",
  label: "数据管理",
  meta: "备份保护、审计查看、数据清理",
};

function canUseStudentQuickSearch(userRole: UserRole) {
  return (
    userRole === UserRole.SYSTEM_ADMIN ||
    userRole === UserRole.ACADEMIC_AFFAIRS_STAFF ||
    userRole === UserRole.ADMIN_OFFICE_STAFF ||
    userRole === UserRole.SCHOOL_LEADER ||
    userRole === UserRole.DEPARTMENT_LEADER ||
    userRole === UserRole.GRADE_MANAGER
  );
}

function getTaskLinks(
  userRole: UserRole,
  positions: Awaited<ReturnType<typeof getTeacherPositionContext>>,
) {
  const taskLinks: Array<{ href: string; label: string; action: string }> = [];

  if (canUseStudentQuickSearch(userRole)) {
    taskLinks.push({
      href: "/dashboard/quick/students",
      label: "学生快查",
      action: "立即查询",
    });
  }

  if (canRecordInspection(userRole, positions)) {
    taskLinks.push({
      href: "/dashboard/quick/inspection",
      label: "量化快录",
      action: "开始录入",
    });
  }

  taskLinks.push({
    href: "/dashboard/approvals",
    label: userRole === UserRole.TEACHER ? "发起申请" : "申请审批",
    action: userRole === UserRole.TEACHER ? "立即提交" : "查看待办",
  });

  return taskLinks;
}

export default async function DashboardPage() {
  const session = await requireAuthenticatedSession();

  if (session.user.accountType === AccountType.STUDENT) {
    redirect("/dashboard/account/password");
  }

  const positions = await getTeacherPositionContext(session);
  const taskLinks = getTaskLinks(session.user.role, positions);

  return (
    <div className="space-y-5">
      <section className="elegant-page-hero rounded-[28px] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="soft-kicker">校务后台</span>
            <h1 className="mt-4 text-4xl font-semibold tracking-normal text-[var(--text-primary)]">
              校务总台
              <span className="text-[var(--accent)]">.</span>
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
              当前版本围绕档案、检查、统计、数据运维和申请审批组织，优先保障录入、查询、审批、导入导出和权限边界。
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center lg:min-w-[360px]">
            <div className="dashboard-metric">
              <div className="text-2xl font-semibold text-[var(--accent-strong)]">7</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">业务模块</div>
            </div>
            <div className="dashboard-metric">
              <div className="text-2xl font-semibold text-[var(--slate-blue)]">1</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">运维入口</div>
            </div>
            <div className="dashboard-metric">
              <div className="text-2xl font-semibold text-[var(--coral)]">3</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">活跃届别</div>
            </div>
          </div>
        </div>
      </section>

      {taskLinks.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {taskLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="elegant-action-card group rounded-[24px] p-5 transition hover:-translate-y-0.5 hover:border-[var(--accent)]"
            >
              <span className="soft-kicker">常用任务</span>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
                    {item.label}
                  </h2>
                </div>
                <span className="shrink-0 text-sm font-semibold text-[var(--coral)] transition group-hover:translate-x-0.5">
                  {item.action}
                </span>
              </div>
            </Link>
          ))}
        </section>
      ) : null}

      <section className="dashboard-overview-grid">
        {moduleLinks.map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            className="elegant-action-card group rounded-[28px] p-4 transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-white"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent-strong)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="text-sm text-[var(--coral)] transition group-hover:translate-x-0.5">
                进入
              </span>
            </div>
            <div className="mt-4">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                {item.label}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {item.meta}
              </p>
            </div>
          </Link>
        ))}
      </section>

      {session.user.role === UserRole.SYSTEM_ADMIN ? (
        <section className="elegant-action-card rounded-[28px] p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <span className="soft-kicker">运维入口</span>
              <h2 className="mt-3 text-xl font-semibold text-[var(--text-primary)]">
                {operationsLink.label}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {operationsLink.meta}。该入口仅系统管理员可见，所有删除操作仍要求先完成数据库备份。
              </p>
            </div>
            <Link
              href={operationsLink.href}
              className="elegant-primary-link inline-flex h-11 items-center justify-center rounded-md bg-[var(--accent-strong)] px-5 text-sm font-semibold text-white"
            >
              打开数据管理
            </Link>
          </div>
        </section>
      ) : null}

      <section>
        <article className="rounded-[28px] border border-[var(--panel-border)] bg-[#fffdf8] p-5">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--panel-border)] pb-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              模块职责
            </h2>
            <span className="text-xs text-[var(--text-muted)]">按业务边界维护</span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {moduleHighlights.map((item) => (
              <div key={item.title} className="border-l-2 border-[var(--coral)] pl-3">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                  {item.description}
                </p>
              </div>
            ))}
            <div className="border-l-2 border-[var(--coral)] pl-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                申请审批
              </h3>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                教师提交报修、打印和其他申请，审批人员按职责范围处理并留下审计记录。
              </p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
