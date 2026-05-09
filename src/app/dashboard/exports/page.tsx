import {
  getManagedGradeId,
  isGradeManagerRole,
  requireReportViewer,
} from "@/lib/authorization";
import { ExportsPage } from "@/modules/reporting/page";
import {
  getEffectiveReportFilters,
  getInspectionReportData,
  normalizeReportFilters,
} from "@/modules/reporting/queries";

type ExportCenterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ExportCenterPage({
  searchParams,
}: ExportCenterPageProps) {
  const session = await requireReportViewer();
  const gradeScopeId = getManagedGradeId(session);

  const params = await searchParams;
  const filters = getEffectiveReportFilters(
    normalizeReportFilters(params),
    gradeScopeId,
  );
  const data = await getInspectionReportData(filters, {
    gradeScopeId,
  });

  return (
    <ExportsPage
      data={data}
      filters={filters}
      access={{
        isGradeScoped: isGradeManagerRole(session.user.role),
        canAccessTeacherQuantification: !isGradeManagerRole(session.user.role),
      }}
    />
  );
}
