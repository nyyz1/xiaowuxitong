import type { DefaultSession } from "next-auth";
import type { AccountType, UserRole } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: UserRole;
      accountType?: AccountType;
      isSuperAdmin?: boolean;
      managedGradeId?: string | null;
      teacherId?: string | null;
      studentId?: string | null;
    };
  }

  interface User {
    role?: UserRole;
    accountType?: AccountType;
    isSuperAdmin?: boolean;
    managedGradeId?: string | null;
    teacherId?: string | null;
    studentId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    accountType?: AccountType;
    isSuperAdmin?: boolean;
    managedGradeId?: string | null;
    teacherId?: string | null;
    studentId?: string | null;
  }
}
