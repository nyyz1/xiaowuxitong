import "server-only";

import {
  ApprovalRequestKind,
  ApprovalResponsibilityKind,
  PrintMaterialType,
  UserRole,
} from "@/generated/prisma/enums";
import type { PrismaClient } from "@/generated/prisma/client";
import type { AuthorizedSession } from "@/lib/authorization";
import { getPrintResponsibilityKind } from "@/modules/approvals/constants";

type TxClient = PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

type ApprovalScope = {
  requestTypeId?: string | null;
  kind: ApprovalRequestKind;
  printMaterialType?: PrintMaterialType | null;
  gradeId?: string | null;
  subjectId?: string | null;
  departmentId?: string | null;
  responsibilityKind?: ApprovalResponsibilityKind | null;
};

export function getRequiredResponsibilityKind(scope: ApprovalScope) {
  if (scope.kind === ApprovalRequestKind.MAINTENANCE) {
    return ApprovalResponsibilityKind.LOGISTICS;
  }

  if (scope.kind === ApprovalRequestKind.PRINT && scope.printMaterialType) {
    return getPrintResponsibilityKind(scope.printMaterialType);
  }

  return scope.responsibilityKind ?? ApprovalResponsibilityKind.OTHER;
}

export async function findMatchingResponsibility(
  db: TxClient,
  scope: ApprovalScope,
) {
  const requiredKind = getRequiredResponsibilityKind(scope);
  const matches = await db.approvalResponsibility.findMany({
    where: {
      isActive: true,
      kind: requiredKind,
      OR: [{ requestTypeId: null }, { requestTypeId: scope.requestTypeId ?? undefined }],
      AND: [
        { OR: [{ gradeId: null }, { gradeId: scope.gradeId ?? undefined }] },
        { OR: [{ subjectId: null }, { subjectId: scope.subjectId ?? undefined }] },
        {
          OR: [
            { departmentId: null },
            { departmentId: scope.departmentId ?? undefined },
          ],
        },
      ],
      approver: {
        isActive: true,
      },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "asc" }],
    include: {
      approver: {
        select: {
          id: true,
          displayName: true,
        },
      },
    },
  });

  return (
    matches
      .map((responsibility) => ({
        responsibility,
        score:
          (responsibility.requestTypeId ? 8 : 0) +
          (responsibility.gradeId ? 4 : 0) +
          (responsibility.subjectId ? 2 : 0) +
          (responsibility.departmentId ? 1 : 0),
      }))
      .sort((left, right) => right.score - left.score)[0]?.responsibility ?? null
  );
}

export async function canSessionApproveRequest(
  db: TxClient,
  session: AuthorizedSession,
  requestId: string,
) {
  if (session.user.role === UserRole.SYSTEM_ADMIN) {
    return true;
  }

  const request = await db.approvalRequest.findUnique({
    where: {
      id: requestId,
    },
    select: {
      typeId: true,
      kind: true,
      printMaterialType: true,
      gradeId: true,
      subjectId: true,
      departmentId: true,
      type: {
        select: {
          responsibilityKind: true,
        },
      },
    },
  });

  if (!request) {
    return false;
  }

  const requiredKind = getRequiredResponsibilityKind({
    requestTypeId: request.typeId,
    kind: request.kind,
    printMaterialType: request.printMaterialType,
    gradeId: request.gradeId,
    subjectId: request.subjectId,
    departmentId: request.departmentId,
    responsibilityKind: request.type.responsibilityKind,
  });

  const count = await db.approvalResponsibility.count({
    where: {
      isActive: true,
      approverId: session.user.id,
      kind: requiredKind,
      OR: [{ requestTypeId: null }, { requestTypeId: request.typeId }],
      AND: [
        { OR: [{ gradeId: null }, { gradeId: request.gradeId ?? undefined }] },
        { OR: [{ subjectId: null }, { subjectId: request.subjectId ?? undefined }] },
        {
          OR: [
            { departmentId: null },
            { departmentId: request.departmentId ?? undefined },
          ],
        },
      ],
    },
  });

  return count > 0;
}
