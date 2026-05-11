import {
  ApprovalRequestKind,
  ApprovalResponsibilityKind,
  ApprovalStatus,
  PaperSize,
  PrintMaterialType,
  PrintMode,
} from "@/generated/prisma/enums";

export const requestKindLabels: Record<ApprovalRequestKind, string> = {
  [ApprovalRequestKind.MAINTENANCE]: "日常报修",
  [ApprovalRequestKind.PRINT]: "日常材料打印",
  [ApprovalRequestKind.OTHER]: "其他申请",
};

export const approvalStatusLabels: Record<ApprovalStatus, string> = {
  [ApprovalStatus.PENDING]: "待审批",
  [ApprovalStatus.APPROVED]: "已通过",
  [ApprovalStatus.REJECTED]: "已驳回",
  [ApprovalStatus.CANCELLED]: "已取消",
};

export const responsibilityKindLabels: Record<ApprovalResponsibilityKind, string> = {
  [ApprovalResponsibilityKind.LOGISTICS]: "后勤报修审批",
  [ApprovalResponsibilityKind.PRINT_TEACHING]: "教学用打印审批",
  [ApprovalResponsibilityKind.PRINT_GRADE_ADMIN]: "年级行政打印审批",
  [ApprovalResponsibilityKind.PRINT_SCHOOL_ADMIN]: "学校行政打印审批",
  [ApprovalResponsibilityKind.OTHER]: "其他申请审批",
};

export const printMaterialTypeLabels: Record<PrintMaterialType, string> = {
  [PrintMaterialType.TEACHING]: "教学用",
  [PrintMaterialType.GRADE_ADMIN]: "年级行政用",
  [PrintMaterialType.SCHOOL_ADMIN]: "学校行政用",
};

export const printModeLabels: Record<PrintMode, string> = {
  [PrintMode.BLACK_WHITE]: "打印",
  [PrintMode.COLOR]: "彩印",
};

export const paperSizeLabels: Record<PaperSize, string> = {
  [PaperSize.A4]: "A4",
  [PaperSize.B5]: "B5",
  [PaperSize.B3]: "B3",
};

export function getPrintResponsibilityKind(materialType: PrintMaterialType) {
  if (materialType === PrintMaterialType.TEACHING) {
    return ApprovalResponsibilityKind.PRINT_TEACHING;
  }

  if (materialType === PrintMaterialType.GRADE_ADMIN) {
    return ApprovalResponsibilityKind.PRINT_GRADE_ADMIN;
  }

  return ApprovalResponsibilityKind.PRINT_SCHOOL_ADMIN;
}

