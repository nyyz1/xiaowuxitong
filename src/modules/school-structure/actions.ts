"use server";

import { redirect } from "next/navigation";
import { GradeStage } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { requireSystemAdmin } from "@/lib/authorization";
import {
  activeCohortWindowSize,
  buildArchivedCohortLifecycle,
  buildCompatibilityAcademicYearDateRange,
  buildCompatibilityAcademicYearName,
  buildGradeDepartmentNameSyncPlan,
  buildNumberedClassName,
  buildVisibleCohortLifecycle,
  inferEnrollmentYearFromLegacyStage,
  parseClassSequence,
  sortClassNamesForLifecycle,
  sortByEnrollmentYear,
} from "@/lib/grade-lifecycle";
import { prisma } from "@/lib/prisma";
import {
  academicYearCreateSchema,
  academicYearRolloverSchema,
  academicYearUpdateSchema,
  classCreateSchema,
  classUpdateSchema,
  deleteEntitySchema,
  dictionaryCreateSchema,
  dictionaryUpdateSchema,
  gradeClassCountAdjustSchema,
  gradeCreateSchema,
  gradeUpdateSchema,
} from "@/lib/validation/school-structure";

type NoticeTone = "success" | "error";
type AdminSession = Awaited<ReturnType<typeof requireSystemAdmin>>;
type SchoolStructureTx = Prisma.TransactionClient;

type RolloverSourceGrade = {
  id: string;
  name: string;
  stage: GradeStage | null;
  enrollmentYear: number | null;
  graduationYear: number | null;
  classes: Array<{
    id: string;
    name: string;
  }>;
  managedUsers: Array<{
    id: string;
  }>;
  students: Array<{
    id: string;
    classId: string | null;
  }>;
};

type NormalizedRolloverSourceGrade = RolloverSourceGrade & {
  enrollmentYear: number;
};

type GradeDepartmentNameUpdate = {
  id: string;
  from: string;
  to: string;
};

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getBooleanValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

