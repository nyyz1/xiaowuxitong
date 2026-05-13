import "server-only";

import { hash } from "bcryptjs";
import type { Prisma } from "@/generated/prisma/client";
import { AccountType, UserRole } from "@/generated/prisma/enums";
import { syncTeacherUserRole } from "@/modules/people/teacher-role";

type AccountTx = Prisma.TransactionClient;

export type EnsureProfileAccountResult = {
  created: boolean;
  userId: string;
};

export function normalizeIdentityAccountUsername(idCardNumber: string) {
  return idCardNumber.trim().toUpperCase();
}

export function getInitialPasswordFromIdCardNumber(idCardNumber: string) {
  const normalized = normalizeIdentityAccountUsername(idCardNumber);
  return normalized.slice(-8);
}

function assertUsableIdentityAccount(idCardNumber: string) {
  const username = normalizeIdentityAccountUsername(idCardNumber);

  if (!username) {
    throw new Error("身份证号不能为空，无法自动创建登录账号。");
  }

  if (username.length < 8) {
    throw new Error("身份证号长度不足，无法生成初始密码。");
  }

  return username;
}

export async function ensureTeacherLoginAccount(
  tx: AccountTx,
  input: {
    idCardNumber: string;
    teacherId: string;
    displayName: string;
  },
): Promise<EnsureProfileAccountResult> {
  const username = assertUsableIdentityAccount(input.idCardNumber);
  const existing = await tx.user.findUnique({
    where: {
      username,
    },
    select: {
      id: true,
      teacherId: true,
      studentId: true,
    },
  });

  if (existing) {
    if (existing.teacherId === input.teacherId) {
      return {
        created: false,
        userId: existing.id,
      };
    }

    if (existing.teacherId || existing.studentId) {
      throw new Error("该身份证号对应账号已绑定其他档案，不能自动串绑。");
    }

    await tx.user.update({
      where: {
        id: existing.id,
      },
      data: {
        accountType: AccountType.TEACHER,
        teacherId: input.teacherId,
        displayName: input.displayName,
      },
    });

    await syncTeacherUserRole(tx, input.teacherId);

    return {
      created: false,
      userId: existing.id,
    };
  }

  const passwordHash = await hash(getInitialPasswordFromIdCardNumber(username), 12);
  const created = await tx.user.create({
    data: {
      username,
      displayName: input.displayName,
      passwordHash,
      accountType: AccountType.TEACHER,
      role: UserRole.TEACHER,
      teacherId: input.teacherId,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  await syncTeacherUserRole(tx, input.teacherId);

  return {
    created: true,
    userId: created.id,
  };
}

export async function ensureStudentLoginAccount(
  tx: AccountTx,
  input: {
    idCardNumber: string;
    studentId: string;
    displayName: string;
  },
): Promise<EnsureProfileAccountResult> {
  const username = assertUsableIdentityAccount(input.idCardNumber);
  const existing = await tx.user.findUnique({
    where: {
      username,
    },
    select: {
      id: true,
      teacherId: true,
      studentId: true,
    },
  });

  if (existing) {
    if (existing.studentId === input.studentId) {
      return {
        created: false,
        userId: existing.id,
      };
    }

    if (existing.teacherId || existing.studentId) {
      throw new Error("该身份证号对应账号已绑定其他档案，不能自动串绑。");
    }

    await tx.user.update({
      where: {
        id: existing.id,
      },
      data: {
        accountType: AccountType.STUDENT,
        studentId: input.studentId,
        displayName: input.displayName,
      },
    });

    return {
      created: false,
      userId: existing.id,
    };
  }

  const passwordHash = await hash(getInitialPasswordFromIdCardNumber(username), 12);
  const created = await tx.user.create({
    data: {
      username,
      displayName: input.displayName,
      passwordHash,
      accountType: AccountType.STUDENT,
      role: UserRole.TEACHER,
      studentId: input.studentId,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  return {
    created: true,
    userId: created.id,
  };
}
