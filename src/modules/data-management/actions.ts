"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { requireSystemAdmin } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { createDataManagementBackup } from "@/modules/data-management/backup";
import {
  type CleanupActionKey,
  type ManagedTableKey,
  getManagedTableDefinition,
  normalizeManagedTableKey,
} from "@/modules/data-management/definitions";
import {
  normalizeProfileData,
  profileDataToJsonInput,
} from "@/modules/people/helpers";

type NoticeTone = "success" | "error";
type Tx = Prisma.TransactionClient;
type DeletedCounts = Record<string, number>;

const DELETE_CONFIRMATION = "确认删除";
const STRUCTURE_CONFIRMATION = "清空结构和业务数据";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getStringValues(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .flatMap((value) => (typeof value === "string" ? [value.trim()] : []))
    .filter(Boolean);
}

function getBooleanValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

function redirectWithNotice(
  message: string,
  tone: NoticeTone = "success",
  table: ManagedTableKey = "teacher",
): never {
  const params = new URLSearchParams({
    message,
    tone,
    table,
  });

  redirect(`/dashboard/data-management?${params.toString()}`);
}

function getActionErrorMessage(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2003") {
      return "存在关联数据，系统未能安全删除。请先查看影响预览并调整删除范围。";
    }

    if (error.code === "P2025") {
      return "要删除的数据不存在，页面可能已经过期。";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "数据管理操作未完成，请稍后重试。";
}

function getAuditActorId(session: Awaited<ReturnType<typeof requireSystemAdmin>>) {
  return session.user.id === "bootstrap-admin" ? null : session.user.id;
}

function mergeCounts(...countsList: DeletedCounts[]) {
  const merged: DeletedCounts = {};

  for (const counts of countsList) {
    for (const [key, value] of Object.entries(counts)) {
      merged[key] = (merged[key] ?? 0) + value;
    }
  }

  return merged;
}

function summarizeDeletedCounts(counts: DeletedCounts) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const detail = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => `${key}: ${count}`)
    .join("；");

  return {
    total,
    detail: detail || "无数据被删除",
  };
}

async function logBackup(
  actorId: string | null,
  backup: { filePath: string; pgDumpPath: string },
  targetType: string,
) {
  await prisma.auditLog.create({
    data: {
      actorId,
      action: "DATA_MANAGEMENT_BACKUP",
      targetType,
      summary: `数据管理删除前备份：${backup.filePath}`,
      metadata: {
        backupPath: backup.filePath,
        pgDumpPath: backup.pgDumpPath,
      },
    },
  });
}

async function pruneProfileDataValues(
  tx: Tx,
  targetType: "TEACHER" | "STUDENT",
  fieldIds: string[],
) {
  if (fieldIds.length === 0) {
    return;
  }

  if (targetType === "TEACHER") {
    const teachers = await tx.teacher.findMany({
      select: {
        id: true,
        profileData: true,
      },
    });

    for (const teacher of teachers) {
      const profileData = normalizeProfileData(teacher.profileData);
      let changed = false;

      for (const fieldId of fieldIds) {
        if (Object.prototype.hasOwnProperty.call(profileData, fieldId)) {
          delete profileData[fieldId];
          changed = true;
        }
      }

      if (changed) {
        await tx.teacher.update({
          where: {
            id: teacher.id,
          },
          data: {
            profileData: profileDataToJsonInput(profileData),
          },
        });
      }
    }

    return;
  }

  const students = await tx.student.findMany({
    select: {
      id: true,
      profileData: true,
    },
  });

  for (const student of students) {
    const profileData = normalizeProfileData(student.profileData);
    let changed = false;

    for (const fieldId of fieldIds) {
      if (Object.prototype.hasOwnProperty.call(profileData, fieldId)) {
        delete profileData[fieldId];
        changed = true;
      }
    }

    if (changed) {
      await tx.student.update({
        where: {
          id: student.id,
        },
        data: {
          profileData: profileDataToJsonInput(profileData),
        },
      });
    }
  }
}

