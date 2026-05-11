import {
  canConfigureInspection,
  canRecordInspection,
  canRecordInspectionTarget,
  getTeacherPositionContext,
  getManagedGradeId,
  isGradeManagerRole,
  requireInspectionManager,
} from "@/lib/authorization";
import { UserRole } from "@/generated/prisma/enums";
import type { InspectionTargetTypeValue } from "@/lib/validation/inspection";
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

function canAccessInspectionTarget(
  role: UserRole,
  targetType: InspectionTargetTypeValue,
  positions: Awaited<ReturnType<typeof getTeacherPositionContext>>,
) {
  if (role === UserRole.SYSTEM_ADMIN || role === UserRole.SCHOOL_LEADER) {
    return true;
  }

  return canRecordInspectionTarget(role, targetType, positions);
}

function defaultInspectionTargetForRole(role: UserRole): InspectionTargetTypeValue {
  return role === UserRole.ACADEMIC_AFFAIRS_STAFF ? "TEACHER" : "STUDENT";
}

export default async function InspectionManagementPage({
  searchParams,
}: InspectionManagementPageProps) {
  const session = await requireInspectionManager();
  const positions = await getTeacherPositionContext(session);
  const gradeScopeId = getManagedGradeId(session);

  const params = await searchParams;
  const parsedFilters = getEffectiveInspectionFilters(
    normalizeInspectionFilters(params),
    gradeScopeId,
  );
  const filters = canAccessInspectionTarget(
    session.user.role,
    parsedFilters.targetType,
    positions,
  )
    ? parsedFilters
    : {
        ...parsedFilters,
        targetType: defaultInspectionTargetForRole(session.user.role),
        gradeId:
          defaultInspectionTargetForRole(session.user.role) === "STUDENT"
            ? parsedFilters.gradeId
            : "",
        classId:
          defaultInspectionTargetForRole(session.user.role) === "STUDENT"
            ? parsedFilters.classId
            : "",
        teacherId:
          defaultInspectionTargetForRole(session.user.role) === "TEACHER"
            ? parsedFilters.teacherId
            : "",
      };
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
        canConfigureInspection: canConfigureInspection(session.user.role, positions),
        canRecordInspection:
          canRecordInspection(session.user.role, positions) &&
          canRecordInspectionTarget(session.user.role, filters.targetType, positions),
        isGradeScoped: isGradeManagerRole(session.user.role),
        canAccessTeacherQuantification: canAccessInspectionTarget(
          session.user.role,
          "TEACHER",
          positions,
        ),
      }}
    />
  );
}
