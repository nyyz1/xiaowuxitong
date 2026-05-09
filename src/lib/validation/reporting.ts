import { z } from "zod";
import {
  defaultInspectionTargetType,
  inspectionTargetTypes,
} from "@/lib/validation/inspection";

const optionalIdSchema = z.string().trim().max(64).optional().default("");
const optionalDateSchema = z
  .string()
  .trim()
  .max(10)
  .refine(
    (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "日期格式不正确。",
  )
  .optional()
  .default("");

export const reportFilterSchema = z.object({
  targetType: z.enum(inspectionTargetTypes).default(defaultInspectionTargetType),
  categoryId: optionalIdSchema,
  itemId: optionalIdSchema,
  gradeId: optionalIdSchema,
  classId: optionalIdSchema,
  teacherId: optionalIdSchema,
  dateFrom: optionalDateSchema,
  dateTo: optionalDateSchema,
});