async function deleteRowsByTable(
  tx: Tx,
  table: ManagedTableKey,
  rowIds: string[],
): Promise<DeletedCounts> {
  const ids = Array.from(new Set(rowIds)).filter(Boolean);

  if (ids.length === 0) {
    throw new Error("请至少选择一条要删除的数据。");
  }

  switch (table) {
    case "teacher": {
      const assignments = await tx.teacherDepartmentAssignment.deleteMany({
        where: {
          teacherId: {
            in: ids,
          },
        },
      });
      const teachers = await tx.teacher.deleteMany({
        where: {
          id: {
            in: ids,
          },
        },
      });
      return {
        TeacherDepartmentAssignment: assignments.count,
        Teacher: teachers.count,
      };
    }
    case "activeStudent":
    case "archivedStudent": {
      const students = await tx.student.deleteMany({
        where: {
          id: {
            in: ids,
          },
          isArchived: table === "archivedStudent",
        },
      });
      return {
        Student: students.count,
      };
    }
    case "teacherDepartmentAssignment": {
      let count = 0;

      for (const id of ids) {
        const [teacherId, departmentId] = id.split("::");

        if (!teacherId || !departmentId) {
          continue;
        }

        const deleted = await tx.teacherDepartmentAssignment.deleteMany({
          where: {
            teacherId,
            departmentId,
          },
        });
        count += deleted.count;
      }

      return {
        TeacherDepartmentAssignment: count,
      };
    }
    case "inspectionRecord": {
      const records = await tx.inspectionRecord.deleteMany({
        where: {
          id: {
            in: ids,
          },
        },
      });
      return {
        InspectionRecord: records.count,
      };
    }
    case "inspectionCategory": {
      const itemIds = (
        await tx.inspectionItem.findMany({
          where: {
            categoryId: {
              in: ids,
            },
          },
          select: {
            id: true,
          },
        })
      ).map((item) => item.id);
      const records = await tx.inspectionRecord.deleteMany({
        where: {
          inspectionItemId: {
            in: itemIds,
          },
        },
      });
      const items = await tx.inspectionItem.deleteMany({
        where: {
          id: {
            in: itemIds,
          },
        },
      });
      const categories = await tx.inspectionCategory.deleteMany({
        where: {
          id: {
            in: ids,
          },
        },
      });
      return {
        InspectionRecord: records.count,
        InspectionItem: items.count,
        InspectionCategory: categories.count,
      };
    }
    case "inspectionItem": {
      const records = await tx.inspectionRecord.deleteMany({
        where: {
          inspectionItemId: {
            in: ids,
          },
        },
      });
      const items = await tx.inspectionItem.deleteMany({
        where: {
          id: {
            in: ids,
          },
        },
      });
      return {
        InspectionRecord: records.count,
        InspectionItem: items.count,
      };
    }
    case "grade": {
      const classIds = (
        await tx.class.findMany({
          where: {
            gradeId: {
              in: ids,
            },
          },
          select: {
            id: true,
          },
        })
      ).map((classItem) => classItem.id);
      const students = await tx.student.deleteMany({
        where: {
          gradeId: {
            in: ids,
          },
        },
      });
      const classes = await tx.class.deleteMany({
        where: {
          id: {
            in: classIds,
          },
        },
      });
      const grades = await tx.grade.deleteMany({
        where: {
          id: {
            in: ids,
          },
        },
      });
      return {
        Student: students.count,
        Class: classes.count,
        Grade: grades.count,
      };
    }
    case "class": {
      const classes = await tx.class.deleteMany({
        where: {
          id: {
            in: ids,
          },
        },
      });
      return {
        Class: classes.count,
      };
    }
    case "department": {
      const assignments = await tx.teacherDepartmentAssignment.deleteMany({
        where: {
          departmentId: {
            in: ids,
          },
        },
      });
      await tx.teacher.updateMany({
        where: {
          departmentId: {
            in: ids,
          },
        },
        data: {
          departmentId: null,
        },
      });
      const departments = await tx.department.deleteMany({
        where: {
          id: {
            in: ids,
          },
        },
      });
      return {
        TeacherDepartmentAssignment: assignments.count,
        Department: departments.count,
      };
    }
    case "subject": {
      await tx.teacher.updateMany({
        where: {
          subjectId: {
            in: ids,
          },
        },
        data: {
          subjectId: null,
        },
      });
      const subjects = await tx.subject.deleteMany({
        where: {
          id: {
            in: ids,
          },
        },
      });
      return {
        Subject: subjects.count,
      };
    }
    case "academicYear": {
      const gradeIds = (
        await tx.grade.findMany({
          where: {
            academicYearId: {
              in: ids,
            },
          },
          select: {
            id: true,
          },
        })
      ).map((grade) => grade.id);
      const nestedCounts =
        gradeIds.length > 0 ? await deleteRowsByTable(tx, "grade", gradeIds) : {};
      const years = await tx.academicYear.deleteMany({
        where: {
          id: {
            in: ids,
          },
        },
      });
      return mergeCounts(nestedCounts, {
        AcademicYear: years.count,
      });
    }
    case "profileFieldDefinition": {
      const definitions = await tx.profileFieldDefinition.findMany({
        where: {
          id: {
            in: ids,
          },
        },
        select: {
          id: true,
          targetType: true,
        },
      });
      await pruneProfileDataValues(
        tx,
        "TEACHER",
        definitions
          .filter((definition) => definition.targetType === "TEACHER")
          .map((definition) => definition.id),
      );
      await pruneProfileDataValues(
        tx,
        "STUDENT",
        definitions
          .filter((definition) => definition.targetType === "STUDENT")
          .map((definition) => definition.id),
      );
      const fields = await tx.profileFieldDefinition.deleteMany({
        where: {
          id: {
            in: ids,
          },
        },
      });
      return {
        ProfileFieldDefinition: fields.count,
      };
    }
    case "auditLog":
      throw new Error("审计日志只读保留，不能在数据管理中心删除。");
  }
}

