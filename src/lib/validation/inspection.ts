import { z } from "zod";

export const inspectionValueTypes = ["SCORE", "COUNT", "DEDUCTION"] as const;
export const inspectionTargetTypes = ["STUDENT", "TEACHER"] as const;

export type InspectionTargetTypeValue = (typeof inspectionTargetTypes)[number];

export const defaultInspectionTargetType: InspectionTargetTypeValue = "STUDENT";

export const inspectionTargetTypeLabels: Record<InspectionTargetTypeValue, string> = {
  STUDENT: "学生量化",
  TEACHER: "教师量化",
};

const idSchema = z.string().trim().min(1, "请选择有效记录。").max(64);
const optionalIdSchema = z.string().trim().max(64).optional().default("");

const requiredNameSchema = z
  .string()
  .trim()
  .min(1, "名称不能为空。")
  .max(60, "名称请控制在 60 个字符以内。");

const descriptionSchema = z
  .string()
  .trim()
  .max(300, "说明请控制在 300 个字符以内。")
  .optional()
  .default("");

const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "请选择有效日期。");

const valueSchema = z
  .string()
  .trim()
  .min(1, "检查结果数值不能为空。")
  .refine((value) => Number.isFinite(Number(value)), "检查结果必须是数字。")
  .transform((value) => Number(value))
  .refine(
    (value) => value >= -100000 && value <= 100000,
    "检查结果数值超出允许范围。",
  );

const remarksSchema = z
  .string()
  .trim()
  .max(500, "备注请控制在 500 个字符以内。")
  .optional()
  .default("");

const inspectionTargetTypeSchema = z
  .enum(inspectionTargetTypes)
  .default(defaultInspectionTargetType);

export function coerceInspectionTargetTypeForGradeScope(
  targetType: InspectionTargetTypeValue,
  gradeScopeId?: string | null,
) {
  return gradeScopeId ? defaultInspectionTargetType : targetType;
}

export const inspectionCategoryCreateSchema = z.object({
  name: requiredNameSchema,
  targetType: inspectionTargetTypeSchema,
});

export const inspectionCategoryMutationSchema = z.object({
  id: idSchema.optional(),
  name: requiredNameSchema,
});

export const inspectionCategoryDeleteSchema = z.object({
  id: idSchema,
});

export const inspectionItemMutationSchema = z.object({
  id: idSchema.optional(),
  name: requiredNameSchema,
  categoryId: idSchema,
  valueType: z.enum(inspectionValueTypes).default("SCORE"),
  description: descriptionSchema,
});

export const inspectionItemStatusSchema = z.object({
  id: idSchema,
  isActive: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export const inspectionRecordMutationSchema = z
  .object({
    id: idSchema.optional(),
    targetType: inspectionTargetTypeSchema,
    inspectionDate: dateSchema,
    inspectionItemId: idSchema,
    gradeId: optionalIdSchema,
    classId: optionalIdSchema,
    teacherId: optionalIdSchema,
    value: valueSchema,
    remarks: remarksSchema,
  })
  .superRefine((data, ctx) => {
    if (data.targetType === "STUDENT") {
      if (!data.gradeId && !data.classId) {
        ctx.addIssue({
          code: "custom",
          path: ["gradeId"],
          message: "请选择学生量化对应的年级或班级。",
        });
      }

      if (data.teacherId) {
        ctx.addIssue({
          code: "custom",
          path: ["teacherId"],
          message: "学生量化不能同时选择教师。",
        });
      }
    }

    if (data.targetType === "TEACHER") {
      if (!data.teacherId) {
        ctx.addIssue({
          code: "custom",
          path: ["teacherId"],
          message: "请选择教师量化对应的教师。",
        });
      }

      if (data.gradeId || data.classId) {
        ctx.addIssue({
          code: "custom",
          path: ["gradeId"],
          message: "教师量化记录不关联年级或班级。",
        });
      }
    }
  });

export const inspectionRecordDeleteSchema = z.object({
  id: idSchema,
  targetType: inspectionTargetTypeSchema,
});

export const inspectionFilterSchema = z.object({
  targetType: inspectionTargetTypeSchema,
  categoryId: optionalIdSchema,
  itemId: optionalIdSchema,
  gradeId: optionalIdSchema,
  classId: optionalIdSchema,
  teacherId: optionalIdSchema,
  dateFrom: z.string().trim().max(10).optional().default(""),
  dateTo: z.string().trim().max(10).optional().default(""),
});
