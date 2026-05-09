import "server-only";

import type { InspectionValueType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { flattenClassOptions, formatGradeScopeLabel } from "@/lib/grade-options";
import { prisma } from "@/lib/prisma";
import {
  coerceInspectionTargetTypeForGradeScope,
  inspectionTargetTypeLabels,
} from "@/lib/validation/inspection";
import { reportFilterSchema } from "@/lib/validation/reporting";
import { getTeacherDepartmentNames } from "@/modules/people/helpers";

export type ReportFilters = ReturnType<typeof normalizeReportFilters>;

type RawSearchParams = Record<string, string | string[] | undefined>;

export type SummaryRow = {
  key: string;
  label: string;
  subLabel: string;
  recordCount: number;
  totalValue: number;
  averageValue: number;
  minValue: number;
  maxValue: number;
};

type MutableSummary = Omit<SummaryRow, "averageValue">;

export const valueTypeLabels: Record<InspectionValueType, string> = {
  SCORE: "分数",
  COUNT: "次数/数量",
  DEDUCTION: "扣分",
};

function readParam(params: RawSearchParams, key: string) {
  const value = params[key];

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function parseDayStart(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  return new Date(`${value}T00:00:00.000Z`);
}

function parseDayEnd(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  return new Date(`${value}T23:59:59.999Z`);
}

function formatDay(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addSummaryValue(
  map: Map<string, MutableSummary>,
  key: string,
  label: string,
  subLabel: string,
  value: number,
) {
  const existing = map.get(key);

  if (existing) {
    existing.recordCount += 1;
    existing.totalValue += value;
    existing.minValue = Math.min(existing.minValue, value);
    existing.maxValue = Math.max(existing.maxValue, value);
    return;
  }

  map.set(key, {
    key,
    label,
    subLabel,
    recordCount: 1,
    totalValue: value,
    minValue: value,
    maxValue: value,
  });
}

function finalizeSummary(map: Map<string, MutableSummary>) {
  return Array.from(map.values()).map((row) => ({
    ...row,
    averageValue: row.recordCount > 0 ? row.totalValue / row.recordCount : 0,
  }));
}

function sortSummaryRows(rows: SummaryRow[]) {
  return rows.sort((left, right) => {
    if (right.recordCount !== left.recordCount) {
      return right.recordCount - left.recordCount;
    }

    return left.label.localeCompare(right.label, "zh-Hans-CN");
  });
}

function formatTeacherScopeLabel(
  teacher: {
    name: string;
    idCardNumber?: string | null;
  } | null,
) {
  if (!teacher) {
    return "未关联教师";
  }

  return `${teacher.name} / ${teacher.idCardNumber ?? "未填写身份证号"}`;
}

export function normalizeReportFilters(params: RawSearchParams) {
  return reportFilterSchema.parse({
    targetType: readParam(params, "targetType") || undefined,
    categoryId: readParam(params, "categoryId"),
    itemId: readParam(params, "itemId"),
    gradeId: readParam(params, "gradeId"),
    classId: readParam(params, "classId"),
    teacherId: readParam(params, "teacherId"),
    dateFrom: readParam(params, "dateFrom"),
    dateTo: readParam(params, "dateTo"),
  });
}

export function getEffectiveReportFilters(
  filters: ReportFilters,
  gradeScopeId?: string | null,
) {
  const targetType = coerceInspectionTargetTypeForGradeScope(
    filters.targetType,
    gradeScopeId,
  );

  if (targetType === "TEACHER") {
    return {
      ...filters,
      targetType,
      gradeId: "",
      classId: "",
    };
  }

  return {
    ...filters,
    targetType,
    teacherId: "",
  };
}

export function buildReportWhere(
  filters: ReportFilters,
  gradeScopeId?: string | null,
): Prisma.InspectionRecordWhereInput {
  const effectiveFilters = getEffectiveReportFilters(filters, gradeScopeId);
  const andConditions: Prisma.InspectionRecordWhereInput[] = [
    {
      inspectionItem: {
        category: {
          targetType: effectiveFilters.targetType,
        },
      },
    },
  ];
  const dateFrom = parseDayStart(effectiveFilters.dateFrom);
  const dateTo = parseDayEnd(effectiveFilters.dateTo);

  if (effectiveFilters.itemId) {
    andConditions.push({
      inspectionItemId: effectiveFilters.itemId,
    });
  }

  if (effectiveFilters.categoryId) {
    andConditions.push({
      inspectionItem: {
        categoryId: effectiveFilters.categoryId,
      },
    });
  }

  if (effectiveFilters.targetType === "TEACHER") {
    if (effectiveFilters.teacherId) {
      andConditions.push({
        teacherId: effectiveFilters.teacherId,
      });
    }
  } else {
    if (gradeScopeId) {
      andConditions.push({
        gradeId: gradeScopeId,
      });
    } else if (effectiveFilters.gradeId) {
      andConditions.push({
        gradeId: effectiveFilters.gradeId,
      });
    } else {
      andConditions.push({
        grade: {
          isVisibleInMain: true,
        },
      });
    }

    if (effectiveFilters.classId) {
      andConditions.push({
        classId: effectiveFilters.classId,
      });
    }
  }

  if (dateFrom || dateTo) {
    andConditions.push({
      inspectionDate: {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      },
    });
  }

  return andConditions.length === 1 ? andConditions[0] : { AND: andConditions };
}

export async function getInspectionReportData(
  filters: ReportFilters,
  options: {
    recordTake?: number;
    gradeScopeId?: string | null;
  } = {},
) {
  const recordTake = options.recordTake ?? 20000;
  const gradeScopeId = options.gradeScopeId ?? null;
  const effectiveFilters = getEffectiveReportFilters(filters, gradeScopeId);
  const where = buildReportWhere(effectiveFilters, gradeScopeId);
  const targetType = effectiveFilters.targetType;

  const [records, recordCount, categories] = await Promise.all([
    prisma.inspectionRecord.findMany({
      where,
      orderBy: [{ inspectionDate: "asc" }, { updatedAt: "asc" }],
      take: recordTake,
      include: {
        inspectionItem: {
          include: {
            category: true,
          },
        },
        grade: true,
        class: true,
        teacher: {
          include: {
            department: true,
            departmentAssignments: {
              include: {
                department: true,
              },
            },
            subject: true,
          },
        },
      },
    }),
    prisma.inspectionRecord.count({ where }),
    prisma.inspectionCategory.findMany({
      where: {
        targetType,
      },
      orderBy: { name: "asc" },
      include: {
        items: {
          orderBy: [{ isActive: "desc" }, { name: "asc" }],
        },
      },
    }),
  ]);

  const gradeOptions =
    targetType === "STUDENT"
      ? await prisma.grade.findMany({
          where: {
            isVisibleInMain: true,
            ...(gradeScopeId ? { id: gradeScopeId } : {}),
          },
          orderBy: [{ enrollmentYear: "asc" }, { name: "asc" }],
          include: {
            classes: {
              orderBy: { name: "asc" },
            },
          },
        })
      : [];

  const teacherOptions =
    targetType === "TEACHER" && !gradeScopeId
      ? await prisma.teacher.findMany({
          where: {
            employmentStatus: "ACTIVE",
          },
          orderBy: [
            { department: { name: "asc" } },
            { name: "asc" },
            { idCardNumber: "asc" },
          ],
        include: {
          department: true,
          departmentAssignments: {
            include: {
              department: true,
            },
          },
          subject: true,
        },
      })
      : [];

  const classOptions =
    targetType === "STUDENT" ? flattenClassOptions(gradeOptions) : [];

  const byItem = new Map<string, MutableSummary>();
  const byScope = new Map<string, MutableSummary>();
  const byDate = new Map<string, MutableSummary>();
  const byValueType = new Map<string, MutableSummary>();
  let totalValue = 0;
  let minValue = Number.POSITIVE_INFINITY;
  let maxValue = Number.NEGATIVE_INFINITY;

  for (const record of records) {
    const value = record.value;
    const dateLabel = formatDay(record.inspectionDate);
    const item = record.inspectionItem;
    const categoryName = item.category.name;
    const valueTypeLabel = valueTypeLabels[item.valueType];

    totalValue += value;
    minValue = Math.min(minValue, value);
    maxValue = Math.max(maxValue, value);

    addSummaryValue(
      byItem,
      item.id,
      `${categoryName} / ${item.name}`,
      valueTypeLabel,
      value,
    );

    if (targetType === "TEACHER") {
      addSummaryValue(
        byScope,
        `teacher::${record.teacherId ?? "none"}`,
        formatTeacherScopeLabel(record.teacher),
        getTeacherDepartmentNames(record.teacher ?? {}).join("、") || "教师个人",
        value,
      );
    } else {
      const gradeName = record.grade?.name ?? "未关联年级";
      addSummaryValue(
        byScope,
        `${record.gradeId ?? "none"}::${record.classId ?? "grade"}`,
        formatGradeScopeLabel(gradeName, record.class?.name),
        record.class ? "班级" : "全年级",
        value,
      );
    }

    addSummaryValue(byDate, dateLabel, dateLabel, "按日期汇总", value);
    addSummaryValue(byValueType, item.valueType, valueTypeLabel, "按结果类型汇总", value);
  }

  const totalRecords = records.length;
  const kpis = {
    matchedRecords: recordCount,
    loadedRecords: totalRecords,
    totalValue,
    averageValue: totalRecords > 0 ? totalValue / totalRecords : 0,
    minValue: totalRecords > 0 ? minValue : 0,
    maxValue: totalRecords > 0 ? maxValue : 0,
    isTruncated: recordCount > totalRecords,
  };

  return {
    targetType,
    targetTypeLabel: inspectionTargetTypeLabels[targetType],
    filters: effectiveFilters,
    categories,
    gradeOptions,
    classOptions,
    teacherOptions,
    records,
    recordLimit: recordTake,
    kpis,
    byItem: sortSummaryRows(finalizeSummary(byItem)),
    byScope: sortSummaryRows(finalizeSummary(byScope)),
    byDate: finalizeSummary(byDate).sort((left, right) =>
      left.label.localeCompare(right.label),
    ),
    byValueType: sortSummaryRows(finalizeSummary(byValueType)),
  };
}
