"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { Alert, Button, Card, Form, Input, Space, Typography } from "antd";
import { appConfig } from "@/lib/app-config";
import {
  clearBrowserSessionCookie,
  setBrowserSessionCookie,
} from "@/lib/browser-session";
import { loginSchema, type LoginFormValues } from "@/lib/validation/auth";

const bootstrapHint = {
  username: process.env.NEXT_PUBLIC_BOOTSTRAP_ADMIN_USERNAME_HINT ?? "admin",
};

type LoginFormProps = {
  callbackUrl?: string;
  clearStaleSession?: boolean;
};

export function LoginForm({
  callbackUrl = "/dashboard",
  clearStaleSession = false,
}: LoginFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!clearStaleSession) {
      return;
    }

    clearBrowserSessionCookie();
    void signOut({
      callbackUrl: "/login",
      redirect: false,
    });
  }, [clearStaleSession]);

  const handleSubmit = async (values: LoginFormValues) => {
    const parsed = loginSchema.safeParse(values);

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "请输入完整的登录信息。");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await signIn("credentials", {
        username: parsed.data.username,
        password: parsed.data.password,
        redirect: false,
        callbackUrl,
      });

      if (!result || result.error) {
        setErrorMessage("用户名或密码不正确，请确认后重试。");
        return;
      }

      setBrowserSessionCookie();
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setErrorMessage("登录过程中发生异常，请稍后再试。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-shell flex items-center justify-center px-5 py-10">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[28px] border border-[var(--panel-border)] bg-white/88 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl lg:grid-cols-[1.04fr_0.96fr]">
        <section className="relative min-h-[620px] border-b border-[var(--panel-border)] bg-[linear-gradient(145deg,#ffffff_0%,#f4f7fb_58%,#edf2f9_100%)] p-8 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--panel-border)] pb-5 text-xs text-[var(--text-muted)]">
            <span>校务数据工作台</span>
            <span>内部系统 / 试点版</span>
          </div>

          <div className="flex min-h-[390px] flex-col justify-center py-10">
            <span className="soft-kicker w-fit">校务系统登录</span>
            <h1 className="mt-6 max-w-xl text-5xl font-semibold leading-tight tracking-normal text-[var(--text-primary)] md:text-6xl">
              {appConfig.name}
              <span className="text-[var(--accent)]">.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-[var(--text-secondary)]">
              {appConfig.subtitle}
            </p>
          </div>
        </section>

        <Card
          className="!rounded-none !border-0 !bg-white"
          styles={{ body: { padding: 40 } }}
        >
          <Space direction="vertical" size={22} className="w-full">
            <div>
              <Typography.Text className="soft-kicker">登录入口</Typography.Text>
              <Typography.Title level={2} className="!mb-2 !mt-4 !text-[var(--text-primary)]">
                账号登录
              </Typography.Title>
            </div>

            {clearStaleSession ? (
              <Alert
                type="info"
                showIcon
                message="浏览器已重新打开，请重新输入账号密码登录。"
              />
            ) : null}

            {errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}

            <Form<LoginFormValues>
              layout="vertical"
              onFinish={handleSubmit}
              autoComplete="off"
              size="large"
              requiredMark={false}
            >
              <Form.Item label="用户名" name="username" rules={[{ required: true }]}>
                <Input placeholder={`默认可使用 ${bootstrapHint.username}`} />
              </Form.Item>

              <Form.Item label="密码" name="password" rules={[{ required: true }]}>
                <Input.Password placeholder="请输入管理员密码" />
              </Form.Item>

              <Button type="primary" htmlType="submit" block loading={isSubmitting}>
                进入后台
              </Button>
            </Form>
          </Space>
        </Card>
      </div>
    </div>
  );
}
