import "server-only";

import type { Session } from "next-auth";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type ExportAuditInput = {
  session: Session;
  format: "xlsx" | "csv";
  summary: string;
  metadata: Prisma.InputJsonValue;
};

async function resolveActorId(userId: string | undefined) {
  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
    },
  });

  return user?.id ?? null;
}

export async function recordInspectionReportExport({
  session,
  format,
  summary,
  metadata,
}: ExportAuditInput) {
  const actorId = await resolveActorId(session.user?.id);

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "EXPORT_INSPECTION_REPORT",
      targetType: "InspectionRecord",
      targetId: null,
      summary,
      metadata: {
        format,
        ...((metadata as Record<string, unknown>) ?? {}),
      },
    },
  });
}
