import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { flattenClassOptions } from "@/lib/grade-options";
import { prisma } from "@/lib/prisma";
import {
  coerceInspectionTargetTypeForGradeScope,
  inspectionFilterSchema,
} from "@/lib/validation/inspection";

export type InspectionFilters = ReturnType<typeof normalizeInspectionFilters>;

type RawSearchParams = Record<string, string | string[] | undefined>;

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

export function normalizeInspectionFilters(params: RawSearchParams) {
  return inspectionFilterSchema.parse({
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

export function getEffectiveInspectionFilters(
  filters: InspectionFilters,
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

export function buildInspectionRecordWhere(
  filters: InspectionFilters,
  gradeScopeId?: string | null,
): Prisma.InspectionRecordWhereInput {
  const effectiveFilters = getEffectiveInspectionFilters(filters, gradeScopeId);
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

export async function getInspectionManagementData(
  filters: InspectionFilters,
  options: {
    gradeScopeId?: string | null;
  } = {},
) {
  const gradeScopeId = options.gradeScopeId ?? null;
  const effectiveFilters = getEffectiveInspectionFilters(filters, gradeScopeId);
  const where = buildInspectionRecordWhere(effectiveFilters, gradeScopeId);
  const targetType = effectiveFilters.targetType;

  const [categories, activeItems, records, recordCount] = await Promise.all([
    prisma.inspectionCategory.findMany({
      where: {
        targetType,
      },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            items: true,
          },
        },
        items: {
          orderBy: [{ isActive: "desc" }, { name: "asc" }],
          include: {
            _count: {
              select: {
                records: true,
              },
            },
          },
        },
      },
    }),
    prisma.inspectionItem.findMany({
      where: {
        isActive: true,
        category: {
          targetType,
        },
      },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
      include: {
        category: true,
      },
    }),
    prisma.inspectionRecord.findMany({
      where,
      orderBy: [{ inspectionDate: "desc" }, { updatedAt: "desc" }],
      take: 160,
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
        recordedBy: true,
      },
    }),
    prisma.inspectionRecord.count({ where }),
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

  return {
    targetType,
    categories,
    activeItems,
    records,
    recordCount,
    gradeOptions,
    classOptions,
    teacherOptions,
  };
}

export async function getInspectionQuickEntryData(
  filters: InspectionFilters,
  options: {
    gradeScopeId?: string | null;
  } = {},
) {
  const gradeScopeId = options.gradeScopeId ?? null;
  const effectiveFilters = getEffectiveInspectionFilters(filters, gradeScopeId);
  const targetType = effectiveFilters.targetType;

  const [activeItems, gradeOptions, teacherOptions] = await Promise.all([
    prisma.inspectionItem.findMany({
      where: {
        isActive: true,
        category: {
          targetType,
        },
      },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
      include: {
        category: true,
      },
    }),
    targetType === "STUDENT"
      ? prisma.grade.findMany({
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
      : Promise.resolve([]),
    targetType === "TEACHER" && !gradeScopeId
      ? prisma.teacher.findMany({
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
      : Promise.resolve([]),
  ]);

  return {
    targetType,
    activeItems,
    gradeOptions,
    classOptions: targetType === "STUDENT" ? flattenClassOptions(gradeOptions) : [],
    teacherOptions,
  };
}
