"use server";

import { compare, hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { requireAuthenticatedSession } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { passwordSchema } from "@/lib/validation/users";

type NoticeTone = "success" | "error";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function redirectWithNotice(message: string, tone: NoticeTone = "success"): never {
  const params = new URLSearchParams({
    message,
    tone,
  });

  redirect(`/dashboard/account/password?${params.toString()}`);
}

export async function changeOwnPassword(formData: FormData) {
  const session = await requireAuthenticatedSession();
  const currentPassword = getStringValue(formData, "currentPassword");
  const nextPassword = getStringValue(formData, "nextPassword");
  const confirmPassword = getStringValue(formData, "confirmPassword");

  const parsedPassword = passwordSchema.safeParse(nextPassword);

  if (!parsedPassword.success) {
    redirectWithNotice(
      parsedPassword.error.issues[0]?.message ?? "新密码不符合要求。",
      "error",
    );
  }

  if (nextPassword !== confirmPassword) {
    redirectWithNotice("两次输入的新密码不一致。", "error");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!user?.passwordHash) {
    redirectWithNotice("当前账号不能在这里修改密码，请联系系统管理员。", "error");
  }

  const currentMatches = await compare(currentPassword, user.passwordHash);

  if (!currentMatches) {
    redirectWithNotice("当前密码不正确。", "error");
  }

  const passwordHash = await hash(parsedPassword.data, 12);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "CHANGE_OWN_PASSWORD",
        targetType: "User",
        targetId: user.id,
        summary: "用户修改本人登录密码。",
      },
    });
  });

  redirectWithNotice("密码已修改，下次登录请使用新密码。");
}
