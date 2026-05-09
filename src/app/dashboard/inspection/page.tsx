import {
  canConfigureInspection,
  canRecordInspection,
  getManagedGradeId,
  isGradeManagerRole,
  requireInspectionManager,
} from "@/lib/authorization";
import { InspectionPage } from "@/modules/inspection/page";
import {
  getInspectionManagementData,
  getEffectiveInspectionFilters,
  normalizeInspectionFilters,
} from "@/modules/inspection/queries";

type InspectionManagementPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readMessageValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function InspectionManagementPage({
  searchParams,
}: InspectionManagementPageProps) {
  const session = await requireInspectionManager();
  const gradeScopeId = getManagedGradeId(session);

  const params = await searchParams;
  const filters = getEffectiveInspectionFilters(
    normalizeInspectionFilters(params),
    gradeScopeId,
  );
  const data = await getInspectionManagementData(filters, {
    gradeScopeId,
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
    <InspectionPage
      data={data}
      filters={filters}
      notice={notice}
      access={{
        canConfigureInspection: canConfigureInspection(session.user.role),
        canRecordInspection: canRecordInspection(session.user.role),
        isGradeScoped: isGradeManagerRole(session.user.role),
        canAccessTeacherQuantification: !isGradeManagerRole(session.user.role),
      }}
    />
  );
}
