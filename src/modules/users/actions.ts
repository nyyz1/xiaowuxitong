"use server";

import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { AccountType, UserRole } from "@/generated/prisma/enums";
import { requireSystemAdmin } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import {
  userCreateSchema,
  userPasswordResetSchema,
  userStatusSchema,
  userUpdateSchema,
} from "@/lib/validation/users";

type NoticeTone = "success" | "error";
type AdminSession = Awaited<ReturnType<typeof requireSystemAdmin>>;

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getBooleanValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

function optionalManagedGradeId(role: UserRole, managedGradeId: string) {
  const normalized = managedGradeId.trim();

  if (role !== UserRole.GRADE_MANAGER || !normalized) {
    return null;
  }

  return normalized;
}

function optionalTeacherId(accountType: AccountType, teacherId: string) {
  const normalized = teacherId.trim();

  if (accountType !== AccountType.TEACHER || !normalized) {
    return null;
  }

  return normalized;
}

function optionalStudentId(accountType: AccountType, studentId: string) {
  const normalized = studentId.trim();

  if (accountType !== AccountType.STUDENT || !normalized) {
    return null;
  }

  return normalized;
}

function redirectWithNotice(message: string, tone: NoticeTone = "success"): never {
  const params = new URLSearchParams({
    message,
    tone,
  });

  redirect(`/dashboard/users?${params.toString()}`);
}

function getMutationErrorMessage(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "用户名已经存在，请换一个用户名后再试。";
    }

    if (error.code === "P2025") {
      return "未找到要操作的用户，页面可能已经过期。";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "操作未完成，请稍后重试。";
}

function getAuditActorId(session: AdminSession) {
  return session.user.id === "bootstrap-admin" ? null : session.user.id;
}

async function assertKeepsActiveSystemAdmin(
  userId: string,
  nextRole: UserRole,
  nextIsSuperAdmin: boolean,
  nextIsActive: boolean,
) {
  const target = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      role: true,
      isSuperAdmin: true,
      isActive: true,
    },
  });

  if (!target) {
    throw new Error("未找到要操作的用户。");
  }

  const targetWasActiveAdmin =
    (target.role === UserRole.SYSTEM_ADMIN || target.isSuperAdmin) && target.isActive;
  const targetWillRemainActiveAdmin =
    (nextRole === UserRole.SYSTEM_ADMIN || nextIsSuperAdmin) && nextIsActive;

  if (!targetWasActiveAdmin || targetWillRemainActiveAdmin) {
    return;
  }

  const otherActiveAdminCount = await prisma.user.count({
    where: {
      id: {
        not: userId,
      },
      OR: [{ role: UserRole.SYSTEM_ADMIN }, { isSuperAdmin: true }],
      isActive: true,
    },
  });

  if (otherActiveAdminCount === 0) {
    throw new Error("系统至少需要保留一名启用中的系统管理员。");
  }
}

export async function createUser(formData: FormData) {
  const session = await requireSystemAdmin();

  const parsed = userCreateSchema.safeParse({
    username: getStringValue(formData, "username"),
    displayName: getStringValue(formData, "displayName"),
    accountType: getStringValue(formData, "accountType"),
    isSuperAdmin: getBooleanValue(formData, "isSuperAdmin"),
    role: getStringValue(formData, "role"),
    managedGradeId: getStringValue(formData, "managedGradeId"),
    teacherId: getStringValue(formData, "teacherId"),
    studentId: getStringValue(formData, "studentId"),
    password: getStringValue(formData, "password"),
    isActive: getBooleanValue(formData, "isActive"),
  });

  if (!parsed.success) {
    redirectWithNotice(parsed.error.issues[0]?.message ?? "用户信息不完整。", "error");
  }

  try {
    const passwordHash = await hash(parsed.data.password, 12);
    const managedGradeId = optionalManagedGradeId(
      parsed.data.role,
      parsed.data.managedGradeId,
    );
    const teacherId = optionalTeacherId(parsed.data.accountType, parsed.data.teacherId);
    const studentId = optionalStudentId(parsed.data.accountType, parsed.data.studentId);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: parsed.data.username,
          displayName: parsed.data.displayName,
          passwordHash,
          accountType: parsed.data.accountType,
          isSuperAdmin: parsed.data.isSuperAdmin,
          role: parsed.data.role,
          managedGradeId,
          teacherId,
          studentId,
          isActive: parsed.data.isActive,
        },
        include: {
          managedGrade: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: getAuditActorId(session),
          action: "CREATE_USER",
          targetType: "User",
          targetId: user.id,
          summary: `新增系统用户：${user.displayName}（${user.username}）。`,
          metadata: {
            role: user.role,
            accountType: user.accountType,
            isSuperAdmin: user.isSuperAdmin,
            isActive: user.isActive,
            managedGradeId,
            managedGradeName: user.managedGrade
              ? user.managedGrade.name
              : null,
            teacherId,
            studentId,
          },
        },
      });
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error");
  }

  redirectWithNotice("用户已新增，可以使用该账号登录。");
}

