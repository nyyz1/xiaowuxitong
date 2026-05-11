"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { ApprovalRequestKind, ApprovalStatus } from "@/generated/prisma/enums";
import {
  canCreateApprovalRequest,
  getTeacherPositionContext,
  requireApprovalAccess,
  requireApprovalConfigurator,
} from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import {
  approvalDecisionSchema,
  approvalRequestSchema,
  approvalTypeSchema,
  responsibilitySchema,
} from "@/lib/validation/approvals";
import { getPrintResponsibilityKind } from "@/modules/approvals/constants";
import {
  canSessionApproveRequest,
  findMatchingResponsibility,
} from "@/modules/approvals/routing";

type NoticeTone = "success" | "error";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getBooleanValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

function redirectWithNotice(message: string, tone: NoticeTone = "success"): never {
  const params = new URLSearchParams({ message, tone });
  redirect(`/dashboard/approvals?${params.toString()}`);
}

function actorId(id: string) {
  return id === "bootstrap-admin" ? null : id;
}

function mutationErrorMessage(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "名称或配置已经存在，请调整后再试。";
    }

    if (error.code === "P2025") {
      return "要操作的数据不存在，页面可能已经过期。";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "操作未完成，请稍后重试。";
}

export async function createOrUpdateApprovalType(formData: FormData) {
  const session = await requireApprovalConfigurator();
  const parsed = approvalTypeSchema.safeParse({
    id: getStringValue(formData, "id"),
    name: getStringValue(formData, "name"),
    kind: getStringValue(formData, "kind"),
    responsibilityKind: getStringValue(formData, "responsibilityKind") || null,
    description: getStringValue(formData, "description"),
    isActive: getBooleanValue(formData, "isActive"),
  });

  if (!parsed.success) {
    redirectWithNotice(parsed.error.issues[0]?.message ?? "申请类型信息不完整。", "error");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const type = parsed.data.id
        ? await tx.approvalType.update({
            where: { id: parsed.data.id },
            data: {
              name: parsed.data.name,
              kind: parsed.data.kind,
              responsibilityKind: parsed.data.responsibilityKind,
              description: parsed.data.description || null,
              isActive: parsed.data.isActive,
            },
          })
        : await tx.approvalType.create({
            data: {
              name: parsed.data.name,
              kind: parsed.data.kind,
              responsibilityKind: parsed.data.responsibilityKind,
              description: parsed.data.description || null,
              isActive: parsed.data.isActive,
            },
          });

      await tx.auditLog.create({
        data: {
          actorId: actorId(session.user.id),
          action: parsed.data.id ? "UPDATE_APPROVAL_TYPE" : "CREATE_APPROVAL_TYPE",
          targetType: "ApprovalType",
          targetId: type.id,
          summary: `${parsed.data.id ? "更新" : "新增"}申请类型：${type.name}`,
          metadata: {
            kind: type.kind,
            responsibilityKind: type.responsibilityKind,
            isActive: type.isActive,
          },
        },
      });
    });
  } catch (error) {
    redirectWithNotice(mutationErrorMessage(error), "error");
  }

  redirectWithNotice("申请类型已保存。");
}

