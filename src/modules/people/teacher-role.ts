import type { PrismaClient } from "@/generated/prisma/client";
import { TeacherDepartmentIdentityType, UserRole } from "@/generated/prisma/enums";

export type TeacherRoleSource = {
  isSuperAdmin?: boolean;
  departmentAssignments?: Array<{
    departmentId?: string;
    identityType?: TeacherDepartmentIdentityType | null;
    position?: {
      isActive?: boolean;
      identityType?: TeacherDepartmentIdentityType | null;
    } | null;
  }>;
};

type TeacherRoleSyncClient = Pick<
  PrismaClient,
  "teacher" | "user" | "teacherDepartmentAssignment"
>;

const teacherRolePriority: UserRole[] = [
  UserRole.SYSTEM_ADMIN,
  UserRole.SCHOOL_LEADER,
  UserRole.DEPARTMENT_LEADER,
  UserRole.GRADE_MANAGER,
  UserRole.STUDENT_AFFAIRS_STAFF,
  UserRole.ACADEMIC_AFFAIRS_STAFF,
  UserRole.LOGISTICS_STAFF,
  UserRole.TEACHER,
];

function identityTypeToRole(identityType: TeacherDepartmentIdentityType): UserRole {
  if (identityType === TeacherDepartmentIdentityType.DEPARTMENT_LEADER) {
    return UserRole.DEPARTMENT_LEADER;
  }

  if (identityType === TeacherDepartmentIdentityType.GRADE_MANAGER) {
    return UserRole.GRADE_MANAGER;
  }

  if (identityType === TeacherDepartmentIdentityType.STUDENT_AFFAIRS_STAFF) {
    return UserRole.STUDENT_AFFAIRS_STAFF;
  }

  if (identityType === TeacherDepartmentIdentityType.ACADEMIC_AFFAIRS_STAFF) {
    return UserRole.ACADEMIC_AFFAIRS_STAFF;
  }

  if (identityType === TeacherDepartmentIdentityType.LOGISTICS_STAFF) {
    return UserRole.LOGISTICS_STAFF;
  }

  return UserRole.TEACHER;
}

function getActiveAssignmentIdentityType(
  assignment: NonNullable<TeacherRoleSource["departmentAssignments"]>[number],
) {
  if (assignment.position && assignment.position.isActive === false) {
    return null;
  }

  return (
    assignment.position?.identityType ??
    assignment.identityType ??
    TeacherDepartmentIdentityType.FRONTLINE_TEACHER
  );
}

export function deriveTeacherCompatibilityRole(source: TeacherRoleSource) {
  if (source.isSuperAdmin) {
    return UserRole.SYSTEM_ADMIN;
  }

  const derivedRoles = new Set<UserRole>();

  for (const assignment of source.departmentAssignments ?? []) {
    const identityType = getActiveAssignmentIdentityType(assignment);

    if (!identityType) {
      continue;
    }

    derivedRoles.add(identityTypeToRole(identityType));
  }

  for (const role of teacherRolePriority) {
    if (derivedRoles.has(role)) {
      return role;
    }
  }

  return UserRole.TEACHER;
}

export function deriveTeacherPermissionRoles(source: TeacherRoleSource) {
  const roles = new Set<UserRole>();

  if (source.isSuperAdmin) {
    roles.add(UserRole.SYSTEM_ADMIN);
  }

  for (const assignment of source.departmentAssignments ?? []) {
    const identityType = getActiveAssignmentIdentityType(assignment);

    if (!identityType) {
      continue;
    }

    roles.add(identityTypeToRole(identityType));
  }

  if (roles.size === 0) {
    roles.add(UserRole.TEACHER);
  }

  return Array.from(roles);
}

export async function getTeacherRoleSource(
  tx: TeacherRoleSyncClient,
  teacherId: string,
) {
  return tx.teacher.findUnique({
    where: {
      id: teacherId,
    },
    select: {
      id: true,
      departmentAssignments: {
        select: {
          departmentId: true,
          identityType: true,
          position: {
            select: {
              isActive: true,
              identityType: true,
            },
          },
        },
      },
    },
  });
}

export async function syncTeacherUserRole(
  tx: TeacherRoleSyncClient,
  teacherId: string,
) {
  const teacher = await getTeacherRoleSource(tx, teacherId);

  if (!teacher) {
    await tx.user.updateMany({
      where: {
        teacherId,
      },
      data: {
        role: UserRole.TEACHER,
      },
    });

    return UserRole.TEACHER;
  }

  const role = deriveTeacherCompatibilityRole(teacher);

  await tx.user.updateMany({
    where: {
      teacherId,
      isSuperAdmin: false,
    },
    data: {
      role,
    },
  });

  return role;
}

export async function syncTeacherUserRolesForPosition(
  tx: TeacherRoleSyncClient,
  positionId: string,
) {
  const assignments = await tx.teacherDepartmentAssignment.findMany({
    where: {
      positionId,
    },
    select: {
      teacherId: true,
    },
  });

  const teacherIds = Array.from(new Set(assignments.map((assignment) => assignment.teacherId)));

  for (const teacherId of teacherIds) {
    await syncTeacherUserRole(tx, teacherId);
  }
}
