"use server";

import { redirect } from "next/navigation";
import { GradeStage } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import {
  getManagedGradeId,
  requireAlumniArchiveAccess,
  requirePeopleEditor,
  requireStudentImportAccess,
  requireStudentDataEditor,
  requireTeacherDataEditor,
  requireTeacherImportAccess,
} from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import {
  peopleRecordDeleteSchema,
  profileFieldDefinitionDeleteSchema,
  profileFieldDefinitionMutationSchema,
  profileFieldDefinitionStatusSchema,
  studentRecordStatusSchema,
  studentMutationSchema,
  teacherRecordStatusSchema,
  teacherMutationSchema,
} from "@/lib/validation/people";
import {
  collectProfileValuesFromFormData,
  collectProfileValuesFromRow,
  mergeProfileData,
  normalizeProfileData,
  profileDataToJsonInput,
  splitMultiValueText,
} from "@/modules/people/helpers";
import {
  normalizeTeacherDepartmentIdentity,
} from "@/modules/people/department-identities";
import type { StudentViewMode } from "@/modules/people/queries";
import { getProfileFieldDefinitions } from "@/modules/people/queries";
import {
  getCellText,
  getReservedProfileFieldNames,
  parseFirstWorksheet,
  studentImportColumnAliases,
  teacherImportColumnAliases,
} from "@/modules/people/spreadsheet";
import {
  getStudentStatusLabel,
  getTeacherStatusLabel,
} from "@/modules/people/status-options";
import { getSystemProfileFieldByName } from "@/modules/people/system-profile-fields";
import {
  ensureStudentLoginAccount,
  ensureTeacherLoginAccount,
} from "@/modules/accounts/helpers";
import { findPositionForDepartmentIdentity } from "@/modules/school-structure/department-positions";
import { syncTeacherUserRole } from "@/modules/people/teacher-role";

type NoticeTone = "success" | "error";
type ImportStats = {
  created: number;
  updated: number;
  accountsCreated: number;
  skipped: number;
  errors: string[];
};

type PeopleReferenceMaps = Awaited<ReturnType<typeof loadPeopleReferenceMaps>>;
type ProfileFieldCollection = ReturnType<typeof collectProfileValuesFromFormData>;
type ActiveProfileField = Awaited<ReturnType<typeof getProfileFieldDefinitions>>[number];
type TeacherDepartmentIdentityMap = Record<
  string,
  ReturnType<typeof normalizeTeacherDepartmentIdentity>[]
>;

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getStringValues(formData: FormData, key: string) {
  return Array.from(
    new Set(
      formData
        .getAll(key)
        .flatMap((value) => (typeof value === "string" ? [value.trim()] : []))
        .filter(Boolean),
    ),
  );
}

function getTeacherDepartmentIdentitiesFromFormData(formData: FormData) {
  const departmentIds = getStringValues(formData, "departmentIds");

  return Object.fromEntries(
    departmentIds.map((departmentId) => [
      departmentId,
      Array.from(
        new Set(
          getStringValues(formData, `departmentIdentity__${departmentId}`).map(
            (value) => normalizeTeacherDepartmentIdentity(value),
          ),
        ),
      ),
    ]),
  ) as TeacherDepartmentIdentityMap;
}

function getWorkbookFile(formData: FormData, key: string) {
  const value = formData.get(key);

  if (!(value instanceof File) || value.size === 0) {
    throw new Error("请先选择一个 Excel 文件。");
  }

  return value;
}