export async function createOrUpdateResponsibility(formData: FormData) {
  const session = await requireApprovalConfigurator();
  const parsed = responsibilitySchema.safeParse({
    id: getStringValue(formData, "id"),
    name: getStringValue(formData, "name"),
    kind: getStringValue(formData, "kind"),
    approverId: getStringValue(formData, "approverId"),
    requestTypeId: getStringValue(formData, "requestTypeId"),
    gradeId: getStringValue(formData, "gradeId"),
    subjectId: getStringValue(formData, "subjectId"),
    departmentId: getStringValue(formData, "departmentId"),
    isActive: getBooleanValue(formData, "isActive"),
  });

  if (!parsed.success) {
    redirectWithNotice(parsed.error.issues[0]?.message ?? "审批职责信息不完整。", "error");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const responsibility = parsed.data.id
        ? await tx.approvalResponsibility.update({
            where: { id: parsed.data.id },
            data: {
              name: parsed.data.name,
              kind: parsed.data.kind,
              approverId: parsed.data.approverId,
              requestTypeId: parsed.data.requestTypeId || null,
              gradeId: parsed.data.gradeId || null,
              subjectId: parsed.data.subjectId || null,
              departmentId: parsed.data.departmentId || null,
              isActive: parsed.data.isActive,
            },
          })
        : await tx.approvalResponsibility.create({
            data: {
              name: parsed.data.name,
              kind: parsed.data.kind,
              approverId: parsed.data.approverId,
              requestTypeId: parsed.data.requestTypeId || null,
              gradeId: parsed.data.gradeId || null,
              subjectId: parsed.data.subjectId || null,
              departmentId: parsed.data.departmentId || null,
              isActive: parsed.data.isActive,
            },
          });

      await tx.auditLog.create({
        data: {
          actorId: actorId(session.user.id),
          action: parsed.data.id
            ? "UPDATE_APPROVAL_RESPONSIBILITY"
            : "CREATE_APPROVAL_RESPONSIBILITY",
          targetType: "ApprovalResponsibility",
          targetId: responsibility.id,
          summary: `${parsed.data.id ? "更新" : "新增"}审批职责：${responsibility.name}`,
          metadata: {
            kind: responsibility.kind,
            approverId: responsibility.approverId,
            requestTypeId: responsibility.requestTypeId,
            gradeId: responsibility.gradeId,
            subjectId: responsibility.subjectId,
            departmentId: responsibility.departmentId,
          },
        },
      });
    });
  } catch (error) {
    redirectWithNotice(mutationErrorMessage(error), "error");
  }

  redirectWithNotice("审批职责已保存。");
}

export async function submitApprovalRequest(formData: FormData) {
  const session = await requireApprovalAccess();
  const positions = await getTeacherPositionContext(session);

  if (!canCreateApprovalRequest(session)) {
    redirectWithNotice("当前账号不能发起申请。", "error");
  }

  const parsed = approvalRequestSchema.safeParse({
    typeId: getStringValue(formData, "typeId"),
    title: getStringValue(formData, "title"),
    content: getStringValue(formData, "content"),
    gradeId: getStringValue(formData, "gradeId"),
    subjectId: getStringValue(formData, "subjectId"),
    departmentId: getStringValue(formData, "departmentId"),
    printMaterialType: getStringValue(formData, "printMaterialType") || undefined,
    printMode: getStringValue(formData, "printMode") || undefined,
    paperSize: getStringValue(formData, "paperSize") || undefined,
    printQuantity: getStringValue(formData, "printQuantity") || undefined,
  });

  if (!parsed.success) {
    redirectWithNotice(parsed.error.issues[0]?.message ?? "申请内容不完整。", "error");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const type = await tx.approvalType.findUnique({
        where: { id: parsed.data.typeId },
      });

      if (!type?.isActive) {
        throw new Error("申请类型不存在或已停用。");
      }

      if (type.kind === ApprovalRequestKind.PRINT) {
        if (
          !parsed.data.printMaterialType ||
          !parsed.data.printMode ||
          !parsed.data.paperSize ||
          !parsed.data.printQuantity
        ) {
          throw new Error("打印申请必须填写材料类型、打印形式、纸张大小和打印数量。");
        }

        if (
          parsed.data.printMaterialType === "SCHOOL_ADMIN" &&
          !parsed.data.departmentId
        ) {
          throw new Error("学校打印申请必须选择本次归属部门。");
        }

        if (
          session.user.teacherId &&
          parsed.data.departmentId &&
          !positions.assignedDepartmentIds.includes(parsed.data.departmentId)
        ) {
          throw new Error("只能选择本人教师档案归属范围内的部门。");
        }
      }

      const responsibility = await findMatchingResponsibility(tx, {
        requestTypeId: type.id,
        kind: type.kind,
        printMaterialType: parsed.data.printMaterialType,
        gradeId: parsed.data.gradeId,
        subjectId: parsed.data.subjectId,
        departmentId: parsed.data.departmentId,
        responsibilityKind:
          type.kind === ApprovalRequestKind.PRINT && parsed.data.printMaterialType
            ? getPrintResponsibilityKind(parsed.data.printMaterialType)
            : type.responsibilityKind,
      });

      if (!responsibility) {
        throw new Error("未找到匹配的审批职责，请先由系统管理员配置审批人。");
      }

      const request = await tx.approvalRequest.create({
        data: {
          typeId: type.id,
          kind: type.kind,
          applicantUserId: session.user.id,
          applicantTeacherId: session.user.teacherId ?? null,
          title: parsed.data.title,
          content: parsed.data.content,
          gradeId: parsed.data.gradeId || null,
          subjectId: parsed.data.subjectId || null,
          departmentId: parsed.data.departmentId || null,
          printMaterialType:
            type.kind === ApprovalRequestKind.PRINT
              ? parsed.data.printMaterialType
              : null,
          printMode: type.kind === ApprovalRequestKind.PRINT ? parsed.data.printMode : null,
          paperSize: type.kind === ApprovalRequestKind.PRINT ? parsed.data.paperSize : null,
          printQuantity:
            type.kind === ApprovalRequestKind.PRINT
              ? parsed.data.printQuantity
              : null,
          currentApproverId: responsibility.approverId,
        },
      });

      await tx.approvalLog.create({
        data: {
          requestId: request.id,
          actorId: actorId(session.user.id),
          action: "SUBMIT",
          comment: `提交申请，路由至 ${responsibility.approver.displayName}`,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: actorId(session.user.id),
          action: "SUBMIT_APPROVAL_REQUEST",
          targetType: "ApprovalRequest",
          targetId: request.id,
          summary: `提交申请：${request.title}`,
          metadata: {
            typeId: type.id,
            kind: type.kind,
            currentApproverId: responsibility.approverId,
          },
        },
      });
    });
  } catch (error) {
    redirectWithNotice(mutationErrorMessage(error), "error");
  }

  redirectWithNotice("申请已提交，等待审批。");
}

