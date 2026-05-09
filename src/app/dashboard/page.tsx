import Link from "next/link";
import { UserRole } from "@/generated/prisma/enums";
import { moduleHighlights } from "@/lib/app-config";
import {
  canRecordInspection,
  requireAuthenticatedSession,
} from "@/lib/authorization";

const nextMilestones = [
  "用真实 PostgreSQL 环境持续复核登录、录入、导入、导出和数据清理流程",
  "后续功能继续按独立业务模块落地，避免跨模块耦合",
  "保持备份、恢复和试点机运维文档与现场配置一致",
  "根据试点反馈决定下一阶段功能增减和流程调整",
];

const moduleLinks = [
  { href: "/dashboard/structure", label: "学校结构", meta: "年级、班级、部门、学科" },
  { href: "/dashboard/users", label: "用户权限", meta: "账号、角色、年级范围" },
  { href: "/dashboard/data-management", label: "数据管理", meta: "备份保护、数据清理" },
  { href: "/dashboard/people", label: "师生档案", meta: "维护、筛选、导入导出" },
  { href: "/dashboard/archive/students", label: "往届存档", meta: "归档学生查询与修正" },
  { href: "/dashboard/inspection", label: "常规检查", meta: "学生/教师量化记录" },
  { href: "/dashboard/exports", label: "统计导出", meta: "汇总、Excel、CSV" },
];

function canUseStudentQuickSearch(userRole: UserRole) {
  return (
    userRole === UserRole.SYSTEM_ADMIN ||
    userRole === UserRole.DATA_MANAGER ||
    userRole === UserRole.SCHOOL_LEADER ||
    userRole === UserRole.GRADE_MANAGER
  );
}

function getTaskLinks(userRole: UserRole) {
  const taskLinks = [];

  if (canUseStudentQuickSearch(userRole)) {
    taskLinks.push({
      href: "/dashboard/quick/students",
      label: "学生快查",
      meta: "手机上先搜学生，不进入完整维护页",
      action: "立即查询",
    });
  }

  if (canRecordInspection(userRole)) {
    taskLinks.push({
      href: "/dashboard/quick/inspection",
      label: "量化快录",
      meta: "只保留日期、项目、对象、数值和备注",
      action: "开始录入",
    });
  }

  return taskLinks;
}

export default async function DashboardPage() {
  const session = await requireAuthenticatedSession();
  const taskLinks = getTaskLinks(session.user.role);

  return (
    <div className="space-y-5">
      <section className="paper-panel rounded-[28px] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="soft-kicker">校务后台</span>
            <h1 className="mt-4 text-3xl font-semibold text-[var(--text-primary)]">
              校务总台
              <span className="text-[var(--coral)]">.</span>
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
              当前版本围绕学校结构、用户权限、师生档案、往届存档、常规检查、统计导出和数据运维组织，优先保障筛选、录入、导入导出和权限边界。
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center lg:min-w-[360px]">
            <div className="dashboard-metric">
              <div className="text-2xl font-semibold text-[var(--accent-strong)]">7</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">后台入口</div>
            </div>
            <div className="dashboard-metric">
              <div className="text-2xl font-semibold text-emerald-700">3</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">活跃届别</div>
            </div>
            <div className="dashboard-metric">
              <div className="text-2xl font-semibold text-amber-700">1</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">试点学校</div>
            </div>
          </div>
        </div>
      </section>

      {taskLinks.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2">
          {taskLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-[24px] border border-[var(--panel-border)] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[0_12px_30px_rgba(18,45,42,0.08)]"
            >
              <span className="soft-kicker">常用任务</span>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
                    {item.label}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {item.meta}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-[var(--accent-soft)] px-3 py-2 text-sm font-semibold text-[var(--accent-strong)] transition group-hover:bg-[var(--accent-strong)] group-hover:text-white">
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
            className="group rounded-[28px] border border-[var(--panel-border)] bg-[#fffdf8] p-4 transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-white hover:shadow-[0_12px_30px_rgba(18,45,42,0.08)]"
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

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[28px] border border-[var(--panel-border)] bg-[#fffdf8] p-5">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--panel-border)] pb-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              模块职责
            </h2>
            <span className="text-xs text-[var(--text-muted)]">按业务边界维护</span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
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
          </div>
        </article>

        <article className="rounded-[28px] border border-[var(--panel-border)] bg-[#fffdf8] p-5">
          <div className="border-b border-[var(--panel-border)] pb-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              下一阶段任务
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              继续围绕真实试点反馈做稳定化。
            </p>
          </div>
          <ol className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
            {nextMilestones.map((item, index) => (
              <li key={item} className="grid grid-cols-[28px_1fr] gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--coral-soft)] text-xs font-semibold text-[var(--coral)]">
                  {index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </article>
      </section>
    </div>
  );
}
