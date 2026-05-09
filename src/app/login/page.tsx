import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getBrowserBoundServerSession } from "@/lib/auth";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function getSafeCallbackUrl(value: string) {
  return value.startsWith("/dashboard") ? value : "/dashboard";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { session, hasStaleNextAuthSession } = await getBrowserBoundServerSession();
  const params = await searchParams;
  const callbackUrl = getSafeCallbackUrl(readParam(params.callbackUrl));

  if (session) {
    redirect(callbackUrl);
  }

  return (
    <LoginForm
      callbackUrl={callbackUrl}
      clearStaleSession={hasStaleNextAuthSession}
    />
  );
}
