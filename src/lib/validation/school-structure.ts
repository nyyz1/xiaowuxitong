import { z } from "zod";

const idSchema = z
  .string()
  .trim()
  .min(1, "缺少必要的记录标识。")
  .max(64, "记录标识格式不正确。");

const displayNameSchema = z
  .string()
  .trim()
  .min(1, "名称不能为空。")
  .max(40, "名称请控制在 40 个字符以内。");

const dateStringSchema = z.string().trim().max(20, "日期格式不正确。");

const enrollmentYearSchema = z.coerce
  .number()
  .int("入学年份必须是整数。")
  .min(2000, "入学年份不能早于 2000。")
  .max(2100, "入学年份不能晚于 2100。");

export const academicYearCreateSchema = z
  .object({
    name: displayNameSchema,
    startDate: dateStringSchema.optional().default(""),
    endDate: dateStringSchema.optional().default(""),
    isCurrent: z.boolean().default(false),
  })
  .refine((data) => !data.startDate || !data.endDate || data.startDate <= data.endDate, {
    message: "结束日期不能早于开始日期。",
    path: ["endDate"],
  });

export const academicYearUpdateSchema = academicYearCreateSchema.extend({
  id: idSchema,
});

export const deleteEntitySchema = z.object({
  id: idSchema,
});

export const gradeCreateSchema = z.object({
  enrollmentYear: enrollmentYearSchema,
});

export const gradeUpdateSchema = z.object({
  id: idSchema,
  enrollmentYear: enrollmentYearSchema,
});

export const classCreateSchema = z.object({
  gradeId: idSchema,
  name: displayNameSchema,
});

export const classUpdateSchema = z.object({
  id: idSchema,
  name: displayNameSchema,
});

export const gradeClassCountAdjustSchema = z.object({
  gradeId: idSchema,
  targetCount: z.coerce.number().int().min(0).max(60),
});

export const academicYearRolloverSchema = z.object({
  targetEnrollmentYear: enrollmentYearSchema,
  newCohortClassCount: z.coerce.number().int().min(1).max(60),
});

export const dictionaryCreateSchema = z.object({
  name: displayNameSchema,
});

export const dictionaryUpdateSchema = z.object({
  id: idSchema,
  name: displayNameSchema,
});