function optionalRelationId(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function getStudentViewMode(formData: FormData): StudentViewMode {
  return getStringValue(formData, "studentViewMode") === "archived"
    ? "archived"
    : "active";
}

function getStudentViewPath(studentViewMode: StudentViewMode) {
  return studentViewMode === "archived"
    ? "/dashboard/archive/students"
    : "/dashboard/people?view=students";
}

function getTeacherViewPath() {
  return "/dashboard/people?view=teachers";
}

function getProfileFieldViewPath(targetType: string) {
  return targetType === "TEACHER" ? getTeacherViewPath() : getStudentViewPath("active");
}

function redirectWithNotice(
  message: string,
  tone: NoticeTone = "success",
  path = "/dashboard/people?view=students",
): never {
  const params = new URLSearchParams({
    message,
    tone,
  });

  redirect(`${path}${path.includes("?") ? "&" : "?"}${params.toString()}`);
}

function getMutationErrorMessage(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "编号或名称已存在，请调整后重试。";
    }

    if (error.code === "P2003") {
      return "所选关联数据不存在或已被删除，请刷新后重试。";
    }

    if (error.code === "P2025") {
      return "未找到要操作的档案记录。";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "操作未完成，请稍后重试。";
}

function normalizeTeacherStatus(value: string) {
  const normalized = value.trim().toUpperCase();

  if (["备孕", "PREGNANCY_PREPARATION"].includes(normalized)) {
    return "PREGNANCY_PREPARATION";
  }

  if (["产假", "MATERNITY_LEAVE"].includes(normalized)) {
    return "MATERNITY_LEAVE";
  }

  if (
    ["停用", "离职", "长病假", "INACTIVE", "DISABLED", "LONG_SICK_LEAVE"].includes(
      normalized,
    )
  ) {
    return "LONG_SICK_LEAVE";
  }

  return "ACTIVE";
}

function normalizeStudentStatus(value: string) {
  const normalized = value.trim().toUpperCase();

  if (["休学", "SUSPENDED"].includes(normalized)) {
    return "SUSPENDED";
  }

  if (
    ["停用", "离校", "长期请假", "INACTIVE", "DISABLED", "LONG_TERM_LEAVE"].includes(
      normalized,
    )
  ) {
    return "LONG_TERM_LEAVE";
  }

  return "ACTIVE";
}

function buildImportMessage(target: string, stats: ImportStats) {
  const base = `${target}导入完成：新增 ${stats.created}，更新 ${stats.updated}，新建账号 ${stats.accountsCreated}，跳过 ${stats.skipped}。`;

  if (stats.errors.length === 0) {
    return base;
  }

  return `${base} 问题示例：${stats.errors.slice(0, 3).join("；")}`;
}

async function buildTeacherDepartmentAssignments(
  departmentIds: string[],
  departmentIdentities: TeacherDepartmentIdentityMap = {},
) {
  const assignments = [];

  for (const departmentId of departmentIds) {
    const identityTypes =
      departmentIdentities[departmentId]?.length > 0
        ? departmentIdentities[departmentId]
        : [normalizeTeacherDepartmentIdentity("")];

    for (const identityType of identityTypes) {
      const position = await findPositionForDepartmentIdentity(prisma, {
        departmentId,
        identityType,
      });

      assignments.push({
        identityType: position?.identityType ?? identityType,
        ...(position
          ? {
              position: {
                connect: {
                  id: position.id,
                },
              },
            }
          : {}),
        department: {
          connect: {
            id: departmentId,
          },
        },
      });
    }
  }

  return assignments;
}

async function buildTeacherDepartmentCreateData(
  departmentIds: string[],
  departmentIdentities: TeacherDepartmentIdentityMap = {},
) {
  const assignments = await buildTeacherDepartmentAssignments(
    departmentIds,
    departmentIdentities,
  );

  return {
    departmentId: departmentIds[0] ?? null,
    departmentAssignments:
      departmentIds.length > 0
        ? {
            create: assignments,
          }
        : undefined,
  };
}

async function buildTeacherDepartmentUpdateData(
  departmentIds: string[],
  departmentIdentities: TeacherDepartmentIdentityMap = {},
) {
  const assignments = await buildTeacherDepartmentAssignments(
    departmentIds,
    departmentIdentities,
  );

  return {
    departmentId: departmentIds[0] ?? null,
    departmentAssignments: {
      deleteMany: {},
      ...(departmentIds.length > 0
        ? {
            create: assignments,
          }
        : {}),
    },
  };
}

async function assertGradeAvailableForStudentView(
  gradeId: string,
  studentViewMode: StudentViewMode,
) {
  const grade = await prisma.grade.findUnique({
    where: {
      id: gradeId,
    },
    select: {
      id: true,
      name: true,
      stage: true,
      isVisibleInMain: true,
    },
  });

  if (!grade) {
    throw new Error("所选年级不存在，请刷新后重试。");
  }

  if (studentViewMode === "archived") {
    if (grade.stage !== GradeStage.ALUMNI) {
      throw new Error("往届学生只能归入已归档的届别年级。");
    }

    return grade;
  }

  if (!grade.isVisibleInMain || grade.stage === GradeStage.ALUMNI) {
    throw new Error("当前页面只能选择前台在用年级。");
  }

  return grade;
}

async function assertClassMatchesGrade(classId: string | null, gradeId: string) {
  if (!classId) {
    return;
  }

  const classRecord = await prisma.class.findUnique({
    where: {
      id: classId,
    },
    select: {
      gradeId: true,
    },
  });

  if (!classRecord || classRecord.gradeId !== gradeId) {
    throw new Error("所选班级不属于当前年级，请重新选择。");
  }
}

async function assertStudentRecordMatchesView(
  studentId: string,
  studentViewMode: StudentViewMode,
) {
  const student = await prisma.student.findUnique({
    where: {
      id: studentId,
    },
    select: {
      isArchived: true,
    },
  });

  if (!student) {
    throw new Error("未找到要操作的学生档案。");
  }

  if (student.isArchived !== (studentViewMode === "archived")) {
    throw new Error("请在对应的数据页面里维护这条学生档案。");
  }
}

async function loadPeopleReferenceMaps(studentViewMode: StudentViewMode = "active") {
  const [departments, subjects, grades] = await Promise.all([
    prisma.department.findMany(),
    prisma.subject.findMany(),
    prisma.grade.findMany({
      where:
        studentViewMode === "archived"
          ? {
              stage: GradeStage.ALUMNI,
            }
          : {
              isVisibleInMain: true,
            },
      include: {
        classes: true,
      },
    }),
  ]);

  const departmentByName = new Map(
    departments.map((department) => [department.name.trim(), department.id]),
  );
  const subjectByName = new Map(
    subjects.map((subject) => [subject.name.trim(), subject.id]),
  );
  const gradesByName = new Map<string, typeof grades>();
  const classesByGradeAndName = new Map<string, string>();

  for (const grade of grades) {
    const gradesWithSameName = gradesByName.get(grade.name) ?? [];
    gradesWithSameName.push(grade);
    gradesByName.set(grade.name, gradesWithSameName);

    for (const classItem of grade.classes) {
      classesByGradeAndName.set(`${grade.id}::${classItem.name}`, classItem.id);
    }
  }

  return {
    departmentByName,
    subjectByName,
    gradesByName,
    classesByGradeAndName,
  };
}

function resolveGradeId(
  refs: PeopleReferenceMaps,
  gradeName: string,
  allowedGradeId?: string | null,
) {
  if (!gradeName) {
    throw new Error("年级不能为空。");
  }

  const directMatches = refs.gradesByName.get(gradeName) ?? [];

  if (directMatches.length === 0) {
    throw new Error(`找不到年级“${gradeName}”。`);
  }

  if (directMatches.length > 1) {
    throw new Error(`年级“${gradeName}”存在重复，请先在系统里整理后再导入。`);
  }

  const directResolvedGradeId = directMatches[0].id;

  if (allowedGradeId && directResolvedGradeId !== allowedGradeId) {
    throw new Error("当前账号只能导入本年级学生数据。");
  }

  return directResolvedGradeId;
}

function resolveClassId(
  refs: PeopleReferenceMaps,
  gradeId: string,
  className: string,
) {
  if (!className) {
    return null;
  }

  const classId = refs.classesByGradeAndName.get(`${gradeId}::${className}`);

  if (!classId) {
    throw new Error(`所选年级下找不到班级“${className}”。`);
  }

  return classId;
}

function resolveDepartmentIdsByNames(
  refs: PeopleReferenceMaps,
  departmentNames: string[],
) {
  const departmentIds: string[] = [];

  for (const departmentName of departmentNames) {
    const departmentId = refs.departmentByName.get(departmentName);

    if (!departmentId) {
      throw new Error(`找不到部门“${departmentName}”。`);
    }

    departmentIds.push(departmentId);
  }

  return Array.from(new Set(departmentIds));
}

function resolveTeacherDepartmentIdentityAssignments(
  refs: PeopleReferenceMaps,
  identityText: string,
) {
  const departmentIds: string[] = [];
  const departmentIdentities: TeacherDepartmentIdentityMap = {};

  for (const item of splitMultiValueText(identityText)) {
    const parts = item
      .split(/[\/|｜]/u)
      .map((part) => part.trim())
      .filter(Boolean);
    const rawDepartmentName = parts[0] ?? "";
    const rawIdentityText = parts.slice(1).join("、");

    if (!rawDepartmentName) {
      continue;
    }

    const departmentId = refs.departmentByName.get(rawDepartmentName);

    if (!departmentId) {
      throw new Error(`找不到部门“${rawDepartmentName}”。`);
    }

    departmentIds.push(departmentId);
    const identities = rawIdentityText
      ? splitMultiValueText(rawIdentityText).map((name) =>
          normalizeTeacherDepartmentIdentity(name),
        )
      : [normalizeTeacherDepartmentIdentity("")];

    departmentIdentities[departmentId] = Array.from(
      new Set([...(departmentIdentities[departmentId] ?? []), ...identities]),
    );
  }

  return {
    departmentIds: Array.from(new Set(departmentIds)),
    departmentIdentities,
  };
}
async function assertProfileFieldDefinitionNameIsAllowed(
  targetType: "TEACHER" | "STUDENT",
  name: string,
) {
  const reservedNames = getReservedProfileFieldNames(targetType);

  if (reservedNames.has(name.trim())) {
    throw new Error("统计类目名称不能与系统固定导入列重名。");
  }
}

function getTouchedSystemProfileValue(
  definitions: ActiveProfileField[],
  collection: ProfileFieldCollection,
  fieldKey: string,
) {
  const definition = definitions.find((field) => field.fieldKey === fieldKey);

  if (!definition || !collection.touchedFieldIds.includes(definition.id)) {
    return undefined;
  }

  return collection.values[definition.id] ?? "";
}

export async function createProfileFieldDefinition(formData: FormData) {
  await requirePeopleEditor();
  const redirectPath = getProfileFieldViewPath(getStringValue(formData, "targetType"));
  let noticeMessage = "统计类目已新增。";

  const parsed = profileFieldDefinitionMutationSchema.safeParse({
    targetType: getStringValue(formData, "targetType"),
    name: getStringValue(formData, "name"),
  });

  if (!parsed.success) {
    redirectWithNotice(
      parsed.error.issues[0]?.message ?? "统计类目名称无效。",
      "error",
      redirectPath,
    );
  }

  try {
    await assertProfileFieldDefinitionNameIsAllowed(
      parsed.data.targetType,
      parsed.data.name,
    );
    const systemField = getSystemProfileFieldByName(
      parsed.data.targetType,
      parsed.data.name,
    );
    const existingDefinition = await prisma.profileFieldDefinition.findUnique({
      where: {
        targetType_name: {
          targetType: parsed.data.targetType,
          name: parsed.data.name,
        },
      },
      select: {
        id: true,
        isDeleted: true,
      },
    });
    const existingSystemDefinition =
      systemField && !existingDefinition
        ? await prisma.profileFieldDefinition.findUnique({
            where: {
              targetType_fieldKey: {
                targetType: parsed.data.targetType,
                fieldKey: systemField.fieldKey,
              },
            },
            select: {
              id: true,
              isDeleted: true,
            },
          })
        : null;

    if (existingDefinition || existingSystemDefinition) {
      const definitionToRestore = existingDefinition ?? existingSystemDefinition;

      if (!definitionToRestore?.isDeleted) {
        throw new Error("统计类目名称已存在，请调整后重试。");
      }

      await prisma.profileFieldDefinition.update({
        where: {
          id: definitionToRestore.id,
        },
        data: {
          name: systemField?.name ?? parsed.data.name,
          isActive: true,
          isDeleted: false,
        },
      });
      noticeMessage = "统计类目已恢复。";
    } else {
      const lastDefinition = await prisma.profileFieldDefinition.findFirst({
        where: {
          targetType: parsed.data.targetType,
          isDeleted: false,
        },
        orderBy: [{ sortOrder: "desc" }, { createdAt: "desc" }],
        select: {
          sortOrder: true,
        },
      });

      await prisma.profileFieldDefinition.create({
        data: {
          targetType: parsed.data.targetType,
          fieldKey: systemField?.fieldKey ?? null,
          name: parsed.data.name,
          sortOrder: systemField?.sortOrder ?? (lastDefinition?.sortOrder ?? -1) + 1,
        },
      });
    }
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error", redirectPath);
  }

  redirectWithNotice(noticeMessage, "success", redirectPath);
}

export async function updateProfileFieldDefinition(formData: FormData) {
  await requirePeopleEditor();
  const redirectPath = getProfileFieldViewPath(getStringValue(formData, "targetType"));

  const parsed = profileFieldDefinitionMutationSchema.safeParse({
    id: getStringValue(formData, "id"),
    targetType: getStringValue(formData, "targetType"),
    name: getStringValue(formData, "name"),
  });

  if (!parsed.success || !parsed.data.id) {
    redirectWithNotice(
      parsed.error?.issues[0]?.message ?? "统计类目名称无效。",
      "error",
      redirectPath,
    );
  }

  try {
    const existing = await prisma.profileFieldDefinition.findUnique({
      where: {
        id: parsed.data.id,
      },
      select: {
        targetType: true,
      },
    });

    if (!existing || existing.targetType !== parsed.data.targetType) {
      throw new Error("统计类目不存在或类型不匹配。");
    }

    await assertProfileFieldDefinitionNameIsAllowed(
      parsed.data.targetType,
      parsed.data.name,
    );

    await prisma.profileFieldDefinition.update({
      where: {
        id: parsed.data.id,
      },
      data: {
        name: parsed.data.name,
      },
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error", redirectPath);
  }

  redirectWithNotice("统计类目已更新。", "success", redirectPath);
}

export async function setProfileFieldDefinitionStatus(formData: FormData) {
  await requirePeopleEditor();
  const redirectPath = getProfileFieldViewPath(getStringValue(formData, "targetType"));

  const parsed = profileFieldDefinitionStatusSchema.safeParse({
    id: getStringValue(formData, "id"),
    isActive: getStringValue(formData, "isActive"),
  });

  if (!parsed.success) {
    redirectWithNotice("统计类目状态更新请求无效。", "error", redirectPath);
  }

  try {
    await prisma.profileFieldDefinition.update({
      where: {
        id: parsed.data.id,
      },
      data: {
        isActive: parsed.data.isActive === "true",
      },
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error", redirectPath);
  }

  redirectWithNotice(
    parsed.data.isActive === "true" ? "统计类目已启用。" : "统计类目已停用。",
    "success",
    redirectPath,
  );
}

export async function deleteProfileFieldDefinition(formData: FormData) {
  await requirePeopleEditor();
  const redirectPath = getProfileFieldViewPath(getStringValue(formData, "targetType"));

  const parsed = profileFieldDefinitionDeleteSchema.safeParse({
    id: getStringValue(formData, "id"),
  });

  if (!parsed.success) {
    redirectWithNotice("统计类目删除请求无效。", "error", redirectPath);
  }

  try {
    const existing = await prisma.profileFieldDefinition.findUnique({
      where: {
        id: parsed.data.id,
      },
      select: {
        id: true,
        targetType: true,
        fieldKey: true,
      },
    });

    if (!existing) {
      throw new Error("统计类目不存在或已删除。");
    }

    await prisma.$transaction(async (tx) => {
      if (existing.fieldKey) {
        await tx.profileFieldDefinition.update({
          where: {
            id: existing.id,
          },
          data: {
            isActive: false,
            isDeleted: true,
          },
        });
      } else {
        await tx.profileFieldDefinition.delete({
          where: {
            id: existing.id,
          },
        });
      }

      if (existing.targetType === "TEACHER") {
        const teachers = await tx.teacher.findMany({
          select: {
            id: true,
            profileData: true,
          },
        });

        for (const teacher of teachers) {
          const profileData = normalizeProfileData(teacher.profileData);

          if (!Object.prototype.hasOwnProperty.call(profileData, existing.id)) {
            continue;
          }

          delete profileData[existing.id];
          await tx.teacher.update({
            where: {
              id: teacher.id,
            },
            data: {
              profileData: profileDataToJsonInput(profileData),
            },
          });
        }
      } else {
        const students = await tx.student.findMany({
          select: {
            id: true,
            profileData: true,
          },
        });

        for (const student of students) {
          const profileData = normalizeProfileData(student.profileData);

          if (!Object.prototype.hasOwnProperty.call(profileData, existing.id)) {
            continue;
          }

          delete profileData[existing.id];
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
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error", redirectPath);
  }

  redirectWithNotice("统计类目已删除。", "success", redirectPath);
}

export async function createTeacher(formData: FormData) {
  await requireTeacherDataEditor();
  const redirectPath = getTeacherViewPath();
  const departmentIds = getStringValues(formData, "departmentIds");

  const parsed = teacherMutationSchema.safeParse({
    idCardNumber: getStringValue(formData, "idCardNumber"),
    name: getStringValue(formData, "name"),
    departmentIds,
    departmentIdentities: getTeacherDepartmentIdentitiesFromFormData(formData),
    subjectId: getStringValue(formData, "subjectId"),
    employmentStatus: getStringValue(formData, "employmentStatus") || "ACTIVE",
  });

  if (!parsed.success) {
    redirectWithNotice(
      parsed.error.issues[0]?.message ?? "教师信息不完整。",
      "error",
      redirectPath,
    );
  }

  try {
    const teacherProfileFields = await getProfileFieldDefinitions("TEACHER", {
      activeOnly: true,
    });
    const profileValues = collectProfileValuesFromFormData(
      formData,
      teacherProfileFields,
    );
    const employeeNumber =
      getTouchedSystemProfileValue(
        teacherProfileFields,
        profileValues,
        "employeeNumber",
      ) || parsed.data.idCardNumber;
    const duties = getTouchedSystemProfileValue(
      teacherProfileFields,
      profileValues,
      "duties",
    );

    const teacherDepartmentData = await buildTeacherDepartmentCreateData(
      parsed.data.departmentIds,
      parsed.data.departmentIdentities,
    );

    await prisma.$transaction(async (tx) => {
      const teacher = await tx.teacher.create({
        data: {
          idCardNumber: parsed.data.idCardNumber,
          employeeNumber,
          name: parsed.data.name,
          gender:
            getTouchedSystemProfileValue(teacherProfileFields, profileValues, "gender") ||
            null,
          subjectId: optionalRelationId(parsed.data.subjectId),
          duties: duties ? splitMultiValueText(duties) : [],
          profileData: profileDataToJsonInput(
            mergeProfileData({}, profileValues.values, profileValues.touchedFieldIds),
          ),
          phone:
            getTouchedSystemProfileValue(teacherProfileFields, profileValues, "phone") ||
            null,
          employmentStatus: parsed.data.employmentStatus,
          remarks:
            getTouchedSystemProfileValue(teacherProfileFields, profileValues, "remarks") ||
            null,
          ...teacherDepartmentData,
        },
        select: {
          id: true,
        },
      });

      await ensureTeacherLoginAccount(tx, {
        idCardNumber: parsed.data.idCardNumber,
        teacherId: teacher.id,
        displayName: parsed.data.name,
      });
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error", redirectPath);
  }

  redirectWithNotice("教师档案已新增，并已同步创建登录账号。", "success", redirectPath);
}

export async function updateTeacher(formData: FormData) {
  await requireTeacherDataEditor();
  const redirectPath = getTeacherViewPath();
  const departmentIds = getStringValues(formData, "departmentIds");

  const parsed = teacherMutationSchema.safeParse({
    id: getStringValue(formData, "id"),
    idCardNumber: getStringValue(formData, "idCardNumber"),
    name: getStringValue(formData, "name"),
    departmentIds,
    departmentIdentities: getTeacherDepartmentIdentitiesFromFormData(formData),
    subjectId: getStringValue(formData, "subjectId"),
    employmentStatus: getStringValue(formData, "employmentStatus") || "ACTIVE",
  });

  if (!parsed.success || !parsed.data.id) {
    redirectWithNotice(
      parsed.error?.issues[0]?.message ?? "教师信息不完整。",
      "error",
      redirectPath,
    );
  }

  try {
    const [teacherProfileFields, existingTeacher] = await Promise.all([
      getProfileFieldDefinitions("TEACHER", {
        activeOnly: true,
      }),
      prisma.teacher.findUnique({
        where: {
          id: parsed.data.id,
        },
        select: {
          profileData: true,
          employeeNumber: true,
          gender: true,
          duties: true,
          phone: true,
          remarks: true,
        },
      }),
    ]);

    if (!existingTeacher) {
      throw new Error("未找到要操作的教师档案。");
    }

    const profileValues = collectProfileValuesFromFormData(
      formData,
      teacherProfileFields,
    );
    const employeeNumber =
      getTouchedSystemProfileValue(
        teacherProfileFields,
        profileValues,
        "employeeNumber",
      ) ??
      existingTeacher.employeeNumber ??
      parsed.data.idCardNumber;
    const dutiesValue =
      getTouchedSystemProfileValue(teacherProfileFields, profileValues, "duties") ??
      existingTeacher.duties.join("、");

    await prisma.teacher.update({
      where: {
        id: parsed.data.id,
      },
      data: {
        idCardNumber: parsed.data.idCardNumber,
        employeeNumber: employeeNumber || parsed.data.idCardNumber,
        name: parsed.data.name,
        gender:
          getTouchedSystemProfileValue(teacherProfileFields, profileValues, "gender") ??
          existingTeacher.gender,
        subjectId: optionalRelationId(parsed.data.subjectId),
        duties: splitMultiValueText(dutiesValue),
        profileData: profileDataToJsonInput(
          mergeProfileData(
            existingTeacher.profileData,
            profileValues.values,
            profileValues.touchedFieldIds,
          ),
        ),
        phone:
          getTouchedSystemProfileValue(teacherProfileFields, profileValues, "phone") ??
          existingTeacher.phone,
        employmentStatus: parsed.data.employmentStatus,
        remarks:
          getTouchedSystemProfileValue(teacherProfileFields, profileValues, "remarks") ??
          existingTeacher.remarks,
        ...(await buildTeacherDepartmentUpdateData(
          parsed.data.departmentIds,
          parsed.data.departmentIdentities,
        )),
      },
    });

    await syncTeacherUserRole(prisma, parsed.data.id);
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error", redirectPath);
  }

  redirectWithNotice("教师档案已更新。", "success", redirectPath);
}

export async function setTeacherStatus(formData: FormData) {
  await requireTeacherDataEditor();
  const redirectPath = getTeacherViewPath();

  const parsed = teacherRecordStatusSchema.safeParse({
    id: getStringValue(formData, "id"),
    status: getStringValue(formData, "status"),
  });

  if (!parsed.success) {
    redirectWithNotice("教师状态更新请求无效。", "error", redirectPath);
  }

  try {
    await prisma.teacher.update({
      where: {
        id: parsed.data.id,
      },
      data: {
        employmentStatus: parsed.data.status,
      },
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error", redirectPath);
  }

  redirectWithNotice(
    parsed.data.status === "ACTIVE"
      ? "教师档案已恢复正常。"
      : `教师档案状态已设置为${getTeacherStatusLabel(parsed.data.status)}。`,
    "success",
    redirectPath,
  );
}

export async function deleteTeacher(formData: FormData) {
  const context = await requireTeacherDataEditor();
  const session = context.session;
  const redirectPath = getTeacherViewPath();

  const parsed = peopleRecordDeleteSchema.safeParse({
    id: getStringValue(formData, "id"),
  });

  if (!parsed.success) {
    redirectWithNotice("教师删除请求无效。", "error", redirectPath);
  }

  try {
    const teacher = await prisma.teacher.findUnique({
      where: {
        id: parsed.data.id,
      },
      select: {
        id: true,
        name: true,
        idCardNumber: true,
        employeeNumber: true,
        _count: {
          select: {
            inspections: true,
          },
        },
      },
    });

    if (!teacher) {
      throw new Error("未找到要删除的教师档案。");
    }

    if (teacher._count.inspections > 0) {
      throw new Error("该教师已有检查记录关联，请先停用档案或修正关联检查记录后再删除。");
    }

    await prisma.$transaction(async (tx) => {
      await tx.teacher.delete({
        where: {
          id: teacher.id,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "DELETE_TEACHER",
          targetType: "Teacher",
          targetId: teacher.id,
          summary: `删除误录教师档案：${teacher.name}`,
          metadata: {
            name: teacher.name,
            idCardNumber: teacher.idCardNumber,
            employeeNumber: teacher.employeeNumber,
          },
        },
      });
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error", redirectPath);
  }

  redirectWithNotice("教师档案已删除。", "success", redirectPath);
}

export async function createStudent(formData: FormData) {
  await requireStudentDataEditor();

  const studentViewMode = getStudentViewMode(formData);
  const redirectPath = getStudentViewPath(studentViewMode);
  const parsed = studentMutationSchema.safeParse({
    idCardNumber: getStringValue(formData, "idCardNumber"),
    name: getStringValue(formData, "name"),
    gradeId: getStringValue(formData, "gradeId"),
    classId: getStringValue(formData, "classId"),
    enrollmentStatus: getStringValue(formData, "enrollmentStatus") || "ACTIVE",
  });

  if (!parsed.success) {
    redirectWithNotice(parsed.error.issues[0]?.message ?? "学生信息不完整。", "error", redirectPath);
  }

  try {
    const classId = optionalRelationId(parsed.data.classId);
    const studentProfileFields = await getProfileFieldDefinitions("STUDENT", {
      activeOnly: true,
    });
    const profileValues = collectProfileValuesFromFormData(
      formData,
      studentProfileFields,
    );
    const studentNumber =
      getTouchedSystemProfileValue(
        studentProfileFields,
        profileValues,
        "studentNumber",
      ) || parsed.data.idCardNumber;

    await assertGradeAvailableForStudentView(parsed.data.gradeId, studentViewMode);
    await assertClassMatchesGrade(classId, parsed.data.gradeId);

    await prisma.$transaction(async (tx) => {
      const student = await tx.student.create({
        data: {
          idCardNumber: parsed.data.idCardNumber,
          studentNumber,
          name: parsed.data.name,
          gender:
            getTouchedSystemProfileValue(studentProfileFields, profileValues, "gender") ||
            null,
          gradeId: parsed.data.gradeId,
          classId,
          enrollmentStatus: parsed.data.enrollmentStatus,
          isArchived: studentViewMode === "archived",
          archivedAt: studentViewMode === "archived" ? new Date() : null,
          profileData: profileDataToJsonInput(
            mergeProfileData({}, profileValues.values, profileValues.touchedFieldIds),
          ),
          phone:
            getTouchedSystemProfileValue(studentProfileFields, profileValues, "phone") ||
            null,
          guardianContact:
            getTouchedSystemProfileValue(
              studentProfileFields,
              profileValues,
              "guardianContact",
            ) || null,
          remarks:
            getTouchedSystemProfileValue(studentProfileFields, profileValues, "remarks") ||
            null,
        },
        select: {
          id: true,
        },
      });

      if (studentViewMode === "active") {
        await ensureStudentLoginAccount(tx, {
          idCardNumber: parsed.data.idCardNumber,
          studentId: student.id,
          displayName: parsed.data.name,
        });
      }
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error", redirectPath);
  }

  redirectWithNotice(
    studentViewMode === "active"
      ? "学生档案已新增，并已同步创建登录账号。"
      : "归档学生档案已新增，不创建登录账号。",
    "success",
    redirectPath,
  );
}

export async function updateStudent(formData: FormData) {
  await requireStudentDataEditor();

  const studentViewMode = getStudentViewMode(formData);
  const redirectPath = getStudentViewPath(studentViewMode);
  const parsed = studentMutationSchema.safeParse({
    id: getStringValue(formData, "id"),
    idCardNumber: getStringValue(formData, "idCardNumber"),
    name: getStringValue(formData, "name"),
    gradeId: getStringValue(formData, "gradeId"),
    classId: getStringValue(formData, "classId"),
    enrollmentStatus: getStringValue(formData, "enrollmentStatus") || "ACTIVE",
  });

  if (!parsed.success || !parsed.data.id) {
    redirectWithNotice(parsed.error?.issues[0]?.message ?? "学生信息不完整。", "error", redirectPath);
  }

  try {
    const classId = optionalRelationId(parsed.data.classId);
    const [studentProfileFields, existingStudent] = await Promise.all([
      getProfileFieldDefinitions("STUDENT", {
        activeOnly: true,
      }),
      prisma.student.findUnique({
        where: {
          id: parsed.data.id,
        },
        select: {
          profileData: true,
          studentNumber: true,
          gender: true,
          phone: true,
          guardianContact: true,
          remarks: true,
        },
      }),
    ]);

    if (!existingStudent) {
      throw new Error("未找到要操作的学生档案。");
    }

    const profileValues = collectProfileValuesFromFormData(
      formData,
      studentProfileFields,
    );
    const studentNumber =
      getTouchedSystemProfileValue(
        studentProfileFields,
        profileValues,
        "studentNumber",
      ) ??
      existingStudent.studentNumber ??
      parsed.data.idCardNumber;

    await assertStudentRecordMatchesView(parsed.data.id, studentViewMode);
    await assertGradeAvailableForStudentView(parsed.data.gradeId, studentViewMode);
    await assertClassMatchesGrade(classId, parsed.data.gradeId);

    await prisma.student.update({
      where: {
        id: parsed.data.id,
      },
      data: {
        idCardNumber: parsed.data.idCardNumber,
        studentNumber: studentNumber || parsed.data.idCardNumber,
        name: parsed.data.name,
        gender:
          getTouchedSystemProfileValue(studentProfileFields, profileValues, "gender") ??
          existingStudent.gender,
        gradeId: parsed.data.gradeId,
        classId,
        enrollmentStatus: parsed.data.enrollmentStatus,
        profileData: profileDataToJsonInput(
          mergeProfileData(
            existingStudent.profileData,
            profileValues.values,
            profileValues.touchedFieldIds,
          ),
        ),
        phone:
          getTouchedSystemProfileValue(studentProfileFields, profileValues, "phone") ??
          existingStudent.phone,
        guardianContact:
          getTouchedSystemProfileValue(
            studentProfileFields,
            profileValues,
            "guardianContact",
          ) ?? existingStudent.guardianContact,
        remarks:
          getTouchedSystemProfileValue(studentProfileFields, profileValues, "remarks") ??
          existingStudent.remarks,
      },
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error", redirectPath);
  }

  redirectWithNotice("学生档案已更新。", "success", redirectPath);
}

export async function setStudentStatus(formData: FormData) {
  await requireStudentDataEditor();

  const studentViewMode = getStudentViewMode(formData);
  const redirectPath = getStudentViewPath(studentViewMode);
  const parsed = studentRecordStatusSchema.safeParse({
    id: getStringValue(formData, "id"),
    status: getStringValue(formData, "status"),
  });

  if (!parsed.success) {
    redirectWithNotice("学生状态更新请求无效。", "error", redirectPath);
  }

  try {
    await assertStudentRecordMatchesView(parsed.data.id, studentViewMode);

    await prisma.student.update({
      where: {
        id: parsed.data.id,
      },
      data: {
        enrollmentStatus: parsed.data.status,
      },
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error", redirectPath);
  }

  redirectWithNotice(
    parsed.data.status === "ACTIVE"
      ? "学生档案已恢复正常。"
      : `学生档案状态已设置为${getStudentStatusLabel(parsed.data.status)}。`,
    "success",
    redirectPath,
  );
}

export async function deleteStudent(formData: FormData) {
  const context = await requireStudentDataEditor();
  const session = context.session;

  const studentViewMode = getStudentViewMode(formData);
  const redirectPath = getStudentViewPath(studentViewMode);
  const parsed = peopleRecordDeleteSchema.safeParse({
    id: getStringValue(formData, "id"),
  });

  if (!parsed.success) {
    redirectWithNotice("学生删除请求无效。", "error", redirectPath);
  }

  try {
    await assertStudentRecordMatchesView(parsed.data.id, studentViewMode);

    const student = await prisma.student.findUnique({
      where: {
        id: parsed.data.id,
      },
      select: {
        id: true,
        name: true,
        idCardNumber: true,
        studentNumber: true,
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
      },
    });

    if (!student) {
      throw new Error("未找到要删除的学生档案。");
    }

    await prisma.$transaction(async (tx) => {
      await tx.student.delete({
        where: {
          id: student.id,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "DELETE_STUDENT",
          targetType: "Student",
          targetId: student.id,
          summary: `删除误录学生档案：${student.name}`,
          metadata: {
            name: student.name,
            idCardNumber: student.idCardNumber,
            studentNumber: student.studentNumber,
            gradeName: student.grade.name,
            className: student.class?.name ?? null,
            studentViewMode,
          },
        },
      });
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error", redirectPath);
  }

  redirectWithNotice("学生档案已删除。", "success", redirectPath);
}

export async function importTeachers(formData: FormData) {
  await requireTeacherImportAccess();
  const redirectPath = getTeacherViewPath();

  let message = "";

  try {
    const file = getWorkbookFile(formData, "file");
    const rows = parseFirstWorksheet(await file.arrayBuffer());
    const [refs, teacherProfileFields] = await Promise.all([
      loadPeopleReferenceMaps(),
      getProfileFieldDefinitions("TEACHER", {
        activeOnly: true,
      }),
    ]);
    const stats: ImportStats = {
      created: 0,
      updated: 0,
      accountsCreated: 0,
      skipped: 0,
      errors: [],
    };

    if (rows.length === 0) {
      throw new Error("Excel 中没有可导入的数据。");
    }

    for (const [index, row] of rows.slice(0, 2000).entries()) {
      const rowNumber = index + 2;

      try {
        const departmentIdentityText = getCellText(
          row,
          teacherImportColumnAliases.departmentIdentities,
        );
        const departmentIdentityAssignments = departmentIdentityText
          ? resolveTeacherDepartmentIdentityAssignments(refs, departmentIdentityText)
          : null;
        const departmentNames = splitMultiValueText(
          getCellText(row, teacherImportColumnAliases.departments),
        );
        const departmentIds =
          departmentIdentityAssignments?.departmentIds ??
          resolveDepartmentIdsByNames(refs, departmentNames);
        const departmentIdentities =
          departmentIdentityAssignments?.departmentIdentities ??
          Object.fromEntries(
            departmentIds.map((departmentId) => [
              departmentId,
              [normalizeTeacherDepartmentIdentity("")],
            ]),
          );
        const subjectName = getCellText(row, teacherImportColumnAliases.subject);
        const subjectId = subjectName ? refs.subjectByName.get(subjectName) : null;

        if (subjectName && !subjectId) {
          throw new Error(`找不到学科“${subjectName}”。`);
        }

        const parsed = teacherMutationSchema.safeParse({
          idCardNumber: getCellText(row, teacherImportColumnAliases.idCardNumber),
          name: getCellText(row, teacherImportColumnAliases.name),
          departmentIds,
          departmentIdentities,
          subjectId: subjectId ?? "",
          employmentStatus: normalizeTeacherStatus(
            getCellText(row, teacherImportColumnAliases.employmentStatus),
          ),
        });

        if (!parsed.success) {
          throw new Error(parsed.error.issues[0]?.message ?? "教师信息不完整。");
        }

        const profileValues = collectProfileValuesFromRow(row, teacherProfileFields);
        const existing = await prisma.teacher.findUnique({
          where: {
            idCardNumber: parsed.data.idCardNumber,
          },
          select: {
            id: true,
            profileData: true,
            employeeNumber: true,
            gender: true,
            duties: true,
            phone: true,
            remarks: true,
          },
        });
        const employeeNumber =
          getTouchedSystemProfileValue(
            teacherProfileFields,
            profileValues,
            "employeeNumber",
          ) ??
          existing?.employeeNumber ??
          parsed.data.idCardNumber;
        const dutiesValue =
          getTouchedSystemProfileValue(teacherProfileFields, profileValues, "duties") ??
          existing?.duties.join("、") ??
          "";

        if (existing) {
          await prisma.teacher.update({
            where: {
              id: existing.id,
            },
            data: {
              name: parsed.data.name,
              employeeNumber: employeeNumber || parsed.data.idCardNumber,
              gender:
                getTouchedSystemProfileValue(
                  teacherProfileFields,
                  profileValues,
                  "gender",
                ) ?? existing.gender,
              subjectId,
              duties: splitMultiValueText(dutiesValue),
              profileData: profileDataToJsonInput(
                mergeProfileData(
                  existing.profileData,
                  profileValues.values,
                  profileValues.touchedFieldIds,
                ),
              ),
              phone:
                getTouchedSystemProfileValue(
                  teacherProfileFields,
                  profileValues,
                  "phone",
                ) ?? existing.phone,
              employmentStatus: parsed.data.employmentStatus,
              remarks:
                getTouchedSystemProfileValue(
                  teacherProfileFields,
                  profileValues,
                  "remarks",
                ) ?? existing.remarks,
              ...(await buildTeacherDepartmentUpdateData(
                parsed.data.departmentIds,
                parsed.data.departmentIdentities,
              )),
            },
          });
          stats.updated += 1;
        } else {
          const teacherDepartmentData = await buildTeacherDepartmentCreateData(
            parsed.data.departmentIds,
            parsed.data.departmentIdentities,
          );

          const accountResult = await prisma.$transaction(async (tx) => {
            const teacher = await tx.teacher.create({
              data: {
              idCardNumber: parsed.data.idCardNumber,
              employeeNumber: employeeNumber || parsed.data.idCardNumber,
              name: parsed.data.name,
              gender:
                getTouchedSystemProfileValue(
                  teacherProfileFields,
                  profileValues,
                  "gender",
                ) || null,
              subjectId,
              duties: splitMultiValueText(dutiesValue),
              profileData: profileDataToJsonInput(
                mergeProfileData({}, profileValues.values, profileValues.touchedFieldIds),
              ),
              phone:
                getTouchedSystemProfileValue(
                  teacherProfileFields,
                  profileValues,
                  "phone",
                ) || null,
              employmentStatus: parsed.data.employmentStatus,
              remarks:
                getTouchedSystemProfileValue(
                  teacherProfileFields,
                  profileValues,
                "remarks",
                ) || null,
                ...teacherDepartmentData,
              },
              select: {
                id: true,
              },
            });

            return ensureTeacherLoginAccount(tx, {
              idCardNumber: parsed.data.idCardNumber,
              teacherId: teacher.id,
              displayName: parsed.data.name,
            });
          });
          stats.created += 1;
          if (accountResult.created) {
            stats.accountsCreated += 1;
          }
        }
      } catch (error) {
        stats.skipped += 1;
        stats.errors.push(`第 ${rowNumber} 行：${getMutationErrorMessage(error)}`);
      }
    }

    message = buildImportMessage("教师", stats);
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error", redirectPath);
  }

  redirectWithNotice(message, "success", redirectPath);
}

export async function importStudents(formData: FormData) {
  const studentViewMode = getStudentViewMode(formData);
  const redirectPath = getStudentViewPath(studentViewMode);
  const session =
    studentViewMode === "archived"
      ? await requireAlumniArchiveAccess()
      : await requireStudentImportAccess();
  const gradeScopeId =
    studentViewMode === "active"
      ? getManagedGradeId("session" in session ? session.session : session)
      : null;

  let message = "";

  try {
    const file = getWorkbookFile(formData, "file");
    const rows = parseFirstWorksheet(await file.arrayBuffer());
    const [refs, studentProfileFields] = await Promise.all([
      loadPeopleReferenceMaps(studentViewMode),
      getProfileFieldDefinitions("STUDENT", {
        activeOnly: true,
      }),
    ]);
    const stats: ImportStats = {
      created: 0,
      updated: 0,
      accountsCreated: 0,
      skipped: 0,
      errors: [],
    };

    if (rows.length === 0) {
      throw new Error("Excel 中没有可导入的数据。");
    }

    for (const [index, row] of rows.slice(0, 5000).entries()) {
      const rowNumber = index + 2;

      try {
        const gradeName = getCellText(row, studentImportColumnAliases.grade);
        const className = getCellText(row, studentImportColumnAliases.className);
        const gradeId = resolveGradeId(refs, gradeName, gradeScopeId);
        const classId = resolveClassId(refs, gradeId, className);
        const parsed = studentMutationSchema.safeParse({
          idCardNumber: getCellText(row, studentImportColumnAliases.idCardNumber),
          name: getCellText(row, studentImportColumnAliases.name),
          gradeId,
          classId: classId ?? "",
          enrollmentStatus: normalizeStudentStatus(
            getCellText(row, studentImportColumnAliases.enrollmentStatus),
          ),
        });

        if (!parsed.success) {
          throw new Error(parsed.error.issues[0]?.message ?? "学生信息不完整。");
        }

        const profileValues = collectProfileValuesFromRow(row, studentProfileFields);
        const existing = await prisma.student.findUnique({
          where: {
            idCardNumber: parsed.data.idCardNumber,
          },
          select: {
            id: true,
            isArchived: true,
            archivedAt: true,
            profileData: true,
            studentNumber: true,
            gender: true,
            phone: true,
            guardianContact: true,
            remarks: true,
          },
        });
        const studentNumber =
          getTouchedSystemProfileValue(
            studentProfileFields,
            profileValues,
            "studentNumber",
          ) ??
          existing?.studentNumber ??
          parsed.data.idCardNumber;

        if (existing) {
          if (existing.isArchived !== (studentViewMode === "archived")) {
            throw new Error("请在对应的数据页面里导入这条学生档案。");
          }

          await prisma.student.update({
            where: {
              id: existing.id,
            },
            data: {
              name: parsed.data.name,
              studentNumber: studentNumber || parsed.data.idCardNumber,
              gender:
                getTouchedSystemProfileValue(
                  studentProfileFields,
                  profileValues,
                  "gender",
                ) ?? existing.gender,
              gradeId,
              classId,
              enrollmentStatus: parsed.data.enrollmentStatus,
              archivedAt:
                studentViewMode === "archived"
                  ? existing.archivedAt ?? new Date()
                  : null,
              profileData: profileDataToJsonInput(
                mergeProfileData(
                  existing.profileData,
                  profileValues.values,
                  profileValues.touchedFieldIds,
                ),
              ),
              phone:
                getTouchedSystemProfileValue(
                  studentProfileFields,
                  profileValues,
                  "phone",
                ) ?? existing.phone,
              guardianContact:
                getTouchedSystemProfileValue(
                  studentProfileFields,
                  profileValues,
                  "guardianContact",
                ) ?? existing.guardianContact,
              remarks:
                getTouchedSystemProfileValue(
                  studentProfileFields,
                  profileValues,
                  "remarks",
                ) ?? existing.remarks,
            },
          });
          stats.updated += 1;
        } else {
          const accountResult = await prisma.$transaction(async (tx) => {
            const student = await tx.student.create({
              data: {
                idCardNumber: parsed.data.idCardNumber,
                studentNumber: studentNumber || parsed.data.idCardNumber,
                name: parsed.data.name,
                gender:
                  getTouchedSystemProfileValue(
                    studentProfileFields,
                    profileValues,
                    "gender",
                  ) || null,
                gradeId,
                classId,
                enrollmentStatus: parsed.data.enrollmentStatus,
                isArchived: studentViewMode === "archived",
                archivedAt: studentViewMode === "archived" ? new Date() : null,
                profileData: profileDataToJsonInput(
                  mergeProfileData({}, profileValues.values, profileValues.touchedFieldIds),
                ),
                phone:
                  getTouchedSystemProfileValue(
                    studentProfileFields,
                    profileValues,
                    "phone",
                  ) || null,
                guardianContact:
                  getTouchedSystemProfileValue(
                    studentProfileFields,
                    profileValues,
                    "guardianContact",
                  ) || null,
                remarks:
                  getTouchedSystemProfileValue(
                    studentProfileFields,
                    profileValues,
                    "remarks",
                  ) || null,
              },
              select: {
                id: true,
              },
            });

            if (studentViewMode === "archived") {
              return {
                created: false,
                userId: "",
              };
            }

            return ensureStudentLoginAccount(tx, {
              idCardNumber: parsed.data.idCardNumber,
              studentId: student.id,
              displayName: parsed.data.name,
            });
          });
          stats.created += 1;
          if (accountResult.created) {
            stats.accountsCreated += 1;
          }
        }
      } catch (error) {
        stats.skipped += 1;
        stats.errors.push(`第 ${rowNumber} 行：${getMutationErrorMessage(error)}`);
      }
    }

    message = buildImportMessage(studentViewMode === "archived" ? "往届学生" : "学生", stats);
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error", redirectPath);
  }

  redirectWithNotice(message, "success", redirectPath);
}
