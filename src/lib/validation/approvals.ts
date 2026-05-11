import { z } from "zod";
import {
  ApprovalRequestKind,
  ApprovalResponsibilityKind,
  ApprovalStatus,
  PaperSize,
  PrintMaterialType,
  PrintMode,
} from "@/generated/prisma/enums";

const optionalId = z
  .string()
  .trim()
  .transform((value) => value || "");

export const approvalTypeSchema = z
  .object({
    id: optionalId.optional().default(""),
    name: z.string().trim().min(1, "申请类型名称不能为空。").max(40),
    kind: z.enum([
      ApprovalRequestKind.MAINTENANCE,
      ApprovalRequestKind.PRINT,
      ApprovalRequestKind.OTHER,
    ]),
    responsibilityKind: z
      .enum([
        ApprovalResponsibilityKind.LOGISTICS,
        ApprovalResponsibilityKind.PRINT_TEACHING,
        ApprovalResponsibilityKind.PRINT_GRADE_ADMIN,
        ApprovalResponsibilityKind.PRINT_SCHOOL_ADMIN,
        ApprovalResponsibilityKind.OTHER,
      ])
      .optional()
      .nullable(),
    description: z.string().trim().max(200).optional().default(""),
    isActive: z.boolean(),
  })
  .transform((input) => ({
    ...input,
    responsibilityKind:
      input.kind === ApprovalRequestKind.OTHER
        ? input.responsibilityKind ?? ApprovalResponsibilityKind.OTHER
        : null,
  }));

export const responsibilitySchema = z.object({
  id: optionalId.optional().default(""),
  name: z.string().trim().min(1, "职责名称不能为空。").max(40),
  kind: z.enum([
    ApprovalResponsibilityKind.LOGISTICS,
    ApprovalResponsibilityKind.PRINT_TEACHING,
    ApprovalResponsibilityKind.PRINT_GRADE_ADMIN,
    ApprovalResponsibilityKind.PRINT_SCHOOL_ADMIN,
    ApprovalResponsibilityKind.OTHER,
  ]),
  approverId: z.string().trim().min(1, "必须选择审批账号。"),
  requestTypeId: optionalId.optional().default(""),
  gradeId: optionalId.optional().default(""),
  subjectId: optionalId.optional().default(""),
  departmentId: optionalId.optional().default(""),
  isActive: z.boolean(),
});

export const approvalRequestSchema = z
  .object({
    typeId: z.string().trim().min(1, "必须选择申请类型。"),
    title: z.string().trim().min(1, "申请标题不能为空。").max(80),
    content: z.string().trim().min(1, "申请内容不能为空。").max(1000),
    gradeId: optionalId.optional().default(""),
    subjectId: optionalId.optional().default(""),
    departmentId: optionalId.optional().default(""),
    printMaterialType: z
      .enum([
        PrintMaterialType.TEACHING,
        PrintMaterialType.GRADE_ADMIN,
        PrintMaterialType.SCHOOL_ADMIN,
      ])
      .optional(),
    printMode: z.enum([PrintMode.BLACK_WHITE, PrintMode.COLOR]).optional(),
    paperSize: z.enum([PaperSize.A4, PaperSize.B5, PaperSize.B3]).optional(),
    printQuantity: z.coerce.number().int().positive().max(99999).optional(),
  })
  .superRefine((input, ctx) => {
    if (!input.printMaterialType && (input.printMode || input.paperSize || input.printQuantity)) {
      ctx.addIssue({
        code: "custom",
        path: ["printMaterialType"],
        message: "打印申请必须选择材料类型。",
      });
    }
  });

export const approvalDecisionSchema = z.object({
  id: z.string().trim().min(1, "申请编号不能为空。"),
  decision: z.enum([ApprovalStatus.APPROVED, ApprovalStatus.REJECTED]),
  comment: z.string().trim().max(300).optional().default(""),
});

