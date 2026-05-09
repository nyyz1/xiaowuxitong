import {
  canEditPeople,
  canViewAlumniArchive,
  canImportStudentData,
  canImportTeacherData,
  canViewTeacherData,
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
  const canCurrentRoleViewTeacherData = canViewTeacherData(session.user.role);
  const requestedView = readMessageValue(params.view);
  const activeView: PeopleViewMode =
    requestedView === "teachers" && canCurrentRoleViewTeacherData
      ? "teachers"
      : "students";
  const data = await getPeopleManagementData(filters, {
    gradeScopeId: getManagedGradeId(session),
    includeTeacherData: canCurrentRoleViewTeacherData,
    studentViewMode: "active",
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
        canImportTeacherData: canImportTeacherData(session.user.role),
        canImportStudentData: canImportStudentData(session.user.role),
        canEditPeople: canEditPeople(session.user.role),
        canViewAlumniArchive: canViewAlumniArchive(session.user.role),
        isGradeScoped: isGradeManagerRole(session.user.role),
      }}
    />
  );
}
