import {
  canEditPeople,
  canImportStudentData,
  requireAlumniArchiveAccess,
} from "@/lib/authorization";
import { AlumniArchivePage } from "@/modules/alumni-archive/page";
import {
  getPeopleManagementData,
  normalizePeopleFilters,
} from "@/modules/people/queries";

type AlumniArchiveRouteProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readMessageValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function AlumniArchiveRoute({
  searchParams,
}: AlumniArchiveRouteProps) {
  const session = await requireAlumniArchiveAccess();
  const params = await searchParams;
  const filters = normalizePeopleFilters(params);
  const data = await getPeopleManagementData(filters, {
    includeTeacherData: false,
    studentViewMode: "archived",
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
    <AlumniArchivePage
      data={data}
      filters={filters}
      notice={notice}
      access={{
        canImportStudentData: canImportStudentData(session.user.role),
        canEditPeople: canEditPeople(session.user.role),
      }}
    />
  );
}