async function runCleanup(tx: Tx, action: CleanupActionKey): Promise<DeletedCounts> {
  switch (action) {
    case "clearInspectionRecords": {
      const records = await tx.inspectionRecord.deleteMany();
      return {
        InspectionRecord: records.count,
      };
    }
    case "clearPeopleRecords": {
      const assignments = await tx.teacherDepartmentAssignment.deleteMany();
      const students = await tx.student.deleteMany();
      const teachers = await tx.teacher.deleteMany();
      return {
        TeacherDepartmentAssignment: assignments.count,
        Student: students.count,
        Teacher: teachers.count,
      };
    }
    case "clearStructureAndBusinessData": {
      const records = await tx.inspectionRecord.deleteMany();
      const assignments = await tx.teacherDepartmentAssignment.deleteMany();
      const students = await tx.student.deleteMany();
      const teachers = await tx.teacher.deleteMany();
      const fields = await tx.profileFieldDefinition.deleteMany();
      const items = await tx.inspectionItem.deleteMany();
      const categories = await tx.inspectionCategory.deleteMany();
      const classes = await tx.class.deleteMany();
      const grades = await tx.grade.deleteMany();
      const years = await tx.academicYear.deleteMany();
      const departments = await tx.department.deleteMany();
      const subjects = await tx.subject.deleteMany();

      return {
        InspectionRecord: records.count,
        TeacherDepartmentAssignment: assignments.count,
        Student: students.count,
        Teacher: teachers.count,
        ProfileFieldDefinition: fields.count,
        InspectionItem: items.count,
        InspectionCategory: categories.count,
        Class: classes.count,
        Grade: grades.count,
        AcademicYear: years.count,
        Department: departments.count,
        Subject: subjects.count,
      };
    }
  }
}

function parseCleanupAction(value: string): CleanupActionKey {
  if (
    value === "clearInspectionRecords" ||
    value === "clearPeopleRecords" ||
    value === "clearStructureAndBusinessData"
  ) {
    return value;
  }

  throw new Error("未知的一键清理操作。");
}

