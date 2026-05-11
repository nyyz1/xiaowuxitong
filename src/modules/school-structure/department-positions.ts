import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { TeacherDepartmentIdentityType } from "@/generated/prisma/enums";

export const departmentPositionPermissionTags = [
  "PEOPLE_STUDENT_AFFAIRS",
  "PEOPLE_ACADEMIC_AFFAIRS",
  "DEPARTMENT_LEADER",
  "GRADE_MANAGER",
  "LOGISTICS",
  "GRADE_SUBJECT_LEADER",
] as const;

export type DepartmentPositionPermissionTag =
  (typeof departmentPositionPermissionTags)[number];

type DepartmentPositionTx = Prisma.TransactionClient;

type DefaultPositionSeed = {
  name: string;
  identityType: TeacherDepartmentIdentityType;
  permissionTags: DepartmentPositionPermissionTag[];
};

export function getPermissionTagsForIdentityType(
  identityType: TeacherDepartmentIdentityType,
): DepartmentPositionPermissionTag[] {
  if (identityType === TeacherDepartmentIdentityType.STUDENT_AFFAIRS_STAFF) {
    return ["PEOPLE_STUDENT_AFFAIRS"];
  }

  if (identityType === TeacherDepartmentIdentityType.ACADEMIC_AFFAIRS_STAFF) {
    return ["PEOPLE_ACADEMIC_AFFAIRS"];
  }

  if (identityType === TeacherDepartmentIdentityType.DEPARTMENT_LEADER) {
    return ["DEPARTMENT_LEADER"];
  }

  if (identityType === TeacherDepartmentIdentityType.GRADE_MANAGER) {
    return ["GRADE_MANAGER"];
  }

  if (identityType === TeacherDepartmentIdentityType.LOGISTICS_STAFF) {
    return ["LOGISTICS"];
  }

  if (identityType === TeacherDepartmentIdentityType.GRADE_SUBJECT_LEADER) {
    return ["GRADE_SUBJECT_LEADER"];
  }

  return [];
}

function isGradeDepartmentName(name: string) {
  return /^\d{4}级年级/u.test(name.trim());
}

function isSchoolLeaderDepartmentName(name: string) {
  return name.trim() === "校领导";
}

export function getDefaultDepartmentPositions(
  departmentName: string,
): DefaultPositionSeed[] {
  if (isGradeDepartmentName(departmentName)) {
    return [
      {
        name: "一线教师",
        identityType: TeacherDepartmentIdentityType.FRONTLINE_TEACHER,
        permissionTags: [],
      },
      {
        name: "学科组长",
        identityType: TeacherDepartmentIdentityType.GRADE_SUBJECT_LEADER,
        permissionTags: getPermissionTagsForIdentityType(
          TeacherDepartmentIdentityType.GRADE_SUBJECT_LEADER,
        ),
      },
      {
        name: "年级管理",
        identityType: TeacherDepartmentIdentityType.GRADE_MANAGER,
        permissionTags: getPermissionTagsForIdentityType(
          TeacherDepartmentIdentityType.GRADE_MANAGER,
        ),
      },
    ];
  }

  if (isSchoolLeaderDepartmentName(departmentName)) {
    return [
      {
        name: "校长",
        identityType: TeacherDepartmentIdentityType.DEPARTMENT_LEADER,
        permissionTags: getPermissionTagsForIdentityType(
          TeacherDepartmentIdentityType.DEPARTMENT_LEADER,
        ),
      },
      {
        name: "副校长",
        identityType: TeacherDepartmentIdentityType.DEPARTMENT_LEADER,
        permissionTags: getPermissionTagsForIdentityType(
          TeacherDepartmentIdentityType.DEPARTMENT_LEADER,
        ),
      },
      {
        name: "书记",
        identityType: TeacherDepartmentIdentityType.DEPARTMENT_LEADER,
        permissionTags: getPermissionTagsForIdentityType(
          TeacherDepartmentIdentityType.DEPARTMENT_LEADER,
        ),
      },
    ];
  }

  return [
    {
      name: "部门管理",
      identityType: TeacherDepartmentIdentityType.DEPARTMENT_LEADER,
      permissionTags: getPermissionTagsForIdentityType(
        TeacherDepartmentIdentityType.DEPARTMENT_LEADER,
      ),
    },
    {
      name: "工作人员",
      identityType: TeacherDepartmentIdentityType.FRONTLINE_TEACHER,
      permissionTags: [],
    },
  ];
}

export async function ensureDefaultDepartmentPositions(
  tx: DepartmentPositionTx,
  department: {
    id: string;
    name: string;
  },
) {
  const defaults = getDefaultDepartmentPositions(department.name);

  for (const [index, position] of defaults.entries()) {
    await tx.departmentPosition.upsert({
      where: {
        departmentId_name: {
          departmentId: department.id,
          name: position.name,
        },
      },
      update: {
        identityType: position.identityType,
        permissionTags: position.permissionTags,
        sortOrder: index,
        isActive: true,
      },
      create: {
        departmentId: department.id,
        name: position.name,
        identityType: position.identityType,
        permissionTags: position.permissionTags,
        sortOrder: index,
      },
    });
  }
}

export async function ensureDefaultPositionsForAllDepartments(
  tx: DepartmentPositionTx,
) {
  const departments = await tx.department.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  for (const department of departments) {
    await ensureDefaultDepartmentPositions(tx, department);
  }
}

export async function findPositionForDepartmentIdentity(
  tx: DepartmentPositionTx,
  input: {
    departmentId: string;
    identityType: TeacherDepartmentIdentityType;
  },
) {
  return tx.departmentPosition.findFirst({
    where: {
      departmentId: input.departmentId,
      identityType: input.identityType,
      isActive: true,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      identityType: true,
    },
  });
}
