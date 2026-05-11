import Link from "next/link";
import {
  canRecordInspectionTarget,
  getTeacherPositionContext,
  getManagedGradeId,
  requireInspectionRecorder,
} from "@/lib/authorization";
import {
  defaultInspectionTargetType,
  inspectionTargetTypeLabels,
  type InspectionTargetTypeValue,
} from "@/lib/validation/inspection";
import { createInspectionRecord } from "@/modules/inspection/actions";
import { InspectionRecordScopeFields } from "@/modules/inspection/record-scope-fields";
import {
  getEffectiveInspectionFilters,
  getInspectionQuickEntryData,
  normalizeInspectionFilters,
} from "@/modules/inspection/queries";

type QuickInspectionPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type Notice = {
  tone: "success" | "error";
  message: string;
} | null;

function readParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function getNotice(params: Record<string, string | string[] | undefined>): Notice {
  const message = readParam(params.message);
  const tone = readParam(params.tone);

  if (!message) {
    return null;
  }

  return {
    message,
    tone: tone === "error" ? "error" : "success",
  };
}

function buildTargetHref(
  targetType: InspectionTargetTypeValue,
  currentDate: string,
  currentItemId: string,
) {
  const params = new URLSearchParams({
    targetType,
  });

  if (currentDate) {
    params.set("inspectionDate", currentDate);
  }

  if (currentItemId) {
    params.set("inspectionItemId", currentItemId);
  }

  return `/dashboard/quick/inspection?${params.toString()}`;
}

function buildFullInspectionHref(
  targetType: InspectionTargetTypeValue,
  currentDate: string,
  currentItemId: string,
) {
  const params = new URLSearchParams({
    targetType,
  });

  if (currentDate) {
    params.set("dateFrom", currentDate);
    params.set("dateTo", currentDate);
  }

  if (currentItemId) {
    params.set("itemId", currentItemId);
  }

  return `/dashboard/inspection?${params.toString()}`;
}

