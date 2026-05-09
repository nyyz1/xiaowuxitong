"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import {
  getManagedGradeId,
  requireInspectionConfigurator,
  requireInspectionRecorder,
} from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import {
  inspectionCategoryCreateSchema,
  inspectionCategoryDeleteSchema,
  inspectionCategoryMutationSchema,
  inspectionItemMutationSchema,
  inspectionItemStatusSchema,
  inspectionRecordDeleteSchema,
  inspectionRecordMutationSchema,
  type InspectionTargetTypeValue,
} from "@/lib/validation/inspection";

type NoticeTone = "success" | "error";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function deleteInspectionRecord(formData: FormData) {
  const session = await requireInspectionRecorder();
  const gradeScopeId = getManagedGradeId(session);
  const targetType = getTargetTypeValue(formData);

  const parsed = inspectionRecordDeleteSchema.safeParse({
    id: getStringValue(formData, "id"),
    targetType: getStringValue(formData, "targetType") || undefined,
  });

  if (!parsed.success) {
    redirectWithNotice("检查记录删除请求无效。", "error", targetType);
  }

  try {
    await assertRecordAccessible(parsed.data.id, gradeScopeId);

    const record = await prisma.inspectionRecord.findUnique({
      where: {
        id: parsed.data.id,
      },
      select: {
        id: true,
        inspectionDate: true,
        value: true,
        remarks: true,
        grade: {
          select: {
            name: true,
          },
        },
        class: {
          select: {
            name: true,
          },
        },
        teacher: {
          select: {
            name: true,
          },
        },
        inspectionItem: {
          select: {
            name: true,
            category: {
              select: {
                name: true,
                targetType: true,
              },
            },
          },
        },
      },
    });

    if (!record) {
      throw new Error("未找到要删除的检查记录。");
    }

    if (record.inspectionItem.category.targetType !== parsed.data.targetType) {
      throw new Error("该检查记录不属于当前量化类型。");
    }

    await prisma.$transaction(async (tx) => {
      await tx.inspectionRecord.delete({
        where: {
          id: record.id,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "DELETE_INSPECTION_RECORD",
          targetType: "InspectionRecord",
          targetId: record.id,
          summary: `删除误录检查记录：${record.inspectionItem.category.name} / ${record.inspectionItem.name}`,
          metadata: {
            targetType: parsed.data.targetType,
            inspectionDate: record.inspectionDate.toISOString(),
            categoryName: record.inspectionItem.category.name,
            itemName: record.inspectionItem.name,
            gradeName: record.grade?.name ?? null,
            className: record.class?.name ?? null,
            teacherName: record.teacher?.name ?? null,
            value: record.value,
            remarks: record.remarks,
          },
        },
      });
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error", targetType);
  }

  redirectWithNotice("检查记录已删除。", "success", parsed.data.targetType);
}

function optionalRelationId(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function dateFromInput(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function normalizeTargetTypeValue(value: string): InspectionTargetTypeValue {
  return value === "TEACHER" ? "TEACHER" : "STUDENT";
}

function getTargetTypeValue(formData: FormData) {
  return normalizeTargetTypeValue(getStringValue(formData, "targetType"));
}

function buildQuickInspectionRedirectPath(
  targetType: InspectionTargetTypeValue,
  formData: FormData,
) {
  const params = new URLSearchParams({
    targetType,
  });
  const inspectionDate = getStringValue(formData, "inspectionDate");
  const inspectionItemId = getStringValue(formData, "inspectionItemId");

  if (/^\d{4}-\d{2}-\d{2}$/.test(inspectionDate)) {
    params.set("inspectionDate", inspectionDate);
  }

  if (/^[A-Za-z0-9_-]{1,64}$/.test(inspectionItemId)) {
    params.set("inspectionItemId", inspectionItemId);
  }

  return `/dashboard/quick/inspection?${params.toString()}`;
}

function redirectAfterRecordMutation(
  message: string,
  tone: NoticeTone,
  targetType: InspectionTargetTypeValue,
  formData: FormData,
): never {
  if (getStringValue(formData, "returnMode") === "quick") {
    const path = buildQuickInspectionRedirectPath(targetType, formData);
    const params = new URLSearchParams({
      message,
      tone,
    });

    redirect(`${path}&${params.toString()}`);
  }

  redirectWithNotice(message, tone, targetType);
}

function redirectWithNotice(
  message: string,
  tone: NoticeTone = "success",
  targetType: InspectionTargetTypeValue = "STUDENT",
): never {
  const params = new URLSearchParams({
    message,
    tone,
    targetType,
  });

  redirect(`/dashboard/inspection?${params.toString()}`);
}

function getMutationErrorMessage(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "名称已经存在，请换一个名称后再试。";
    }

    if (error.code === "P2003") {
      return "所选关联数据不存在或已被移除，请刷新后重试。";
    }

    if (error.code === "P2025") {
      return "未找到要操作的检查记录。";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "操作未完成，请稍后重试。";
}

async function resolveRecordedById(userId: string | undefined) {
  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
    },
  });

  return user?.id ?? null;
}

async function assertCategoryMatchesTargetType(
  categoryId: string,
  targetType: InspectionTargetTypeValue,
) {
  const category = await prisma.inspectionCategory.findUnique({
    where: {
      id: categoryId,
    },
    select: {
      targetType: true,
    },
  });

  if (!category) {
    throw new Error("所选检查分类不存在，请刷新后重试。");
  }

  if (category.targetType !== targetType) {
    throw new Error("所选检查分类不属于当前量化类型。");
  }
}

async function resolveInspectionScope(
  targetType: InspectionTargetTypeValue,
  gradeIdValue: string,
  classIdValue: string,
  teacherIdValue: string,
  allowedGradeId?: string | null,
) {
  if (targetType === "TEACHER") {
    if (allowedGradeId) {
      throw new Error("当前账号只能录入或修改学生量化记录。");
    }

    if (optionalRelationId(gradeIdValue) || optionalRelationId(classIdValue)) {
      throw new Error("教师量化记录不关联年级或班级。");
    }

    const teacherId = optionalRelationId(teacherIdValue);

    if (!teacherId) {
      throw new Error("请选择教师量化对应的教师。");
    }

    const teacher = await prisma.teacher.findUnique({
      where: {
        id: teacherId,
      },
      select: {
        id: true,
      },
    });

    if (!teacher) {
      throw new Error("所选教师不存在，请刷新后重试。");
    }

    return {
      gradeId: null,
      classId: null,
      teacherId,
    };
  }

  if (optionalRelationId(teacherIdValue)) {
    throw new Error("学生量化记录不能同时关联教师。");
  }

  const gradeId = optionalRelationId(gradeIdValue);
  const classId = optionalRelationId(classIdValue);

  if (classId) {
    const classRecord = await prisma.class.findUnique({
      where: {
        id: classId,
      },
      select: {
        gradeId: true,
      },
    });

    if (!classRecord) {
      throw new Error("所选班级不存在，请刷新后重试。");
    }

    if (gradeId && gradeId !== classRecord.gradeId) {
      throw new Error("所选班级不属于当前年级，请重新选择。");
    }

    if (allowedGradeId && classRecord.gradeId !== allowedGradeId) {
      throw new Error("当前账号只能录入或修改本年级检查数据。");
    }

    return {
      gradeId: classRecord.gradeId,
      classId,
      teacherId: null,
    };
  }

  if (!gradeId) {
    throw new Error("请至少选择一个年级或班级作为学生量化对象。");
  }

  const grade = await prisma.grade.findUnique({
    where: {
      id: gradeId,
    },
    select: {
      id: true,
    },
  });

  if (!grade) {
    throw new Error("所选年级不存在，请刷新后重试。");
  }

  if (allowedGradeId && grade.id !== allowedGradeId) {
    throw new Error("当前账号只能录入或修改本年级检查数据。");
  }

  return {
    gradeId,
    classId: null,
    teacherId: null,
  };
}

async function assertActiveInspectionItem(itemId: string) {
  const item = await prisma.inspectionItem.findUnique({
    where: {
      id: itemId,
    },
    select: {
      isActive: true,
      category: {
        select: {
          targetType: true,
        },
      },
    },
  });

  if (!item || !item.isActive) {
    throw new Error("检查项目不存在或已停用，请重新选择。");
  }

  return {
    targetType: item.category.targetType,
  };
}

async function assertRecordAccessible(recordId: string, allowedGradeId?: string | null) {
  if (!allowedGradeId) {
    return;
  }

  const record = await prisma.inspectionRecord.findUnique({
    where: {
      id: recordId,
    },
    select: {
      gradeId: true,
    },
  });

  if (!record) {
    throw new Error("未找到要操作的检查记录。");
  }

  if (record.gradeId !== allowedGradeId) {
    throw new Error("当前账号不能修改其他年级的检查记录。");
  }
}

export async function createInspectionCategory(formData: FormData) {
  await requireInspectionConfigurator();

  const parsed = inspectionCategoryCreateSchema.safeParse({
    name: getStringValue(formData, "name"),
    targetType: getStringValue(formData, "targetType") || undefined,
  });
  const targetType = normalizeTargetTypeValue(getStringValue(formData, "targetType"));

  if (!parsed.success) {
    redirectWithNotice(parsed.error.issues[0]?.message ?? "检查分类信息不完整。", "error", targetType);
  }

  try {
    await prisma.inspectionCategory.create({
      data: {
        name: parsed.data.name,
        targetType: parsed.data.targetType,
      },
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error", parsed.data.targetType);
  }

  redirectWithNotice("检查分类已新增。", "success", parsed.data.targetType);
}

export async function updateInspectionCategory(formData: FormData) {
  await requireInspectionConfigurator();
  const targetType = getTargetTypeValue(formData);

  const parsed = inspectionCategoryMutationSchema.safeParse({
    id: getStringValue(formData, "id"),
    name: getStringValue(formData, "name"),
  });

  if (!parsed.success || !parsed.data.id) {
    redirectWithNotice(parsed.error?.issues[0]?.message ?? "检查分类信息不完整。", "error", targetType);
  }

  try {
    await prisma.inspectionCategory.update({
      where: {
        id: parsed.data.id,
      },
      data: {
        name: parsed.data.name,
      },
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error", targetType);
  }

  redirectWithNotice("检查分类已更新。", "success", targetType);
}

export async function deleteInspectionCategory(formData: FormData) {
  await requireInspectionConfigurator();
  const targetType = getTargetTypeValue(formData);

  const parsed = inspectionCategoryDeleteSchema.safeParse({
    id: getStringValue(formData, "id"),
  });

  if (!parsed.success) {
    redirectWithNotice("检查分类删除请求无效。", "error", targetType);
  }

  try {
    const itemCount = await prisma.inspectionItem.count({
      where: {
        categoryId: parsed.data.id,
      },
    });

    if (itemCount > 0) {
      throw new Error("该分类下已有检查项目，请先调整项目后再删除分类。");
    }

    await prisma.inspectionCategory.delete({
      where: {
        id: parsed.data.id,
      },
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error", targetType);
  }

  redirectWithNotice("检查分类已删除。", "success", targetType);
}

export async function createInspectionItem(formData: FormData) {
  await requireInspectionConfigurator();
  const targetType = getTargetTypeValue(formData);

  const parsed = inspectionItemMutationSchema.safeParse({
    name: getStringValue(formData, "name"),
    categoryId: getStringValue(formData, "categoryId"),
    valueType: getStringValue(formData, "valueType") || "SCORE",
    description: getStringValue(formData, "description"),
  });

  if (!parsed.success) {
    redirectWithNotice(parsed.error.issues[0]?.message ?? "检查项目信息不完整。", "error", targetType);
  }

  try {
    await assertCategoryMatchesTargetType(parsed.data.categoryId, targetType);
    await prisma.inspectionItem.create({
      data: {
        name: parsed.data.name,
        categoryId: parsed.data.categoryId,
        valueType: parsed.data.valueType,
        description: parsed.data.description || null,
      },
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error", targetType);
  }

  redirectWithNotice("检查项目已新增。", "success", targetType);
}

export async function updateInspectionItem(formData: FormData) {
  await requireInspectionConfigurator();
  const targetType = getTargetTypeValue(formData);

  const parsed = inspectionItemMutationSchema.safeParse({
    id: getStringValue(formData, "id"),
    name: getStringValue(formData, "name"),
    categoryId: getStringValue(formData, "categoryId"),
    valueType: getStringValue(formData, "valueType") || "SCORE",
    description: getStringValue(formData, "description"),
  });

  if (!parsed.success || !parsed.data.id) {
    redirectWithNotice(parsed.error?.issues[0]?.message ?? "检查项目信息不完整。", "error", targetType);
  }

  try {
    await assertCategoryMatchesTargetType(parsed.data.categoryId, targetType);
    await prisma.inspectionItem.update({
      where: {
        id: parsed.data.id,
      },
      data: {
        name: parsed.data.name,
        categoryId: parsed.data.categoryId,
        valueType: parsed.data.valueType,
        description: parsed.data.description || null,
      },
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error", targetType);
  }

  redirectWithNotice("检查项目已更新。", "success", targetType);
}

export async function setInspectionItemStatus(formData: FormData) {
  await requireInspectionConfigurator();
  const targetType = getTargetTypeValue(formData);

  const parsed = inspectionItemStatusSchema.safeParse({
    id: getStringValue(formData, "id"),
    isActive: getStringValue(formData, "isActive"),
  });

  if (!parsed.success) {
    redirectWithNotice("检查项目状态更新请求无效。", "error", targetType);
  }

  try {
    await prisma.inspectionItem.update({
      where: {
        id: parsed.data.id,
      },
      data: {
        isActive: parsed.data.isActive,
      },
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error", targetType);
  }

  redirectWithNotice(
    parsed.data.isActive ? "检查项目已启用。" : "检查项目已停用。",
    "success",
    targetType,
  );
}

export async function createInspectionRecord(formData: FormData) {
  const session = await requireInspectionRecorder();
  const gradeScopeId = getManagedGradeId(session);
  const targetType = getTargetTypeValue(formData);

  const parsed = inspectionRecordMutationSchema.safeParse({
    targetType: getStringValue(formData, "targetType") || undefined,
    inspectionDate: getStringValue(formData, "inspectionDate"),
    inspectionItemId: getStringValue(formData, "inspectionItemId"),
    gradeId: getStringValue(formData, "gradeId"),
    classId: getStringValue(formData, "classId"),
    teacherId: getStringValue(formData, "teacherId"),
    value: getStringValue(formData, "value"),
    remarks: getStringValue(formData, "remarks"),
  });

  if (!parsed.success) {
    redirectAfterRecordMutation(
      parsed.error.issues[0]?.message ?? "检查记录信息不完整。",
      "error",
      targetType,
      formData,
    );
  }

  try {
    const item = await assertActiveInspectionItem(parsed.data.inspectionItemId);

    if (item.targetType !== parsed.data.targetType) {
      throw new Error("所选检查项目不属于当前量化类型。");
    }

    const scope = await resolveInspectionScope(
      parsed.data.targetType,
      parsed.data.gradeId,
      parsed.data.classId,
      parsed.data.teacherId,
      gradeScopeId,
    );
    const recordedById = await resolveRecordedById(session.user.id);

    await prisma.inspectionRecord.create({
      data: {
        inspectionDate: dateFromInput(parsed.data.inspectionDate),
        inspectionItemId: parsed.data.inspectionItemId,
        gradeId: scope.gradeId,
        classId: scope.classId,
        teacherId: scope.teacherId,
        value: parsed.data.value,
        remarks: parsed.data.remarks || null,
        recordedById,
      },
    });
  } catch (error) {
    redirectAfterRecordMutation(
      getMutationErrorMessage(error),
      "error",
      parsed.data.targetType,
      formData,
    );
  }

  redirectAfterRecordMutation(
    "检查记录已新增。",
    "success",
    parsed.data.targetType,
    formData,
  );
}

export async function updateInspectionRecord(formData: FormData) {
  const session = await requireInspectionRecorder();
  const gradeScopeId = getManagedGradeId(session);
  const targetType = getTargetTypeValue(formData);

  const parsed = inspectionRecordMutationSchema.safeParse({
    id: getStringValue(formData, "id"),
    targetType: getStringValue(formData, "targetType") || undefined,
    inspectionDate: getStringValue(formData, "inspectionDate"),
    inspectionItemId: getStringValue(formData, "inspectionItemId"),
    gradeId: getStringValue(formData, "gradeId"),
    classId: getStringValue(formData, "classId"),
    teacherId: getStringValue(formData, "teacherId"),
    value: getStringValue(formData, "value"),
    remarks: getStringValue(formData, "remarks"),
  });

  if (!parsed.success || !parsed.data.id) {
    redirectWithNotice(parsed.error?.issues[0]?.message ?? "检查记录信息不完整。", "error", targetType);
  }

  try {
    const item = await assertActiveInspectionItem(parsed.data.inspectionItemId);

    if (item.targetType !== parsed.data.targetType) {
      throw new Error("所选检查项目不属于当前量化类型。");
    }

    await assertRecordAccessible(parsed.data.id, gradeScopeId);
    const scope = await resolveInspectionScope(
      parsed.data.targetType,
      parsed.data.gradeId,
      parsed.data.classId,
      parsed.data.teacherId,
      gradeScopeId,
    );

    await prisma.inspectionRecord.update({
      where: {
        id: parsed.data.id,
      },
      data: {
        inspectionDate: dateFromInput(parsed.data.inspectionDate),
        inspectionItemId: parsed.data.inspectionItemId,
        gradeId: scope.gradeId,
        classId: scope.classId,
        teacherId: scope.teacherId,
        value: parsed.data.value,
        remarks: parsed.data.remarks || null,
      },
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error", parsed.data.targetType);
  }

  redirectWithNotice("检查记录已更新。", "success", parsed.data.targetType);
}
