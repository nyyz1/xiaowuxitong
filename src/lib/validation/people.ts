import { z } from "zod";

export const teacherStatuses = ["ACTIVE", "INACTIVE"] as const;
export const studentStatuses = ["ACTIVE", "INACTIVE"] as const;
export const profileFieldTargetTypes = ["TEACHER", "STUDENT"] as const;

const idSchema = z.string().trim().min(1).max(64);

const requiredTextSchema = z
  .string()
  .trim()
  .min(1, "必填项不能为空。")
  .max(60, "内容请控制在 60 个字符以内。");

const optionalTextSchema = z
  .string()
  .trim()
  .max(80, "内容请控制在 80 个字符以内。")
  .optional()
  .default("");

const optionalIdSchema = z
  .string()
  .trim()
  .max(64, "记录标识格式不正确。")
  .optional()
  .default("");

const remarksSchema = z
  .string()
  .trim()
  .max(300, "备注请控制在 300 个字符以内。")
  .optional()
  .default("");

export const teacherMutationSchema = z.object({
  id: idSchema.optional(),
  idCardNumber: requiredTextSchema,
  employeeNumber: optionalTextSchema,
  name: requiredTextSchema,
  gender: optionalTextSchema,
  departmentIds: z.array(idSchema).optional().default([]),
  subjectId: optionalIdSchema,
  duties: z.string().trim().max(200).optional().default(""),
  phone: optionalTextSchema,
  employmentStatus: z.enum(teacherStatuses).default("ACTIVE"),
  remarks: remarksSchema,
});

export const studentMutationSchema = z.object({
  id: idSchema.optional(),
  idCardNumber: requiredTextSchema,
  studentNumber: optionalTextSchema,
  name: requiredTextSchema,
  gender: optionalTextSchema,
  gradeId: idSchema,
  classId: optionalIdSchema,
  enrollmentStatus: z.enum(studentStatuses).default("ACTIVE"),
  phone: optionalTextSchema,
  guardianContact: optionalTextSchema,
  remarks: remarksSchema,
});

export const archivePeopleRecordSchema = z.object({
  id: idSchema,
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export const peopleRecordDeleteSchema = z.object({
  id: idSchema,
});

export const profileFieldDefinitionMutationSchema = z.object({
  id: idSchema.optional(),
  targetType: z.enum(profileFieldTargetTypes),
  name: z
    .string()
    .trim()
    .min(1, "统计类目名称不能为空。")
    .max(40, "统计类目名称请控制在 40 个字符以内。"),
});

export const profileFieldDefinitionStatusSchema = z.object({
  id: idSchema,
  isActive: z.enum(["true", "false"]),
});

export const profileFieldDefinitionDeleteSchema = z.object({
  id: idSchema,
});

export const peopleFilterSchema = z.object({
  teacherKeyword: z.string().trim().max(80).optional().default(""),
  teacherDepartmentId: z.string().trim().max(64).optional().default(""),
  teacherSubjectId: z.string().trim().max(64).optional().default(""),
  teacherStatus: z
    .enum(["ALL", ...teacherStatuses])
    .optional()
    .default("ALL"),
  studentKeyword: z.string().trim().max(80).optional().default(""),
  studentGradeId: z.string().trim().max(64).optional().default(""),
  studentClassId: z.string().trim().max(64).optional().default(""),
  studentStatus: z
    .enum(["ALL", ...studentStatuses])
    .optional()
    .default("ALL"),
});
