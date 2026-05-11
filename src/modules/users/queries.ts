import "server-only";

import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export async function getUserManagementData() {
  const [
    users,
    totalUsers,
    activeUsers,
    activeAdmins,
    gradeOptions,
    teacherOptions,
    studentOptions,
  ] =
    await Promise.all([
      prisma.user.findMany({
        orderBy: [
          { isActive: "desc" },
          { role: "asc" },
          { displayName: "asc" },
          { username: "asc" },
        ],
        select: {
          id: true,
          username: true,
          displayName: true,
          accountType: true,
          isSuperAdmin: true,
          role: true,
          managedGradeId: true,
          managedGrade: {
            select: {
              id: true,
              name: true,
              enrollmentYear: true,
            },
          },
          teacherId: true,
          studentId: true,
          student: {
            select: {
              id: true,
              name: true,
              grade: {
                select: {
                  name: true,
                },
              },
              class: {
                select: {
                  name: true,
                },
              },
            },
          },
          teacher: {
            select: {
              id: true,
              name: true,
              subject: {
                select: {
                  name: true,
                },
              },
              departmentAssignments: {
                select: {
                  identityType: true,
                  position: {
                    select: {
                      name: true,
                      identityType: true,
                    },
                  },
                  department: {
                    select: {
                      name: true,
                    },
                  },
                },
                orderBy: [{ department: { name: "asc" } }],
              },
            },
          },
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count(),
      prisma.user.count({
        where: {
          isActive: true,
        },
      }),
      prisma.user.count({
        where: {
          OR: [{ role: UserRole.SYSTEM_ADMIN }, { isSuperAdmin: true }],
          isActive: true,
        },
      }),
      prisma.grade.findMany({
        where: {
          isVisibleInMain: true,
        },
        orderBy: [{ enrollmentYear: "asc" }, { name: "asc" }],
      }),
      prisma.teacher.findMany({
        orderBy: [{ name: "asc" }, { employeeNumber: "asc" }],
        select: {
          id: true,
          name: true,
          subject: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.student.findMany({
        where: {
          isArchived: false,
        },
        orderBy: [{ grade: { enrollmentYear: "asc" } }, { class: { name: "asc" } }, { name: "asc" }],
        take: 2000,
        select: {
          id: true,
          name: true,
          grade: {
            select: {
              name: true,
            },
          },
          class: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);

  return {
    users,
    totalUsers,
    activeUsers,
    activeAdmins,
    gradeOptions,
    teacherOptions,
    studentOptions,
  };
}
