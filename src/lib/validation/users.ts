import { z } from "zod";
import { UserRole } from "@/generated/prisma/enums";

export const userRoleSchema = z.enum([
  UserRole.SYSTEM_ADMIN,
  UserRole.SCHOOL_LEADER,
  UserRole.DEPARTMENT_LEADER,
  UserRole.GRADE_MANAGER,
  UserRole.STUDENT_AFFAIRS_STAFF,
  UserRole.ACADEMIC_AFFAIRS_STAFF,
  UserRole.ADMIN_OFFICE_STAFF,
  UserRole.LOGISTICS_STAFF,
  UserRole.TEACHER,
]);

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "用户名至少需要 3 个字符。")
  .max(40, "用户名不能超过 40 个字符。")
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    "用户名只能包含字母、数字、点、下划线和短横线。",
  )
  .transform((value) => value.toLowerCase());

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "显示名称不能为空。")
  .max(40, "显示名称不能超过 40 个字符。");

export const passwordSchema = z
  .string()
  .min(8, "密码至少需要 8 个字符。")
  .max(80, "密码不能超过 80 个字符。");

const optionalIdSchema = z
  .string()
  .trim()
  .transform((value) => value || "");

function validateUserScope<
  T extends { role: UserRole; managedGradeId: string; teacherId: string },
>(input: T) {
  if (input.role === UserRole.GRADE_MANAGER && !input.managedGradeId) {
    throw new Error("年级管理员必须指定一个负责年级。");
  }

  return {
    ...input,
    managedGradeId:
      input.role === UserRole.GRADE_MANAGER ? input.managedGradeId : "",
    teacherId: input.teacherId,
  };
}

function scopeTransform<
  T extends { role: UserRole; managedGradeId: string; teacherId: string },
>(input: T) {
  try {
    return validateUserScope(input);
  } catch (error) {
    throw new z.ZodError([
      {
        code: "custom",
        path: ["role"],
        message:
          error instanceof Error ? error.message : "账号范围设置无效。",
      },
    ]);
  }
}

export const userCreateSchema = z
  .object({
    username: usernameSchema,
    displayName: displayNameSchema,
    role: userRoleSchema,
    managedGradeId: optionalIdSchema,
    teacherId: optionalIdSchema,
    password: passwordSchema,
    isActive: z.boolean(),
  })
  .transform(scopeTransform);

export const userUpdateSchema = z
  .object({
    id: z.string().trim().min(1, "用户编号不能为空。"),
    displayName: displayNameSchema,
    role: userRoleSchema,
    managedGradeId: optionalIdSchema,
    teacherId: optionalIdSchema,
  })
  .transform(scopeTransform);

export const userStatusSchema = z.object({
  id: z.string().trim().min(1, "用户编号不能为空。"),
  isActive: z.boolean(),
});

export const userPasswordResetSchema = z.object({
  id: z.string().trim().min(1, "用户编号不能为空。"),
  password: passwordSchema,
});
