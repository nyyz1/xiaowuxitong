import Link from "next/link";
import { AccountType } from "@/generated/prisma/enums";
import { SubmitButton } from "@/components/form/submit-button";
import { requireAuthenticatedSession } from "@/lib/authorization";
import { changeOwnPassword } from "@/modules/accounts/actions";

type PasswordPageProps = {
  searchParams?: Promise<{
    tone?: string;
    message?: string;
  }>;
};

function PasswordInput({
  name,
  placeholder,
}: {
  name: string;
  placeholder: string;
}) {
  return (
    <input
      type="password"
      name={name}
      placeholder={placeholder}
      required
      minLength={8}
      className="h-11 rounded-2xl border border-[var(--panel-border)] bg-white px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-strong)]"
    />
  );
}

export default async function AccountPasswordPage({
  searchParams,
}: PasswordPageProps) {
  const [session, params] = await Promise.all([
    requireAuthenticatedSession(),
    searchParams ?? Promise.resolve({} as { tone?: string; message?: string }),
  ]);
  const notice =
    params.message && params.tone
      ? {
          tone: params.tone === "error" ? "error" : "success",
          message: params.message,
        }
      : null;
  const isStudentAccount = session.user.accountType === AccountType.STUDENT;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="rounded-[30px] bg-[linear-gradient(135deg,#1f7a8c_0%,#255b6a_100%)] p-8 text-white">
        <span className="soft-kicker !bg-white/16 !text-white">账号安全</span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">修改本人密码</h1>
        <p className="mt-4 text-sm leading-7 text-white/78">
          {isStudentAccount
            ? "学生账号当前只开放密码维护入口，不进入业务管理页面。"
            : "教师和管理账号可在这里维护自己的登录密码。"}
        </p>
      </section>

      {notice ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            notice.tone === "error"
              ? "bg-red-50 text-red-700"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      <section className="rounded-[28px] border border-[var(--panel-border)] bg-white/78 p-6">
        <form action={changeOwnPassword} className="grid gap-4">
          <PasswordInput name="currentPassword" placeholder="当前密码" />
          <PasswordInput name="nextPassword" placeholder="新密码，至少 8 位" />
          <PasswordInput name="confirmPassword" placeholder="再次输入新密码" />
          <SubmitButton
            idleLabel="保存新密码"
            pendingLabel="保存中..."
            className="h-11"
          />
        </form>
      </section>

      {!isStudentAccount ? (
        <Link
          href="/dashboard"
          className="inline-flex rounded-2xl border border-[var(--panel-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]"
        >
          返回工作台
        </Link>
      ) : null}
    </div>
  );
}
