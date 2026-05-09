import type { ReactNode } from "react";
import Link from "next/link";
import { getTeacherDepartmentNames } from "@/modules/people/helpers";
import {
  inspectionTargetTypeLabels,
  type InspectionTargetTypeValue,
} from "@/lib/validation/inspection";
import type {
  ReportFilters,
  SummaryRow,
  getInspectionReportData,
} from "@/modules/reporting/queries";

type InspectionReportData = Awaited<ReturnType<typeof getInspectionReportData>>;
type Category = InspectionReportData["categories"][number];
type GradeOption = InspectionReportData["gradeOptions"][number];
type ClassOption = InspectionReportData["classOptions"][number];
type TeacherOption = InspectionReportData["teacherOptions"][number];

type ExportsPageProps = {
  data: InspectionReportData;
  filters: ReportFilters;
  access: {
    isGradeScoped: boolean;
    canAccessTeacherQuantification: boolean;
  };
};

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function buildExportHref(path: string, filters: ReportFilters) {
  const params = new URLSearchParams({
    targetType: filters.targetType,
  });

  for (const [key, value] of Object.entries(filters)) {
    if (!value || key === "targetType") {
      continue;
    }

    params.set(key, value);
  }

  return `${path}?${params.toString()}`;
}

function buildTargetHref(
  targetType: InspectionTargetTypeValue,
  filters: ReportFilters,
) {
  const params = new URLSearchParams({
    targetType,
  });

  if (filters.dateFrom) {
    params.set("dateFrom", filters.dateFrom);
  }

  if (filters.dateTo) {
    params.set("dateTo", filters.dateTo);
  }

  if (filters.categoryId) {
    params.set("categoryId", filters.categoryId);
  }

  if (filters.itemId) {
    params.set("itemId", filters.itemId);
  }

  if (targetType === "TEACHER") {
    if (filters.teacherId) {
      params.set("teacherId", filters.teacherId);
    }
  } else {
    if (filters.gradeId) {
      params.set("gradeId", filters.gradeId);
    }

    if (filters.classId) {
      params.set("classId", filters.classId);
    }
  }

  return `/dashboard/exports?${params.toString()}`;
}

function getTeacherOptionLabel(teacher: {
  name: string;
  idCardNumber?: string | null;
  department?: {
    name: string;
  } | null;
  departmentAssignments?: Array<{
    departmentId: string;
    department?: {
      id: string;
      name: string;
    } | null;
  }>;
}) {
  const parts = [`${teacher.name} / ${teacher.idCardNumber ?? "未填写身份证号"}`];

  const departmentNames = getTeacherDepartmentNames(teacher);

  if (departmentNames.length > 0) {
    parts.push(departmentNames.join("、"));
  }

  return parts.join(" / ");
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--panel-border)] bg-white/78 p-6">
      <div className="flex flex-col gap-2 border-b border-[var(--panel-border)] pb-5">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">{title}</h2>
        <p className="max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
          {description}
        </p>
      </div>
      <div className="pt-6">{children}</div>
    </section>
  );
}