export default async function QuickInspectionPage({
  searchParams,
}: QuickInspectionPageProps) {
  const session = await requireInspectionRecorder();
  const positions = await getTeacherPositionContext(session);
  const params = await searchParams;
  const gradeScopeId = getManagedGradeId(session);
  const normalizedFilters = normalizeInspectionFilters({
    ...params,
    targetType: readParam(params.targetType) || defaultInspectionTargetType,
    itemId: readParam(params.inspectionItemId) || readParam(params.itemId),
  });
  const filters = getEffectiveInspectionFilters(normalizedFilters, gradeScopeId);
  const effectiveFilters = canRecordInspectionTarget(
    session.user.role,
    filters.targetType,
    positions,
  )
    ? filters
    : {
        ...filters,
        targetType: "STUDENT" as const,
        teacherId: "",
      };
  const data = await getInspectionQuickEntryData(effectiveFilters, {
    gradeScopeId,
  });
  const selectedDate =
    readParam(params.inspectionDate) || readParam(params.dateFrom) || getTodayInputValue();
  const selectedItemId = readParam(params.inspectionItemId) || effectiveFilters.itemId;
  const notice = getNotice(params);
  const canSwitchToTeacher =
    !gradeScopeId &&
    canRecordInspectionTarget(session.user.role, "TEACHER", positions);
  const targetTypeLabel = inspectionTargetTypeLabels[data.targetType];
  const hasMissingDependency =
    data.activeItems.length === 0 ||
    (data.targetType === "STUDENT"
      ? data.gradeOptions.length === 0
      : data.teacherOptions.length === 0);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <section className="rounded-[24px] border border-[var(--panel-border)] bg-[#fffdf8] p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="soft-kicker">量化快录</span>
            <h1 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
              {targetTypeLabel}快速录入
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              这里只保留当天录入字段；项目配置、筛选复核和删除修正仍在完整常规检查页处理。
            </p>
          </div>
          <Link
            href={buildFullInspectionHref(data.targetType, selectedDate, selectedItemId)}
            className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-[var(--panel-border)] bg-white px-3 text-sm font-semibold text-[var(--accent-strong)]"
          >
            完整常规检查
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={buildTargetHref("STUDENT", selectedDate, selectedItemId)}
            className={`inline-flex h-10 items-center rounded-md px-4 text-sm font-semibold ${
              data.targetType === "STUDENT"
                ? "bg-[var(--accent-strong)] text-white"
                : "border border-[var(--panel-border)] bg-white text-[var(--accent-strong)]"
            }`}
          >
            学生量化
          </Link>
          {canSwitchToTeacher ? (
            <Link
              href={buildTargetHref("TEACHER", selectedDate, selectedItemId)}
              className={`inline-flex h-10 items-center rounded-md px-4 text-sm font-semibold ${
                data.targetType === "TEACHER"
                  ? "bg-[var(--accent-strong)] text-white"
                  : "border border-[var(--panel-border)] bg-white text-[var(--accent-strong)]"
              }`}
            >
              教师量化
            </Link>
          ) : null}
        </div>

        {gradeScopeId ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            当前账号已绑定年级范围，只能录入本年级学生量化记录。
          </div>
        ) : null}
      </section>

      {notice ? (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            notice.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      <section className="rounded-[24px] border border-[var(--panel-border)] bg-white p-4 shadow-sm md:p-5">
        {hasMissingDependency ? (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">
            {data.targetType === "TEACHER"
              ? "请先在完整常规检查页配置至少一个启用的教师量化项目，并确认系统里已有启用教师。"
              : "请先在完整常规检查页配置至少一个启用的学生量化项目，并维护好在校年级和班级。"}
          </div>
        ) : null}

        <form action={createInspectionRecord} className="grid gap-3">
          <input type="hidden" name="returnMode" value="quick" />
          <input type="hidden" name="targetType" value={data.targetType} />
          <label className="grid gap-1 text-sm font-semibold text-[var(--text-primary)]">
            日期
            <input
              type="date"
              name="inspectionDate"
              defaultValue={selectedDate}
              required
              className="h-12 rounded-md border border-[var(--panel-border)] bg-white px-4 text-base font-normal text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
            />
          </label>

          <label className="grid gap-1 text-sm font-semibold text-[var(--text-primary)]">
            检查项目
            <select
              name="inspectionItemId"
              defaultValue={selectedItemId}
              required
              className="h-12 rounded-md border border-[var(--panel-border)] bg-white px-4 text-sm font-normal text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
            >
              <option value="">请选择检查项目</option>
              {data.activeItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.category.name} / {item.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 md:grid-cols-3">
            <InspectionRecordScopeFields
              targetType={data.targetType}
              grades={data.gradeOptions}
              classes={data.classOptions}
              teachers={data.teacherOptions}
              defaultGradeId={effectiveFilters.gradeId}
              defaultClassId={effectiveFilters.classId}
              defaultTeacherId={effectiveFilters.teacherId}
            />
          </div>

          <label className="grid gap-1 text-sm font-semibold text-[var(--text-primary)]">
            结果数值
            <input
              type="number"
              step="0.01"
              name="value"
              required
              placeholder="填写分数、次数或扣分值"
              className="h-12 rounded-md border border-[var(--panel-border)] bg-white px-4 text-base font-normal text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
            />
          </label>

          <label className="grid gap-1 text-sm font-semibold text-[var(--text-primary)]">
            备注
            <textarea
              name="remarks"
              rows={3}
              placeholder="备注，如有实际需要可以填写，如具体情况、整改要求等"
              className="rounded-md border border-[var(--panel-border)] bg-white px-4 py-3 text-sm font-normal text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
            />
          </label>

          <button
            disabled={hasMissingDependency}
            className="mt-1 h-12 rounded-md bg-[var(--accent-strong)] px-5 text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            保存并继续录入
          </button>
        </form>
      </section>
    </div>
  );
}
