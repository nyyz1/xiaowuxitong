import "server-only";

import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { UserRole } from "@/generated/prisma/enums";
import { getBrowserBoundServerSession } from "@/lib/auth";

export type AuthorizedSession = Session & {
  user: NonNullable<Session["user"]> & {
    id: string;
    role: UserRole;
    managedGradeId?: string | null;
  };
};

export const schoolStructureAdminRoles = [UserRole.SYSTEM_ADMIN] as const;
export const peopleAccessRoles = [
  UserRole.SYSTEM_ADMIN,
  UserRole.DATA_MANAGER,
  UserRole.SCHOOL_LEADER,
  UserRole.GRADE_MANAGER,
] as const;
export const inspectionAccessRoles = [
  UserRole.SYSTEM_ADMIN,
  UserRole.SCHOOL_LEADER,
  UserRole.INSPECTION_STAFF,
  UserRole.GRADE_MANAGER,
] as const;
export const alumniArchiveRoles = [
  UserRole.SYSTEM_ADMIN,
  UserRole.DATA_MANAGER,
  UserRole.SCHOOL_LEADER,
] as const;
export const reportViewerRoles = [
  UserRole.SYSTEM_ADMIN,
  UserRole.DATA_MANAGER,
  UserRole.INSPECTION_STAFF,
  UserRole.SCHOOL_LEADER,
  UserRole.GRADE_MANAGER,
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

export function canEditPeople(role: UserRole) {
  return role === UserRole.SYSTEM_ADMIN || role === UserRole.DATA_MANAGER;
}

export function canImportTeacherData(role: UserRole) {
  return (
    role === UserRole.SYSTEM_ADMIN ||
    role === UserRole.DATA_MANAGER ||
    role === UserRole.SCHOOL_LEADER
  );
}

export function canImportStudentData(role: UserRole) {
  return (
    role === UserRole.SYSTEM_ADMIN ||
    role === UserRole.DATA_MANAGER ||
    role === UserRole.SCHOOL_LEADER ||
    role === UserRole.GRADE_MANAGER
  );
}

export function canViewTeacherData(role: UserRole) {
  return role !== UserRole.GRADE_MANAGER;
}

export function canConfigureInspection(role: UserRole) {
  return role === UserRole.SYSTEM_ADMIN || role === UserRole.INSPECTION_STAFF;
}

export function canViewAlumniArchive(role: UserRole) {
  return (
    role === UserRole.SYSTEM_ADMIN ||
    role === UserRole.DATA_MANAGER ||
    role === UserRole.SCHOOL_LEADER
  );
}

export function canRecordInspection(role: UserRole) {
  return (
    role === UserRole.SYSTEM_ADMIN ||
    role === UserRole.INSPECTION_STAFF ||
    role === UserRole.GRADE_MANAGER
  );
}

export async function requireAuthenticatedSession() {
  const { session } = await getBrowserBoundServerSession();

  if (!session) {
    redirect("/login");
  }

  return session as AuthorizedSession;
}

export async function requireRoles(allowedRoles: readonly UserRole[]) {
  const session = await requireAuthenticatedSession();
  const currentRole = session.user.role ?? UserRole.SYSTEM_ADMIN;

  if (!allowedRoles.includes(currentRole)) {
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
  return requireRoles(peopleAccessRoles);
}

export async function requirePeopleEditor() {
  const session = await requirePeopleManager();

  if (!canEditPeople(session.user.role)) {
    redirect("/dashboard?forbidden=1");
  }

  return session;
}

export async function requireTeacherImportAccess() {
  const session = await requirePeopleManager();

  if (!canImportTeacherData(session.user.role)) {
    redirect("/dashboard?forbidden=1");
  }

  return session;
}

export async function requireStudentImportAccess() {
  const session = await requirePeopleManager();

  if (!canImportStudentData(session.user.role)) {
    redirect("/dashboard?forbidden=1");
  }

  return session;
}

export async function requireInspectionManager() {
  return requireRoles(inspectionAccessRoles);
}

export async function requireInspectionConfigurator() {
  const session = await requireInspectionManager();

  if (!canConfigureInspection(session.user.role)) {
    redirect("/dashboard?forbidden=1");
  }

  return session;
}

export async function requireInspectionRecorder() {
  const session = await requireInspectionManager();

  if (!canRecordInspection(session.user.role)) {
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