function TargetTypeTabs({
  filters,
  canAccessTeacherQuantification,
}: {
  filters: ReportFilters;
  canAccessTeacherQuantification: boolean;
}) {
  const options: Array<{
    targetType: InspectionTargetTypeValue;
    href: string;
  }> = [
    {
      targetType: "STUDENT",
      href: buildTargetHref("STUDENT", filters),
    },
  ];

  if (canAccessTeacherQuantification) {
    options.push({
      targetType: "TEACHER",
      href: buildTargetHref("TEACHER", filters),
    });
  }

  return (
    <div className="inline-flex flex-wrap gap-2 rounded-full border border-[var(--panel-border)] bg-white/80 p-2">
      {options.map((option) => {
        const isActive = filters.targetType === option.targetType;

        return (
          <Link
            key={option.targetType}
            href={option.href}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              isActive
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--text-secondary)] hover:bg-[var(--panel-soft)]"
            }`}
          >
            {inspectionTargetTypeLabels[option.targetType]}
          </Link>
        );
      })}
    </div>
  );
}

function DateInput({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string;
}) {
  return (
    <input
      type="date"
      name={name}
      defaultValue={defaultValue ?? ""}
      className="h-11 rounded-2xl border border-[var(--panel-border)] bg-white px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
    />
  );
}

function SelectBox({
  name,
  defaultValue,
  children,
}: {
  name: string;
  defaultValue?: string | null;
  children: ReactNode;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? ""}
      className="h-11 rounded-2xl border border-[var(--panel-border)] bg-white px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
    >
      {children}
    </select>
  );
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--panel-border)] bg-white/82 p-5">
      <div className="text-sm text-[var(--text-secondary)]">{label}</div>
      <div className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
        {value}
      </div>
      <div className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{hint}</div>
    </div>
  );
}

function SummaryTable({
  title,
  rows,
  emptyText,
}: {
  title: string;
  rows: SummaryRow[];
  emptyText: string;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--panel-border)] bg-white p-4">
      <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
      {rows.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          {emptyText}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.08em] text-[var(--text-secondary)]">
              <tr>
                <th className="px-3 py-2">名称</th>
                <th className="px-3 py-2">补充</th>
                <th className="px-3 py-2">记录数</th>
                <th className="px-3 py-2">总值</th>
                <th className="px-3 py-2">平均值</th>
                <th className="px-3 py-2">最小值</th>
                <th className="px-3 py-2">最大值</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 12).map((row) => (
                <tr key={row.key} className="bg-[var(--panel-soft)]">
                  <td className="rounded-l-2xl px-3 py-3 font-medium text-[var(--text-primary)]">
                    {row.label}
                  </td>
                  <td className="px-3 py-3 text-[var(--text-secondary)]">
                    {row.subLabel}
                  </td>
                  <td className="px-3 py-3">{row.recordCount}</td>
                  <td className="px-3 py-3">{formatNumber(row.totalValue)}</td>
                  <td className="px-3 py-3">{formatNumber(row.averageValue)}</td>
                  <td className="px-3 py-3">{formatNumber(row.minValue)}</td>
                  <td className="rounded-r-2xl px-3 py-3">{formatNumber(row.maxValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 12 ? (
            <div className="mt-3 text-xs text-[var(--text-secondary)]">
              页面预览前 12 行，完整结果请使用 Excel 或 CSV 导出。
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function CategoryOptions({ categories }: { categories: Category[] }) {
  return (
    <>
      <option value="">全部分类</option>
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </>
  );
}

function ItemOptions({ categories }: { categories: Category[] }) {
  return (
    <>
      <option value="">全部项目</option>
      {categories.flatMap((category) =>
        category.items.map((item) => (
          <option key={item.id} value={item.id}>
            {category.name} / {item.name}
          </option>
        )),
      )}
    </>
  );
}

function GradeOptions({ grades }: { grades: GradeOption[] }) {
  return (
    <>
      <option value="">全部年级</option>
      {grades.map((grade) => (
        <option key={grade.id} value={grade.id}>
          {grade.name}
        </option>
      ))}
    </>
  );
}

function ClassOptions({ classes }: { classes: ClassOption[] }) {
  return (
    <>
      <option value="">全部班级</option>
      {classes.map((classItem) => (
        <option key={classItem.id} value={classItem.id}>
          {classItem.gradeName} / {classItem.name}
        </option>
      ))}
    </>
  );
}

function TeacherOptions({ teachers }: { teachers: TeacherOption[] }) {
  return (
    <>
      <option value="">全部教师</option>
      {teachers.map((teacher) => (
        <option key={teacher.id} value={teacher.id}>
          {getTeacherOptionLabel(teacher)}
        </option>
      ))}
    </>
  );
}

function FilterForm({
  filters,
  categories,
  grades,
  classes,
  teachers,
}: {
  filters: ReportFilters;
  categories: Category[];
  grades: GradeOption[];
  classes: ClassOption[];
  teachers: TeacherOption[];
}) {
  return (
    <form
      method="get"
      className={`grid gap-3 rounded-[24px] bg-[var(--panel-soft)] p-4 ${
        filters.targetType === "TEACHER"
          ? "xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]"
          : "xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_auto]"
      }`}
    >
      <input type="hidden" name="targetType" value={filters.targetType} />
      <DateInput name="dateFrom" defaultValue={filters.dateFrom} />
      <DateInput name="dateTo" defaultValue={filters.dateTo} />
      <SelectBox name="categoryId" defaultValue={filters.categoryId}>
        <CategoryOptions categories={categories} />
      </SelectBox>
      <SelectBox name="itemId" defaultValue={filters.itemId}>
        <ItemOptions categories={categories} />
      </SelectBox>
      {filters.targetType === "TEACHER" ? (
        <SelectBox name="teacherId" defaultValue={filters.teacherId}>
          <TeacherOptions teachers={teachers} />
        </SelectBox>
      ) : (
        <>
          <SelectBox name="gradeId" defaultValue={filters.gradeId}>
            <GradeOptions grades={grades} />
          </SelectBox>
          <SelectBox name="classId" defaultValue={filters.classId}>
            <ClassOptions classes={classes} />
          </SelectBox>
        </>
      )}
      <button className="h-11 rounded-2xl bg-[var(--accent)] px-5 text-sm font-semibold text-white">
        生成统计
      </button>
    </form>
  );
}

export function ExportsPage({ data, filters, access }: ExportsPageProps) {
  const grades = data.gradeOptions;
  const classes = data.classOptions;
  const teachers = data.teacherOptions;
  const targetTypeLabel = inspectionTargetTypeLabels[filters.targetType];
  const xlsxHref = buildExportHref("/dashboard/exports/inspection/xlsx", filters);
  const csvHref = buildExportHref("/dashboard/exports/inspection/csv", filters);
  const scopeSummaryTitle =
    filters.targetType === "TEACHER" ? "按教师汇总" : "按年级/班级汇总";
  const scopeSummaryEmptyText =
    filters.targetType === "TEACHER"
      ? "当前筛选条件下没有教师量化对象统计。"
      : "当前筛选条件下没有学生量化对象统计。";

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <TargetTypeTabs
          filters={filters}
          canAccessTeacherQuantification={access.canAccessTeacherQuantification}
        />

        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[30px] bg-[linear-gradient(135deg,#7c4a1e_0%,#1f7a8c_100%)] p-7 text-white">
            <span className="soft-kicker !bg-white/16 !text-white">统计导出</span>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight">
              {targetTypeLabel}统计导出中心
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80">
              {filters.targetType === "TEACHER"
                ? "围绕教师个人汇总量化结果。页面预览、Excel 和 CSV 导出都会沿用同一套教师量化筛选条件。"
                : access.isGradeScoped
                  ? "当前账号只会看到本年级的学生量化统计，并可导出本年级范围内的 Excel 或 CSV 文件。"
                  : "围绕学生量化的年级、班级和项目口径生成页面统计、Excel 工作簿和 CSV 文件。"}
            </p>
          </div>

          <div className="rounded-[30px] border border-[var(--panel-border)] bg-white/78 p-7">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              导出说明
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
              <li>1. 先筛选时间、项目和对象范围，再下载报表。</li>
              <li>2. Excel 适合校内归档和二次分析，CSV 适合导入其他系统。</li>
              <li>3. 每次导出都会写入审计日志，便于追踪谁在什么条件下导出过数据。</li>
              <li>4. 教师和学生名册导出仍在师生档案页面按当前筛选执行。</li>
            </ul>
            {access.isGradeScoped ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                当前账号已绑定年级范围，系统会自动把统计范围限制在负责年级。
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <SectionCard
        title={`${targetTypeLabel}筛选与导出`}
        description="筛选条件会同时作用于页面预览和下载文件，确保看到的统计口径与导出的口径一致。"
      >
        <FilterForm
          filters={filters}
          categories={data.categories}
          grades={grades}
          classes={classes}
          teachers={teachers}
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={xlsxHref}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--accent)] px-5 text-sm font-semibold text-white"
          >
            导出 Excel 统计
          </a>
          <a
            href={csvHref}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--panel-border)] bg-white px-5 text-sm font-semibold text-[var(--accent)]"
          >
            导出 CSV 统计
          </a>
          <Link
            href="/dashboard/people"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--panel-border)] bg-white px-5 text-sm font-semibold text-[var(--text-primary)]"
          >
            去导出师生档案
          </Link>
          <Link
            href={`/dashboard/exports?targetType=${filters.targetType}`}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--panel-border)] bg-white px-5 text-sm font-semibold text-[var(--text-primary)]"
          >
            清空筛选
          </Link>
        </div>
      </SectionCard>

      {data.kpis.isTruncated ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          当前匹配 {data.kpis.matchedRecords} 条记录，页面统计预览只读取前 {data.recordLimit} 条。
          建议缩小时间范围后再做精细分析。
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="匹配记录数"
          value={String(data.kpis.matchedRecords)}
          hint="当前筛选条件下的全部量化记录"
        />
        <KpiCard
          label="统计总值"
          value={formatNumber(data.kpis.totalValue)}
          hint="将分数、次数、扣分等结果统一求和"
        />
        <KpiCard
          label="平均值"
          value={formatNumber(data.kpis.averageValue)}
          hint="当前统计记录的平均数值"
        />
        <KpiCard
          label="范围"
          value={`${formatNumber(data.kpis.minValue)} - ${formatNumber(data.kpis.maxValue)}`}
          hint="当前统计记录中的最小值和最大值"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <SummaryTable
          title="按检查项目汇总"
          rows={data.byItem}
          emptyText={`当前筛选条件下没有${targetTypeLabel}项目统计。`}
        />
        <SummaryTable
          title={scopeSummaryTitle}
          rows={data.byScope}
          emptyText={scopeSummaryEmptyText}
        />
        <SummaryTable
          title="按日期汇总"
          rows={data.byDate}
          emptyText={`当前筛选条件下没有${targetTypeLabel}日期统计。`}
        />
        <SummaryTable
          title="按结果类型汇总"
          rows={data.byValueType}
          emptyText={`当前筛选条件下没有${targetTypeLabel}结果类型统计。`}
        />
      </section>
    </div>
  );
}
