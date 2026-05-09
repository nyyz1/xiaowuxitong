"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "antd";
import { clearBrowserSessionCookie } from "@/lib/browser-session";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const handleLogout = async () => {
    setIsPending(true);

    try {
      clearBrowserSessionCookie();
      await signOut({
        callbackUrl: "/login",
        redirect: false,
      });
      router.push("/login");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button ghost loading={isPending} onClick={handleLogout}>
      退出登录
    </Button>
  );
}