function getCleanupLabel(action: CleanupActionKey) {
  if (action === "clearInspectionRecords") {
    return "清空检查数据";
  }

  if (action === "clearPeopleRecords") {
    return "清空师生档案";
  }

  return "清空结构与业务数据";
}

export async function deleteManagedRows(formData: FormData) {
  const session = await requireSystemAdmin();
  const table = normalizeManagedTableKey(getStringValue(formData, "table"));
  const definition = getManagedTableDefinition(table);
  const rowIds = getStringValues(formData, "rowIds");
  let successMessage = "";

  if (!definition.deletable) {
    redirectWithNotice("该数据表只读保留，不能删除。", "error", table);
  }

  if (!getBooleanValue(formData, "confirmed")) {
    redirectWithNotice("请先勾选确认框。", "error", table);
  }

  if (getStringValue(formData, "confirmationText") !== DELETE_CONFIRMATION) {
    redirectWithNotice(`请输入“${DELETE_CONFIRMATION}”后再删除。`, "error", table);
  }

  try {
    const backup = await createDataManagementBackup();
    const actorId = getAuditActorId(session);
    await logBackup(actorId, backup, definition.label);

    const deleted = await prisma.$transaction(async (tx) => {
      const counts = await deleteRowsByTable(tx, table, rowIds);
      const summary = summarizeDeletedCounts(counts);

      await tx.auditLog.create({
        data: {
          actorId,
          action: "DATA_MANAGEMENT_DELETE_ROWS",
          targetType: definition.label,
          summary: `数据管理删除 ${definition.label}，共 ${summary.total} 条。`,
          metadata: {
            table,
            rowIds,
            deletedCounts: counts,
            backupPath: backup.filePath,
          },
        },
      });

      return counts;
    });
    const summary = summarizeDeletedCounts(deleted);
    successMessage = `删除完成：${summary.detail}。备份文件：${backup.filePath}`;
  } catch (error) {
    redirectWithNotice(getActionErrorMessage(error), "error", table);
  }

  redirectWithNotice(successMessage, "success", table);
}

export async function runDataCleanup(formData: FormData) {
  const session = await requireSystemAdmin();
  const currentTable = normalizeManagedTableKey(getStringValue(formData, "table"));
  let action: CleanupActionKey;
  let successMessage = "";

  try {
    action = parseCleanupAction(getStringValue(formData, "action"));
  } catch (error) {
    redirectWithNotice(getActionErrorMessage(error), "error", currentTable);
  }

  const expectedConfirmation =
    action === "clearStructureAndBusinessData"
      ? STRUCTURE_CONFIRMATION
      : DELETE_CONFIRMATION;

  if (!getBooleanValue(formData, "confirmed")) {
    redirectWithNotice("请先勾选确认框。", "error", currentTable);
  }

  if (getStringValue(formData, "confirmationText") !== expectedConfirmation) {
    redirectWithNotice(`请输入“${expectedConfirmation}”后再执行清理。`, "error", currentTable);
  }

  try {
    const backup = await createDataManagementBackup();
    const actorId = getAuditActorId(session);
    const label = getCleanupLabel(action);
    await logBackup(actorId, backup, label);

    const deleted = await prisma.$transaction(async (tx) => {
      const counts = await runCleanup(tx, action);
      const summary = summarizeDeletedCounts(counts);

      await tx.auditLog.create({
        data: {
          actorId,
          action: "DATA_MANAGEMENT_CLEANUP",
          targetType: label,
          summary: `${label}完成，共删除 ${summary.total} 条。`,
          metadata: {
            cleanupAction: action,
            deletedCounts: counts,
            backupPath: backup.filePath,
          },
        },
      });

      return counts;
    });
    const summary = summarizeDeletedCounts(deleted);
    successMessage = `${label}完成：${summary.detail}。备份文件：${backup.filePath}`;
  } catch (error) {
    redirectWithNotice(getActionErrorMessage(error), "error", currentTable);
  }

  redirectWithNotice(successMessage, "success", currentTable);
}
