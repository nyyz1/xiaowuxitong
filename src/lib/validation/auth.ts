import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "请输入用户名")
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, "请输入密码"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
