import "server-only";

import { compare } from "bcryptjs";
import type { NextAuthOptions, Session } from "next-auth";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import CredentialsProvider from "next-auth/providers/credentials";
import { UserRole } from "@/generated/prisma/enums";
import { browserSessionCookieName } from "@/lib/browser-session";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation/auth";

const bootstrapAdminUsername = (
  process.env.BOOTSTRAP_ADMIN_USERNAME ?? "admin"
)
  .trim()
  .toLowerCase();
const bootstrapAdminPassword =
  process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "ChangeMe123!";

async function authorizeDatabaseUser(username: string, password: string) {
  try {
    const user = await prisma.user.findUnique({
      where: {
        username,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        passwordHash: true,
        role: true,
        managedGradeId: true,
        isActive: true,
      },
    });

    if (!user?.isActive || !user.passwordHash) {
      return null;
    }

    const passwordMatches = await compare(password, user.passwordHash);

    if (!passwordMatches) {
      return null;
    }

    return {
      id: user.id,
      name: user.displayName,
      email: `${user.username}@school.local`,
      role: user.role,
      managedGradeId: user.managedGradeId,
    };
  } catch {
    // Keep the Bootstrap account usable while the database is not reachable.
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET ?? "development-only-secret-change-me",
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "School Credentials",
      credentials: {
        username: {
          label: "用户名",
          type: "text",
          placeholder: "请输入管理员账号",
        },
        password: {
          label: "密码",
          type: "password",
          placeholder: "请输入密码",
        },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const databaseUser = await authorizeDatabaseUser(
          parsed.data.username,
          parsed.data.password,
        );

        if (databaseUser) {
          return databaseUser;
        }

        if (
          parsed.data.username !== bootstrapAdminUsername ||
          parsed.data.password !== bootstrapAdminPassword
        ) {
          return null;
        }

        return {
          id: "bootstrap-admin",
          name: "系统管理员",
          email: "admin@school.local",
          role: UserRole.SYSTEM_ADMIN,
          managedGradeId: null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub =
          "id" in user && typeof user.id === "string"
            ? user.id
            : "bootstrap-admin";
        token.role =
          "role" in user && typeof user.role === "string"
            ? user.role
            : UserRole.SYSTEM_ADMIN;
        token.managedGradeId =
          "managedGradeId" in user &&
          (typeof user.managedGradeId === "string" || user.managedGradeId === null)
            ? user.managedGradeId
            : null;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "bootstrap-admin";
        session.user.role =
          typeof token.role === "string"
            ? (token.role as UserRole)
            : UserRole.SYSTEM_ADMIN;
        session.user.managedGradeId =
          typeof token.managedGradeId === "string" || token.managedGradeId === null
            ? token.managedGradeId
            : null;
      }

      return session;
    },
  },
};

export async function getBrowserBoundServerSession(): Promise<{
  session: Session | null;
  hasStaleNextAuthSession: boolean;
}> {
  const [session, cookieStore] = await Promise.all([
    getServerSession(authOptions),
    cookies(),
  ]);

  const hasBrowserSession = Boolean(cookieStore.get(browserSessionCookieName)?.value);

  if (!session) {
    return {
      session: null,
      hasStaleNextAuthSession: false,
    };
  }

  if (!hasBrowserSession) {
    return {
      session: null,
      hasStaleNextAuthSession: true,
    };
  }

  return {
    session,
    hasStaleNextAuthSession: false,
  };
}