export async function decideApprovalRequest(formData: FormData) {
  const session = await requireApprovalAccess();
  const parsed = approvalDecisionSchema.safeParse({
    id: getStringValue(formData, "id"),
    decision: getStringValue(formData, "decision"),
    comment: getStringValue(formData, "comment"),
  });

  if (!parsed.success) {
    redirectWithNotice(parsed.error.issues[0]?.message ?? "审批信息不完整。", "error");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const request = await tx.approvalRequest.findUnique({
        where: { id: parsed.data.id },
        select: {
          id: true,
          title: true,
          status: true,
        },
      });

      if (!request) {
        throw new Error("申请不存在。");
      }

      if (request.status !== ApprovalStatus.PENDING) {
        throw new Error("该申请已经处理，不能重复审批。");
      }

      if (!(await canSessionApproveRequest(tx, session, request.id))) {
        throw new Error("当前账号没有审批该申请的权限。");
      }

      const updated = await tx.approvalRequest.update({
        where: { id: request.id },
        data: {
          status: parsed.data.decision,
          decidedById: session.user.id,
          decisionComment: parsed.data.comment || null,
          decidedAt: new Date(),
        },
      });

      await tx.approvalLog.create({
        data: {
          requestId: request.id,
          actorId: actorId(session.user.id),
          action:
            parsed.data.decision === ApprovalStatus.APPROVED ? "APPROVE" : "REJECT",
          comment: parsed.data.comment || null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: actorId(session.user.id),
          action:
            parsed.data.decision === ApprovalStatus.APPROVED
              ? "APPROVE_REQUEST"
              : "REJECT_REQUEST",
          targetType: "ApprovalRequest",
          targetId: updated.id,
          summary: `审批申请：${updated.title}`,
          metadata: {
            status: updated.status,
            decisionComment: updated.decisionComment,
          },
        },
      });
    });
  } catch (error) {
    redirectWithNotice(mutationErrorMessage(error), "error");
  }

  redirectWithNotice("审批结果已保存。");
}