export async function updateUser(formData: FormData) {
  const session = await requireSystemAdmin();

  const parsed = userUpdateSchema.safeParse({
    id: getStringValue(formData, "id"),
    displayName: getStringValue(formData, "displayName"),
    accountType: getStringValue(formData, "accountType"),
    isSuperAdmin: getBooleanValue(formData, "isSuperAdmin"),
    role: getStringValue(formData, "role"),
    managedGradeId: getStringValue(formData, "managedGradeId"),
    teacherId: getStringValue(formData, "teacherId"),
    studentId: getStringValue(formData, "studentId"),
  });

  if (!parsed.success) {
    redirectWithNotice(parsed.error.issues[0]?.message ?? "用户信息不完整。", "error");
  }

  if (
    session.user.id === parsed.data.id &&
    parsed.data.role !== UserRole.SYSTEM_ADMIN &&
    !parsed.data.isSuperAdmin
  ) {
    redirectWithNotice("不能移除自己的最高管理员能力。", "error");
  }

  try {
    const current = await prisma.user.findUnique({
      where: {
        id: parsed.data.id,
      },
      select: {
        isActive: true,
      },
    });

    if (!current) {
      throw new Error("未找到要操作的用户。");
    }

    await assertKeepsActiveSystemAdmin(
      parsed.data.id,
      parsed.data.role,
      parsed.data.isSuperAdmin,
      current.isActive,
    );

    const managedGradeId = optionalManagedGradeId(
      parsed.data.role,
      parsed.data.managedGradeId,
    );
    const teacherId = optionalTeacherId(parsed.data.accountType, parsed.data.teacherId);
    const studentId = optionalStudentId(parsed.data.accountType, parsed.data.studentId);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: {
          id: parsed.data.id,
        },
        data: {
          displayName: parsed.data.displayName,
          accountType: parsed.data.accountType,
          isSuperAdmin: parsed.data.isSuperAdmin,
          role: parsed.data.role,
          managedGradeId,
          teacherId,
          studentId,
        },
        include: {
          managedGrade: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: getAuditActorId(session),
          action: "UPDATE_USER_ROLE",
          targetType: "User",
          targetId: user.id,
          summary: `更新系统用户：${user.displayName}（${user.username}）。`,
          metadata: {
            role: user.role,
            accountType: user.accountType,
            isSuperAdmin: user.isSuperAdmin,
            managedGradeId,
            managedGradeName: user.managedGrade
              ? user.managedGrade.name
              : null,
            teacherId,
            studentId,
          },
        },
      });
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error");
  }

  redirectWithNotice("用户信息已更新。");
}

export async function setUserStatus(formData: FormData) {
  const session = await requireSystemAdmin();

  const parsed = userStatusSchema.safeParse({
    id: getStringValue(formData, "id"),
    isActive: getBooleanValue(formData, "isActive"),
  });

  if (!parsed.success) {
    redirectWithNotice("用户状态更新请求无效。", "error");
  }

  if (session.user.id === parsed.data.id && !parsed.data.isActive) {
    redirectWithNotice("不能停用当前登录的自己。", "error");
  }

  try {
    const current = await prisma.user.findUnique({
      where: {
        id: parsed.data.id,
      },
      select: {
        role: true,
        isSuperAdmin: true,
      },
    });

    if (!current) {
      throw new Error("未找到要操作的用户。");
    }

    await assertKeepsActiveSystemAdmin(
      parsed.data.id,
      current.role,
      current.isSuperAdmin,
      parsed.data.isActive,
    );

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: {
          id: parsed.data.id,
        },
        data: {
          isActive: parsed.data.isActive,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: getAuditActorId(session),
          action: parsed.data.isActive ? "ENABLE_USER" : "DISABLE_USER",
          targetType: "User",
          targetId: user.id,
          summary: `${parsed.data.isActive ? "启用" : "停用"}系统用户：${
            user.displayName
          }（${user.username}）。`,
          metadata: {
            isActive: user.isActive,
          },
        },
      });
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error");
  }

  redirectWithNotice(parsed.data.isActive ? "用户已启用。" : "用户已停用。");
}

export async function resetUserPassword(formData: FormData) {
  const session = await requireSystemAdmin();

  const parsed = userPasswordResetSchema.safeParse({
    id: getStringValue(formData, "id"),
    password: getStringValue(formData, "password"),
  });

  if (!parsed.success) {
    redirectWithNotice(parsed.error.issues[0]?.message ?? "新密码不符合要求。", "error");
  }

  try {
    const passwordHash = await hash(parsed.data.password, 12);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: {
          id: parsed.data.id,
        },
        data: {
          passwordHash,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: getAuditActorId(session),
          action: "RESET_USER_PASSWORD",
          targetType: "User",
          targetId: user.id,
          summary: `重置系统用户密码：${user.displayName}（${user.username}）。`,
          metadata: {
            resetBy: session.user.id,
          },
        },
      });
    });
  } catch (error) {
    redirectWithNotice(getMutationErrorMessage(error), "error");
  }

  redirectWithNotice("用户密码已重置。");
}
