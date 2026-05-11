import "server-only";

import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import {
  AccountType,
  TeacherDepartmentIdentityType,
  UserRole,
} from "@/generated/prisma/enums";
import { getBrowserBoundServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AuthorizedSession = Session & {
  user: NonNullable<Session["user"]> & {
    id: string;
    role: UserRole;
    accountType?: AccountType;
    isSuperAdmin?: boolean;
    managedGradeId?: string | null;
    teacherId?: string | null;
    studentId?: string | null;
  };
};

export type TeacherPositionContext = {
  identityTypes: Set<TeacherDepartmentIdentityType>;
  departmentLeaderDepartmentIds: string[];
  assignedDepartmentIds: string[];
};

export type AuthorizationContext = {
  session: AuthorizedSession;
  positions: TeacherPositionContext;
};

export const schoolStructureAdminRoles = [UserRole.SYSTEM_ADMIN] as const;
export const peopleAccessRoles = [
  UserRole.SYSTEM_ADMIN,
  UserRole.ACADEMIC_AFFAIRS_STAFF,
  UserRole.ADMIN_OFFICE_STAFF,
  UserRole.SCHOOL_LEADER,
  UserRole.DEPARTMENT_LEADER,
  UserRole.GRADE_MANAGER,
  UserRole.STUDENT_AFFAIRS_STAFF,
] as const;
export const inspectionAccessRoles = [
  UserRole.SYSTEM_ADMIN,
  UserRole.SCHOOL_LEADER,
  UserRole.STUDENT_AFFAIRS_STAFF,
  UserRole.ACADEMIC_AFFAIRS_STAFF,
  UserRole.GRADE_MANAGER,
] as const;
export const alumniArchiveRoles = [
  UserRole.SYSTEM_ADMIN,
  UserRole.ACADEMIC_AFFAIRS_STAFF,
  UserRole.ADMIN_OFFICE_STAFF,
  UserRole.SCHOOL_LEADER,
] as const;
export const reportViewerRoles = [
  UserRole.SYSTEM_ADMIN,
  UserRole.ACADEMIC_AFFAIRS_STAFF,
  UserRole.ADMIN_OFFICE_STAFF,
  UserRole.STUDENT_AFFAIRS_STAFF,
  UserRole.SCHOOL_LEADER,
  UserRole.DEPARTMENT_LEADER,
  UserRole.GRADE_MANAGER,
] as const;
export const approvalAccessRoles = [
  UserRole.SYSTEM_ADMIN,
  UserRole.SCHOOL_LEADER,
  UserRole.DEPARTMENT_LEADER,
  UserRole.GRADE_MANAGER,
  UserRole.STUDENT_AFFAIRS_STAFF,
  UserRole.ACADEMIC_AFFAIRS_STAFF,
  UserRole.ADMIN_OFFICE_STAFF,
  UserRole.LOGISTICS_STAFF,
  UserRole.TEACHER,
] as const;

export function isSystemAdminRole(role: UserRole) {
  return role === UserRole.SYSTEM_ADMIN;
}

export function isSchoolLeaderRole(role: UserRole) {
  return role === UserRole.SCHOOL_LEADER;
}

export function isGradeManagerRole(role: UserRole) {
  return role === UserRole.GRADE_MANAGER;
}

export function hasTeacherIdentity(
  positions: TeacherPositionContext | null | undefined,
  identityType: TeacherDepartmentIdentityType,
) {
  return positions?.identityTypes.has(identityType) ?? false;
}

export function getDepartmentLeaderDepartmentIds(
  positions: TeacherPositionContext | null | undefined,
) {
  return positions?.departmentLeaderDepartmentIds ?? [];
}

export function canEditTeacherData(
  role: UserRole,
  positions?: TeacherPositionContext | null,
) {
  return (
    role === UserRole.SYSTEM_ADMIN ||
    role === UserRole.STUDENT_AFFAIRS_STAFF ||
    role === UserRole.ACADEMIC_AFFAIRS_STAFF ||
    role === UserRole.ADMIN_OFFICE_STAFF ||
    hasTeacherIdentity(positions, TeacherDepartmentIdentityType.STUDENT_AFFAIRS_STAFF) ||
    hasTeacherIdentity(positions, TeacherDepartmentIdentityType.ACADEMIC_AFFAIRS_STAFF)
  );
}

export function canEditStudentData(
  role: UserRole,
  positions?: TeacherPositionContext | null,
) {
  return canEditTeacherData(role, positions);
}

export function canEditPeople(
  role: UserRole,
  positions?: TeacherPositionContext | null,
) {
  return canEditTeacherData(role, positions) || canEditStudentData(role, positions);
}

export function canImportTeacherData(
  role: UserRole,
  positions?: TeacherPositionContext | null,
) {
  return (
    role === UserRole.SYSTEM_ADMIN ||
    role === UserRole.STUDENT_AFFAIRS_STAFF ||
    role === UserRole.ACADEMIC_AFFAIRS_STAFF ||
    role === UserRole.ADMIN_OFFICE_STAFF ||
    role === UserRole.SCHOOL_LEADER ||
    hasTeacherIdentity(positions, TeacherDepartmentIdentityType.STUDENT_AFFAIRS_STAFF) ||
    hasTeacherIdentity(positions, TeacherDepartmentIdentityType.ACADEMIC_AFFAIRS_STAFF)
  );
}

export function canImportStudentData(
  role: UserRole,
  positions?: TeacherPositionContext | null,
) {
  return (
    role === UserRole.SYSTEM_ADMIN ||
    role === UserRole.STUDENT_AFFAIRS_STAFF ||
    role === UserRole.ACADEMIC_AFFAIRS_STAFF ||
    role === UserRole.ADMIN_OFFICE_STAFF ||
    role === UserRole.SCHOOL_LEADER ||
    role === UserRole.GRADE_MANAGER ||
    hasTeacherIdentity(positions, TeacherDepartmentIdentityType.STUDENT_AFFAIRS_STAFF) ||
    hasTeacherIdentity(positions, TeacherDepartmentIdentityType.ACADEMIC_AFFAIRS_STAFF)
  );
}

export function canViewTeacherData(
  role: UserRole,
  positions?: TeacherPositionContext | null,
) {
  if (role === UserRole.TEACHER || role === UserRole.LOGISTICS_STAFF) {
    return false;
  }

  if (role === UserRole.DEPARTMENT_LEADER) {
    return getDepartmentLeaderDepartmentIds(positions).length > 0;
  }

  return role !== UserRole.GRADE_MANAGER;
}

export function canConfigureInspection(
  role: UserRole,
  positions?: TeacherPositionContext | null,
) {
  return (
    role === UserRole.SYSTEM_ADMIN ||
    role === UserRole.STUDENT_AFFAIRS_STAFF ||
    role === UserRole.ACADEMIC_AFFAIRS_STAFF ||
    hasTeacherIdentity(positions, TeacherDepartmentIdentityType.STUDENT_AFFAIRS_STAFF) ||
    hasTeacherIdentity(positions, TeacherDepartmentIdentityType.ACADEMIC_AFFAIRS_STAFF)
  );
}

export function canViewAlumniArchive(role: UserRole) {
  return (
    role === UserRole.SYSTEM_ADMIN ||
    role === UserRole.ACADEMIC_AFFAIRS_STAFF ||
    role === UserRole.ADMIN_OFFICE_STAFF ||
    role === UserRole.SCHOOL_LEADER
  );
}

export function canRecordInspection(
  role: UserRole,
  positions?: TeacherPositionContext | null,
) {
  return (
    role === UserRole.SYSTEM_ADMIN ||
    role === UserRole.STUDENT_AFFAIRS_STAFF ||
    role === UserRole.ACADEMIC_AFFAIRS_STAFF ||
    role === UserRole.GRADE_MANAGER ||
    hasTeacherIdentity(positions, TeacherDepartmentIdentityType.STUDENT_AFFAIRS_STAFF) ||
    hasTeacherIdentity(positions, TeacherDepartmentIdentityType.ACADEMIC_AFFAIRS_STAFF)
  );
}

export function canRecordInspectionTarget(
  role: UserRole,
  targetType: "STUDENT" | "TEACHER",
  positions?: TeacherPositionContext | null,
) {
  if (role === UserRole.SYSTEM_ADMIN) {
    return true;
  }

  if (targetType === "STUDENT") {
    return (
      role === UserRole.STUDENT_AFFAIRS_STAFF ||
      role === UserRole.GRADE_MANAGER ||
      hasTeacherIdentity(positions, TeacherDepartmentIdentityType.STUDENT_AFFAIRS_STAFF)
    );
  }

  return (
    role === UserRole.ACADEMIC_AFFAIRS_STAFF ||
    hasTeacherIdentity(positions, TeacherDepartmentIdentityType.ACADEMIC_AFFAIRS_STAFF)
  );
}

export function canConfigureApprovals(role: UserRole) {
  return role === UserRole.SYSTEM_ADMIN;
}

export function canCreateApprovalRequest(sessionOrRole: AuthorizedSession | UserRole) {
  if (typeof sessionOrRole === "string") {
    return sessionOrRole === UserRole.SYSTEM_ADMIN || sessionOrRole === UserRole.TEACHER;
  }

  return (
    sessionOrRole.user.role === UserRole.SYSTEM_ADMIN ||
    Boolean(sessionOrRole.user.teacherId)
  );
}

export async function requireAuthenticatedSession() {
  const { session } = await getBrowserBoundServerSession();

  if (!session) {
    redirect("/login");
  }

  return session as AuthorizedSession;
}

export async function getTeacherPositionContext(
  session: AuthorizedSession,
): Promise<TeacherPositionContext> {
  const teacherId = session.user.teacherId?.trim();

  if (!teacherId) {
    return {
      identityTypes: new Set(),
      departmentLeaderDepartmentIds: [],
      assignedDepartmentIds: [],
    };
  }

  const assignments = await prisma.teacherDepartmentAssignment.findMany({
    where: {
      teacherId,
    },
    select: {
      departmentId: true,
      identityType: true,
      position: {
        select: {
          identityType: true,
        },
      },
    },
  });
  const identityTypes = assignments.map(
    (assignment) => assignment.position?.identityType ?? assignment.identityType,
  );

  return {
    identityTypes: new Set(identityTypes),
    departmentLeaderDepartmentIds: assignments
      .filter(
        (assignment) =>
          (assignment.position?.identityType ?? assignment.identityType) ===
          TeacherDepartmentIdentityType.DEPARTMENT_LEADER,
      )
      .map((assignment) => assignment.departmentId),
    assignedDepartmentIds: assignments.map((assignment) => assignment.departmentId),
  };
}

export async function getAuthorizationContext(
  session: AuthorizedSession,
): Promise<AuthorizationContext> {
  return {
    session,
    positions: await getTeacherPositionContext(session),
  };
}

export async function requireAuthorizationContext(
  allowedRoles: readonly UserRole[],
) {
  const session = await requireRoles(allowedRoles);
  return getAuthorizationContext(session);
}

export async function requireRoles(allowedRoles: readonly UserRole[]) {
  const session = await requireAuthenticatedSession();
  const currentRole = session.user.role ?? UserRole.SYSTEM_ADMIN;

  if (
    session.user.accountType === AccountType.STUDENT &&
    !allowedRoles.includes(UserRole.TEACHER)
  ) {
    redirect("/dashboard/account/password");
  }

  if (
    !session.user.isSuperAdmin &&
    !(allowedRoles as readonly UserRole[]).includes(currentRole)
  ) {
    redirect("/dashboard?forbidden=1");
  }

  return session;
}

export function getManagedGradeId(session: AuthorizedSession) {
  if (!isGradeManagerRole(session.user.role)) {
    return null;
  }

  const managedGradeId = session.user.managedGradeId?.trim();

  if (!managedGradeId) {
    redirect("/dashboard?forbidden=1");
  }

  return managedGradeId;
}

export async function requireSystemAdmin() {
  return requireRoles(schoolStructureAdminRoles);
}

export async function requirePeopleManager() {
  const session = await requireAuthenticatedSession();
  const context = await getAuthorizationContext(session);
  const currentRole = context.session.user.role ?? UserRole.SYSTEM_ADMIN;
  const hasPositionAccess =
    hasTeacherIdentity(
      context.positions,
      TeacherDepartmentIdentityType.STUDENT_AFFAIRS_STAFF,
    ) ||
    hasTeacherIdentity(
      context.positions,
      TeacherDepartmentIdentityType.ACADEMIC_AFFAIRS_STAFF,
    ) ||
    hasTeacherIdentity(context.positions, TeacherDepartmentIdentityType.DEPARTMENT_LEADER);

  if (!(peopleAccessRoles as readonly UserRole[]).includes(currentRole) && !hasPositionAccess) {
    redirect("/dashboard?forbidden=1");
  }

  if (
    currentRole === UserRole.DEPARTMENT_LEADER &&
    !hasTeacherIdentity(context.positions, TeacherDepartmentIdentityType.DEPARTMENT_LEADER)
  ) {
    redirect("/dashboard?forbidden=1");
  }

  return context;
}

export async function requirePeopleEditor() {
  const context = await requirePeopleManager();

  if (!canEditPeople(context.session.user.role, context.positions)) {
    redirect("/dashboard?forbidden=1");
  }

  return context;
}

export async function requireTeacherDataEditor() {
  const context = await requirePeopleManager();

  if (!canEditTeacherData(context.session.user.role, context.positions)) {
    redirect("/dashboard?forbidden=1");
  }

  return context;
}

export async function requireStudentDataEditor() {
  const context = await requirePeopleManager();

  if (!canEditStudentData(context.session.user.role, context.positions)) {
    redirect("/dashboard?forbidden=1");
  }

  return context;
}

export async function requireTeacherImportAccess() {
  const context = await requirePeopleManager();

  if (!canImportTeacherData(context.session.user.role, context.positions)) {
    redirect("/dashboard?forbidden=1");
  }

  return context;
}

export async function requireStudentImportAccess() {
  const context = await requirePeopleManager();

  if (!canImportStudentData(context.session.user.role, context.positions)) {
    redirect("/dashboard?forbidden=1");
  }

  return context;
}

export async function requireInspectionManager() {
  const session = await requireAuthenticatedSession();
  const positions = await getTeacherPositionContext(session);
  const currentRole = session.user.role ?? UserRole.SYSTEM_ADMIN;
  const hasPositionAccess =
    hasTeacherIdentity(
      positions,
      TeacherDepartmentIdentityType.STUDENT_AFFAIRS_STAFF,
    ) ||
    hasTeacherIdentity(
      positions,
      TeacherDepartmentIdentityType.ACADEMIC_AFFAIRS_STAFF,
    );

  if (!(inspectionAccessRoles as readonly UserRole[]).includes(currentRole) && !hasPositionAccess) {
    redirect("/dashboard?forbidden=1");
  }

  return session;
}

export async function requireInspectionConfigurator() {
  const session = await requireInspectionManager();
  const positions = await getTeacherPositionContext(session);

  if (!canConfigureInspection(session.user.role, positions)) {
    redirect("/dashboard?forbidden=1");
  }

  return session;
}

export async function requireInspectionRecorder() {
  const session = await requireInspectionManager();
  const positions = await getTeacherPositionContext(session);

  if (!canRecordInspection(session.user.role, positions)) {
    redirect("/dashboard?forbidden=1");
  }

  return session;
}

export async function requireAlumniArchiveAccess() {
  return requireRoles(alumniArchiveRoles);
}

export async function requireReportViewer() {
  return requireRoles(reportViewerRoles);
}

export async function requireApprovalAccess() {
  const session = await requireRoles(approvalAccessRoles);

  if (session.user.accountType === AccountType.STUDENT) {
    redirect("/dashboard/account/password");
  }

  return session;
}

export async function requireApprovalConfigurator() {
  const session = await requireApprovalAccess();

  if (!canConfigureApprovals(session.user.role)) {
    redirect("/dashboard?forbidden=1");
  }

  return session;
}
