import "server-only";

import { prisma } from "@/lib/prisma";

export async function getSchoolStructureSnapshot() {
  const [grades, departments, subjects] = await Promise.all([
    prisma.grade.findMany({
      where: {
        isVisibleInMain: true,
      },
      orderBy: [{ enrollmentYear: "asc" }, { name: "asc" }],
      include: {
        classes: {
          orderBy: [{ name: "asc" }],
        },
        _count: {
          select: {
            classes: true,
            students: true,
            managedUsers: true,
          },
        },
      },
    }),
    prisma.department.findMany({
      orderBy: [{ name: "asc" }],
      include: {
        _count: {
          select: {
            teachers: true,
          },
        },
      },
    }),
    prisma.subject.findMany({
      orderBy: [{ name: "asc" }],
      include: {
        _count: {
          select: {
            teachers: true,
          },
        },
      },
    }),
  ]);

  return {
    grades,
    departments,
    subjects,
  };
}
