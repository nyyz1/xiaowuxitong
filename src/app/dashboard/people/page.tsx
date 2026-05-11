import {
  canEditStudentData,
  canEditTeacherData,
  canEditPeople,
  canViewAlumniArchive,
  canImportStudentData,
  canImportTeacherData,
  canViewTeacherData,
  getDepartmentLeaderDepartmentIds,
  getManagedGradeId,
  isGradeManagerRole,
  requirePeopleManager,
} from "@/lib/authorization";
import {
  getPeopleManagementData,
  normalizePeopleFilters,
} from "@/modules/people/queries";
import { PeoplePage, type PeopleViewMode } from "@/modules/people/page";

type PeopleManagementPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readMessageValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function PeopleManagementPage({
  searchParams,
}: PeopleManagementPageProps) {
  const session = await requirePeopleManager();

  const params = await searchParams;
  const filters = normalizePeopleFilters(params);
  const currentSession = session.session;
  const positions = session.positions;
  const departmentScopeIds = getDepartmentLeaderDepartmentIds(positions);
  const canCurrentRoleViewTeacherData = canViewTeacherData(
    currentSession.user.role,
    positions,
  );
  const requestedView = readMessageValue(params.view);
  const activeView: PeopleViewMode =
    requestedView === "teachers" && canCurrentRoleViewTeacherData
      ? "teachers"
      : "students";
  const data = await getPeopleManagementData(filters, {
    gradeScopeId: getManagedGradeId(currentSession),
    includeTeacherData: canCurrentRoleViewTeacherData,
    studentViewMode: "active",
    teacherDepartmentScopeIds: departmentScopeIds,
    includeStudentData: departmentScopeIds.length === 0,
  });
  const message = readMessageValue(params.message);
  const toneValue = readMessageValue(params.tone);
  const notice = message
    ? {
        tone: toneValue === "error" ? ("error" as const) : ("success" as const),
        message,
      }
    : null;

  return (
    <PeoplePage
      data={data}
      filters={filters}
      activeView={activeView}
      notice={notice}
      access={{
        canViewTeacherData: canCurrentRoleViewTeacherData,
        canImportTeacherData: canImportTeacherData(currentSession.user.role, positions),
        canImportStudentData:
          departmentScopeIds.length === 0 &&
          canImportStudentData(currentSession.user.role, positions),
        canEditTeacherData: canEditTeacherData(currentSession.user.role, positions),
        canEditStudentData:
          departmentScopeIds.length === 0 &&
          canEditStudentData(currentSession.user.role, positions),
        canEditPeople: canEditPeople(currentSession.user.role, positions),
        canViewAlumniArchive: canViewAlumniArchive(currentSession.user.role),
        isGradeScoped: isGradeManagerRole(currentSession.user.role),
        isDepartmentScoped: departmentScopeIds.length > 0,
      }}
    />
  );
}