function parseOptionalDate(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const parsed = new Date(`${normalized}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("日期格式不正确，请重新选择。");
  }

  return parsed;
}

function buildNoticeUrl(message: string, tone: NoticeTone) {
  const params = new URLSearchParams({
    tone,
    message,
  });

  return `/dashboard/structure?${params.toString()}`;
}

function redirectWithNotice(message: string, tone: NoticeTone = "success"): never {
  redirect(buildNoticeUrl(message, tone));
}

function getMutationErrorMessage(error: unknown) {
  if (typeof error === "object" && error && "code" in error) {
    const code = String((error as { code?: string }).code ?? "");

    if (code === "P2002") {
      return "存在同名记录，请更换名称后重试。";
    }

    if (code === "P2003") {
      return "该记录仍被其他数据引用，暂时无法删除。";
    }

    if (code === "P2025") {
      return "未找到要操作的记录，页面可能已经过期。";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "操作未完成，请稍后重试。";
}

function getAuditActorId(session: AdminSession) {
  return session.user.id === "bootstrap-admin" ? null : session.user.id;
}

function buildCompatibilityAcademicYearSeed(enrollmentYear: number) {
  return {
    name: buildCompatibilityAcademicYearName(enrollmentYear),
    ...buildCompatibilityAcademicYearDateRange(enrollmentYear),
  };
}

async function ensureCurrentCompatibilityAcademicYear(enrollmentYear: number) {
  const currentAcademicYear = await prisma.academicYear.findFirst({
    where: {
      isCurrent: true,
    },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
    },
  });

  if (currentAcademicYear) {
    return currentAcademicYear.id;
  }

  const latestAcademicYear = await prisma.academicYear.findFirst({
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
    },
  });

  if (latestAcademicYear) {
    await prisma.academicYear.update({
      where: {
        id: latestAcademicYear.id,
      },
      data: {
        isCurrent: true,
      },
    });

    return latestAcademicYear.id;
  }

  const createdAcademicYear = await prisma.academicYear.create({
    data: {
      ...buildCompatibilityAcademicYearSeed(enrollmentYear),
      isCurrent: true,
    },
    select: {
      id: true,
    },
  });

  return createdAcademicYear.id;
}

function resolveGradeEnrollmentYear(
  grade: RolloverSourceGrade,
  academicYear: {
    name: string;
    startDate: Date | null;
  },
) {
  return (
    grade.enrollmentYear ??
    inferEnrollmentYearFromLegacyStage({
      stage: grade.stage,
      name: grade.name,
      academicYearName: academicYear.name,
      academicYearStartDate: academicYear.startDate,
      graduationYear: grade.graduationYear,
    })
  );
}

function normalizeRolloverSourceGrades(
  grades: RolloverSourceGrade[],
  academicYear: {
    name: string;
    startDate: Date | null;
  },
) {
  const normalized = grades.map((grade) => {
    const enrollmentYear = resolveGradeEnrollmentYear(grade, academicYear);

    if (enrollmentYear === null) {
      throw new Error(
        `年级“${grade.name}”缺少入学年份，无法执行届别滚动。请先在结构页把年级改成按“2025级”这类入学年份命名。`,
      );
    }

    return {
      ...grade,
      enrollmentYear,
    };
  });

  const duplicates = new Set<number>();
  const seen = new Set<number>();

  for (const grade of normalized) {
    if (seen.has(grade.enrollmentYear)) {
      duplicates.add(grade.enrollmentYear);
    }

    seen.add(grade.enrollmentYear);
  }

  if (duplicates.size > 0) {
    throw new Error(
      `当前在校届别中存在重复入学年份的可见年级：${Array.from(duplicates).sort().join("、")}。请先整理后再执行届别滚动。`,
    );
  }

  return sortByEnrollmentYear(normalized);
}

async function duplicateClasses(
  tx: SchoolStructureTx,
  sourceClasses: RolloverSourceGrade["classes"],
  targetGradeId: string,
) {
  const classIdMap = new Map<string, string>();

  for (const classItem of sortClassNamesForLifecycle(sourceClasses)) {
    const created = await tx.class.create({
      data: {
        gradeId: targetGradeId,
        name: classItem.name,
      },
      select: {
        id: true,
      },
    });

    classIdMap.set(classItem.id, created.id);
  }

  return classIdMap;
}

async function moveStudentsToNextGrade(
  tx: SchoolStructureTx,
  students: RolloverSourceGrade["students"],
  targetGradeId: string,
  classIdMap: Map<string, string>,
) {
  for (const student of students) {
    await tx.student.update({
      where: {
        id: student.id,
      },
      data: {
        gradeId: targetGradeId,
        classId: student.classId ? (classIdMap.get(student.classId) ?? null) : null,
        isArchived: false,
        archivedAt: null,
      },
    });
  }
}

async function syncGradeDepartmentNamesForRollover(
  tx: SchoolStructureTx,
  activeEnrollmentYears: number[],
) {
  const departments = await tx.department.findMany({
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
    },
  });
  const updates: GradeDepartmentNameUpdate[] = buildGradeDepartmentNameSyncPlan({
    departments,
    activeEnrollmentYears,
  });

  for (const update of updates) {
    await tx.department.update({
      where: {
        id: update.id,
      },
      data: {
        name: update.to,
      },
    });
  }

  return updates;
}

async function assertClassSafeToDelete(tx: SchoolStructureTx, classId: string) {
  const classRecord = await tx.class.findUnique({
    where: {
      id: classId,
    },
    include: {
      _count: {
        select: {
          students: true,
          inspections: true,
        },
      },
      grade: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!classRecord) {
    throw new Error("未找到要删除的班级。");
  }

  if (classRecord._count.students > 0 || classRecord._count.inspections > 0) {
    throw new Error(
      `班级“${classRecord.grade.name} / ${classRecord.name}”下仍有关联学生或检查记录，只能删除空班级。`,
    );
  }
}

export async function createAcademicYear(formData: FormData) {
  await requireSystemAdmin();

  const parsed = academicYearCreateSchema.safeParse({
    name: getStringValue(formData, "name"),
    startDate: getStringValue(formData, "startDate"),
    endDate: getStringValue(formData, "endDate"),
    isCurrent: getBooleanValue(formData, "isCurrent"),
  });

  if (!parsed.success) {
    redirectWithNotice(parsed.error.issues[0]?.message ?? "学年信息不完整。", "error");
  }

  try {
    const startDate = parseOptionalDate(parsed.data.startDate);
    const endDate = parseOptionalDate(parsed.data.endDate);

    if (parsed.data.isCurrent) {
      await prisma.academicYear.updateMany({
        data: {
          isCurrent: false,
        },
      });
    }

    await prisma.academicYear.create({
      data: {
        name: parsed.data.name,
        startDate,
        endDate,
        isCurrent: parsed.data.isCurrent,
      },
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error");
  }

  redirectWithNotice("学年已新增。");
}

export async function updateAcademicYear(formData: FormData) {
  await requireSystemAdmin();

  const parsed = academicYearUpdateSchema.safeParse({
    id: getStringValue(formData, "id"),
    name: getStringValue(formData, "name"),
    startDate: getStringValue(formData, "startDate"),
    endDate: getStringValue(formData, "endDate"),
    isCurrent: getBooleanValue(formData, "isCurrent"),
  });

  if (!parsed.success) {
    redirectWithNotice(parsed.error.issues[0]?.message ?? "学年信息不完整。", "error");
  }

  try {
    const startDate = parseOptionalDate(parsed.data.startDate);
    const endDate = parseOptionalDate(parsed.data.endDate);

    if (parsed.data.isCurrent) {
      await prisma.academicYear.updateMany({
        where: {
          id: {
            not: parsed.data.id,
          },
        },
        data: {
          isCurrent: false,
        },
      });
    }

    await prisma.academicYear.update({
      where: {
        id: parsed.data.id,
      },
      data: {
        name: parsed.data.name,
        startDate,
        endDate,
        isCurrent: parsed.data.isCurrent,
      },
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error");
  }

  redirectWithNotice("学年信息已更新。");
}

export async function deleteAcademicYear(formData: FormData) {
  await requireSystemAdmin();

  const parsed = deleteEntitySchema.safeParse({
    id: getStringValue(formData, "id"),
  });

  if (!parsed.success) {
    redirectWithNotice("学年删除请求无效。", "error");
  }

  try {
    const existing = await prisma.academicYear.findUnique({
      where: {
        id: parsed.data.id,
      },
      include: {
        _count: {
          select: {
            grades: true,
          },
        },
      },
    });

    if (!existing) {
      throw new Error("未找到要删除的学年。");
    }

    if (existing._count.grades > 0) {
      throw new Error("该学年下仍有年级，请先处理年级后再删除学年。");
    }

    await prisma.academicYear.delete({
      where: {
        id: parsed.data.id,
      },
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error");
  }

  redirectWithNotice("学年已删除。");
}

export async function createGrade(formData: FormData) {
  await requireSystemAdmin();

  const parsed = gradeCreateSchema.safeParse({
    enrollmentYear: getStringValue(formData, "enrollmentYear"),
  });

  if (!parsed.success) {
    redirectWithNotice(parsed.error.issues[0]?.message ?? "年级信息不完整。", "error");
  }

  try {
    const lifecycle = buildVisibleCohortLifecycle(parsed.data.enrollmentYear);
    const academicYearId = await ensureCurrentCompatibilityAcademicYear(
      parsed.data.enrollmentYear,
    );

    await prisma.grade.create({
      data: {
        academicYearId,
        name: lifecycle.name,
        stage: lifecycle.stage,
        enrollmentYear: lifecycle.enrollmentYear,
        isVisibleInMain: lifecycle.isVisibleInMain,
        graduationYear: lifecycle.graduationYear,
      },
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error");
  }

  redirectWithNotice("年级已新增。");
}

export async function updateGrade(formData: FormData) {
  await requireSystemAdmin();

  const parsed = gradeUpdateSchema.safeParse({
    id: getStringValue(formData, "id"),
    enrollmentYear: getStringValue(formData, "enrollmentYear"),
  });

  if (!parsed.success) {
    redirectWithNotice(parsed.error.issues[0]?.message ?? "年级信息不完整。", "error");
  }

  try {
    const lifecycle = buildVisibleCohortLifecycle(parsed.data.enrollmentYear);

    await prisma.grade.update({
      where: {
        id: parsed.data.id,
      },
      data: {
        name: lifecycle.name,
        stage: lifecycle.stage,
        enrollmentYear: lifecycle.enrollmentYear,
        isVisibleInMain: lifecycle.isVisibleInMain,
        graduationYear: lifecycle.graduationYear,
      },
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error");
  }

  redirectWithNotice("年级信息已更新。");
}

export async function deleteGrade(formData: FormData) {
  await requireSystemAdmin();

  const parsed = deleteEntitySchema.safeParse({
    id: getStringValue(formData, "id"),
  });

  if (!parsed.success) {
    redirectWithNotice("年级删除请求无效。", "error");
  }

  try {
    const existing = await prisma.grade.findUnique({
      where: {
        id: parsed.data.id,
      },
      include: {
        _count: {
          select: {
            classes: true,
            students: true,
          },
        },
      },
    });

    if (!existing) {
      throw new Error("未找到要删除的年级。");
    }

    if (existing._count.classes > 0) {
      throw new Error("该年级下仍有班级，请先减少班级后再删除年级。");
    }

    if (existing._count.students > 0) {
      throw new Error("该年级下仍有关联学生，暂时不能删除。");
    }

    await prisma.grade.delete({
      where: {
        id: parsed.data.id,
      },
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error");
  }

  redirectWithNotice("年级已删除。");
}

export async function createClass(formData: FormData) {
  await requireSystemAdmin();

  const parsed = classCreateSchema.safeParse({
    gradeId: getStringValue(formData, "gradeId"),
    name: getStringValue(formData, "name"),
  });

  if (!parsed.success) {
    redirectWithNotice(parsed.error.issues[0]?.message ?? "班级信息不完整。", "error");
  }

  try {
    await prisma.class.create({
      data: {
        gradeId: parsed.data.gradeId,
        name: parsed.data.name,
      },
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error");
  }

  redirectWithNotice("班级已新增。");
}

export async function updateClass(formData: FormData) {
  await requireSystemAdmin();

  const parsed = classUpdateSchema.safeParse({
    id: getStringValue(formData, "id"),
    name: getStringValue(formData, "name"),
  });

  if (!parsed.success) {
    redirectWithNotice(parsed.error.issues[0]?.message ?? "班级信息不完整。", "error");
  }

  try {
    await prisma.class.update({
      where: {
        id: parsed.data.id,
      },
      data: {
        name: parsed.data.name,
      },
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error");
  }

  redirectWithNotice("班级名称已更新。");
}

export async function deleteClass(formData: FormData) {
  await requireSystemAdmin();

  const parsed = deleteEntitySchema.safeParse({
    id: getStringValue(formData, "id"),
  });

  if (!parsed.success) {
    redirectWithNotice("班级删除请求无效。", "error");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await assertClassSafeToDelete(tx, parsed.data.id);

      await tx.class.delete({
        where: {
          id: parsed.data.id,
        },
      });
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error");
  }

  redirectWithNotice("班级已删除。");
}

export async function adjustGradeClassCount(formData: FormData) {
  await requireSystemAdmin();

  const parsed = gradeClassCountAdjustSchema.safeParse({
    gradeId: getStringValue(formData, "gradeId"),
    targetCount: getStringValue(formData, "targetCount"),
  });

  if (!parsed.success) {
    redirectWithNotice(parsed.error.issues[0]?.message ?? "班级数量调整请求无效。", "error");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const grade = await tx.grade.findUnique({
        where: {
          id: parsed.data.gradeId,
        },
        include: {
          classes: {
            include: {
              _count: {
                select: {
                  students: true,
                  inspections: true,
                },
              },
            },
          },
        },
      });

      if (!grade) {
        throw new Error("未找到要调整的年级。");
      }

      const currentCount = grade.classes.length;

      if (parsed.data.targetCount === currentCount) {
        return;
      }

      if (parsed.data.targetCount > currentCount) {
        const existingNames = new Set(grade.classes.map((classItem) => classItem.name));
        let sequence = Math.max(
          0,
          ...grade.classes.map((classItem) => parseClassSequence(classItem.name) ?? 0),
        );
        const rows: Array<{ gradeId: string; name: string }> = [];

        while (currentCount + rows.length < parsed.data.targetCount) {
          sequence += 1;
          const name = buildNumberedClassName(sequence);

          if (existingNames.has(name)) {
            continue;
          }

          existingNames.add(name);
          rows.push({
            gradeId: grade.id,
            name,
          });
        }

        if (rows.length > 0) {
          await tx.class.createMany({
            data: rows,
          });
        }

        return;
      }

      const toRemoveCount = currentCount - parsed.data.targetCount;
      const removableClasses = sortClassNamesForLifecycle(grade.classes)
        .reverse()
        .filter(
          (classItem) =>
            classItem._count.students === 0 && classItem._count.inspections === 0,
        );

      if (removableClasses.length < toRemoveCount) {
        throw new Error("减少班级数时，只能删除没有学生和检查记录的末尾空班级。");
      }

      await tx.class.deleteMany({
        where: {
          id: {
            in: removableClasses.slice(0, toRemoveCount).map((classItem) => classItem.id),
          },
        },
      });
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error");
  }

  redirectWithNotice("班级数量已调整。");
}

export async function rolloverAcademicYear(formData: FormData) {
  const session = await requireSystemAdmin();

  const parsed = academicYearRolloverSchema.safeParse({
    targetEnrollmentYear: getStringValue(formData, "targetEnrollmentYear"),
    newCohortClassCount: getStringValue(formData, "newCohortClassCount"),
  });

  if (!parsed.success) {
    redirectWithNotice(parsed.error.issues[0]?.message ?? "届别滚动信息不完整。", "error");
  }

  try {
    const archivedAt = new Date();

    await prisma.$transaction(async (tx) => {
      const sourceAcademicYear = await tx.academicYear.findFirst({
        where: {
          grades: {
            some: {
              isVisibleInMain: true,
            },
          },
        },
        orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }, { createdAt: "desc" }],
        include: {
          grades: {
            where: {
              isVisibleInMain: true,
            },
            include: {
              classes: true,
              managedUsers: {
                select: {
                  id: true,
                },
              },
              students: {
                select: {
                  id: true,
                  classId: true,
                },
              },
            },
          },
        },
      });

      if (!sourceAcademicYear) {
        throw new Error("未找到可用于滚动的在校届别。");
      }

      const sourceGrades = normalizeRolloverSourceGrades(
        sourceAcademicYear.grades as RolloverSourceGrade[],
        sourceAcademicYear,
      );

      if (sourceGrades.length === 0) {
        throw new Error("执行届别滚动前，至少要有一个在校可见年级。");
      }

      const sourceEnrollmentYears = sourceGrades.map((grade) => grade.enrollmentYear);
      const latestEnrollmentYear = Math.max(...sourceEnrollmentYears);
      const targetEnrollmentYear = parsed.data.targetEnrollmentYear;

      if (sourceEnrollmentYears.includes(targetEnrollmentYear)) {
        throw new Error(
          `当前在校届别里已经存在 ${targetEnrollmentYear}级，请先核查年级结构后再执行新增最新一届。`,
        );
      }

      if (targetEnrollmentYear <= latestEnrollmentYear) {
        throw new Error(
          `最新一届的入学年份必须晚于当前在校届别。当前最新为 ${latestEnrollmentYear} 级。`,
        );
      }

      const carryCount = Math.max(0, activeCohortWindowSize - 1);
      const carriedSourceGrades = sourceGrades.slice(-carryCount);
      const archivedSourceGrades = sourceGrades.slice(
        0,
        Math.max(0, sourceGrades.length - carryCount),
      );

      const compatibilityAcademicYear = buildCompatibilityAcademicYearSeed(
        targetEnrollmentYear,
      );

      await tx.academicYear.updateMany({
        data: {
          isCurrent: false,
        },
      });

      const targetAcademicYear = await tx.academicYear.create({
        data: {
          ...compatibilityAcademicYear,
          isCurrent: true,
        },
        select: {
          id: true,
          name: true,
        },
      });

      const carriedGradeMappings: Array<{
        source: NormalizedRolloverSourceGrade;
        targetId: string;
        classIdMap: Map<string, string>;
      }> = [];

      for (const sourceGrade of carriedSourceGrades) {
        const lifecycle = buildVisibleCohortLifecycle(sourceGrade.enrollmentYear);
        const createdGrade = await tx.grade.create({
          data: {
            academicYearId: targetAcademicYear.id,
            name: lifecycle.name,
            stage: lifecycle.stage,
            enrollmentYear: lifecycle.enrollmentYear,
            isVisibleInMain: lifecycle.isVisibleInMain,
            graduationYear: lifecycle.graduationYear,
          },
          select: {
            id: true,
          },
        });

        const classIdMap = await duplicateClasses(
          tx,
          sourceGrade.classes,
          createdGrade.id,
        );

        carriedGradeMappings.push({
          source: sourceGrade,
          targetId: createdGrade.id,
          classIdMap,
        });
      }

      const newCohortLifecycle = buildVisibleCohortLifecycle(targetEnrollmentYear);
      const newCohortGrade = await tx.grade.create({
        data: {
          academicYearId: targetAcademicYear.id,
          name: newCohortLifecycle.name,
          stage: newCohortLifecycle.stage,
          enrollmentYear: newCohortLifecycle.enrollmentYear,
          isVisibleInMain: newCohortLifecycle.isVisibleInMain,
          graduationYear: newCohortLifecycle.graduationYear,
        },
        select: {
          id: true,
        },
      });

      const newCohortClasses = Array.from(
        { length: parsed.data.newCohortClassCount },
        (_, index) => ({
          gradeId: newCohortGrade.id,
          name: buildNumberedClassName(index + 1),
        }),
      );

      if (newCohortClasses.length > 0) {
        await tx.class.createMany({
          data: newCohortClasses,
        });
      }

      for (const gradeMapping of carriedGradeMappings) {
        await moveStudentsToNextGrade(
          tx,
          gradeMapping.source.students,
          gradeMapping.targetId,
          gradeMapping.classIdMap,
        );
      }

      if (carriedSourceGrades.length > 0) {
        await tx.grade.updateMany({
          where: {
            id: {
              in: carriedSourceGrades.map((grade) => grade.id),
            },
          },
          data: {
            isVisibleInMain: false,
          },
        });
      }

      for (const archivedGrade of archivedSourceGrades) {
        if (archivedGrade.students.length > 0) {
          await tx.student.updateMany({
            where: {
              id: {
                in: archivedGrade.students.map((student) => student.id),
              },
            },
            data: {
              isArchived: true,
              archivedAt,
            },
          });
        }

        const archivedLifecycle = buildArchivedCohortLifecycle(
          archivedGrade.enrollmentYear,
          archivedGrade.enrollmentYear + activeCohortWindowSize,
        );

        await tx.grade.update({
          where: {
            id: archivedGrade.id,
          },
          data: {
            name: archivedLifecycle.name,
            stage: archivedLifecycle.stage,
            enrollmentYear: archivedLifecycle.enrollmentYear,
            isVisibleInMain: archivedLifecycle.isVisibleInMain,
            graduationYear: archivedLifecycle.graduationYear,
          },
        });
      }

      for (const gradeMapping of carriedGradeMappings) {
        await tx.user.updateMany({
          where: {
            managedGradeId: gradeMapping.source.id,
          },
          data: {
            managedGradeId: gradeMapping.targetId,
          },
        });
      }

      if (archivedSourceGrades.length > 0) {
        await tx.user.updateMany({
          where: {
            managedGradeId: {
              in: archivedSourceGrades.map((grade) => grade.id),
            },
          },
          data: {
            managedGradeId: newCohortGrade.id,
          },
        });
      }

      const activeEnrollmentYearsAfterRollover = [
        ...carriedSourceGrades.map((grade) => grade.enrollmentYear),
        targetEnrollmentYear,
      ];
      const gradeDepartmentNameUpdates = await syncGradeDepartmentNamesForRollover(
        tx,
        activeEnrollmentYearsAfterRollover,
      );

      await tx.auditLog.create({
        data: {
          actorId: getAuditActorId(session),
          action: "ROLLOVER_GRADE_COHORTS",
          targetType: "AcademicYear",
          targetId: targetAcademicYear.id,
          summary: `执行届别滚动，新增 ${targetEnrollmentYear}级并自动保留最近三届在校、其余转入往届存档。`,
          metadata: {
            sourceAcademicYearId: sourceAcademicYear.id,
            sourceAcademicYearName: sourceAcademicYear.name,
            targetAcademicYearName: targetAcademicYear.name,
            targetEnrollmentYear,
            newCohortClassCount: parsed.data.newCohortClassCount,
            carriedEnrollmentYears: carriedSourceGrades.map((grade) => grade.enrollmentYear),
            archivedEnrollmentYears: archivedSourceGrades.map((grade) => grade.enrollmentYear),
            gradeDepartmentNameUpdates,
          },
        },
      });
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error");
  }

  redirectWithNotice("届别滚动已完成，最新入学届别和往届归档已更新。");
}

export async function createDepartment(formData: FormData) {
  await requireSystemAdmin();

  const parsed = dictionaryCreateSchema.safeParse({
    name: getStringValue(formData, "name"),
  });

  if (!parsed.success) {
    redirectWithNotice(parsed.error.issues[0]?.message ?? "部门名称不能为空。", "error");
  }

  try {
    await prisma.department.create({
      data: {
        name: parsed.data.name,
      },
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error");
  }

  redirectWithNotice("部门已新增。");
}

export async function updateDepartment(formData: FormData) {
  await requireSystemAdmin();

  const parsed = dictionaryUpdateSchema.safeParse({
    id: getStringValue(formData, "id"),
    name: getStringValue(formData, "name"),
  });

  if (!parsed.success) {
    redirectWithNotice(parsed.error.issues[0]?.message ?? "部门名称不能为空。", "error");
  }

  try {
    await prisma.department.update({
      where: {
        id: parsed.data.id,
      },
      data: {
        name: parsed.data.name,
      },
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error");
  }

  redirectWithNotice("部门名称已更新。");
}

export async function deleteDepartment(formData: FormData) {
  await requireSystemAdmin();

  const parsed = deleteEntitySchema.safeParse({
    id: getStringValue(formData, "id"),
  });

  if (!parsed.success) {
    redirectWithNotice("部门删除请求无效。", "error");
  }

  try {
    await prisma.department.delete({
      where: {
        id: parsed.data.id,
      },
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error");
  }

  redirectWithNotice("部门已删除。");
}

export async function createSubject(formData: FormData) {
  await requireSystemAdmin();

  const parsed = dictionaryCreateSchema.safeParse({
    name: getStringValue(formData, "name"),
  });

  if (!parsed.success) {
    redirectWithNotice(parsed.error.issues[0]?.message ?? "学科名称不能为空。", "error");
  }

  try {
    await prisma.subject.create({
      data: {
        name: parsed.data.name,
      },
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error");
  }

  redirectWithNotice("学科已新增。");
}

export async function updateSubject(formData: FormData) {
  await requireSystemAdmin();

  const parsed = dictionaryUpdateSchema.safeParse({
    id: getStringValue(formData, "id"),
    name: getStringValue(formData, "name"),
  });

  if (!parsed.success) {
    redirectWithNotice(parsed.error.issues[0]?.message ?? "学科名称不能为空。", "error");
  }

  try {
    await prisma.subject.update({
      where: {
        id: parsed.data.id,
      },
      data: {
        name: parsed.data.name,
      },
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error");
  }

  redirectWithNotice("学科名称已更新。");
}

export async function deleteSubject(formData: FormData) {
  await requireSystemAdmin();

  const parsed = deleteEntitySchema.safeParse({
    id: getStringValue(formData, "id"),
  });

  if (!parsed.success) {
    redirectWithNotice("学科删除请求无效。", "error");
  }

  try {
    await prisma.subject.delete({
      where: {
        id: parsed.data.id,
      },
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error");
  }

  redirectWithNotice("学科已删除。");
}
