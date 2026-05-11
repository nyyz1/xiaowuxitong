import "server-only";

import { ApprovalStatus, UserRole } from "@/generated/prisma/enums";
import type { AuthorizedSession } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { canSessionApproveRequest } from "@/modules/approvals/routing";

const requestInclude = {
  type: {
    select: {
      id: true,
      name: true,
      kind: true,
      responsibilityKind: true,
    },
  },
  applicantUser: {
    select: {
      id: true,
      displayName: true,
    },
  },
  applicantTeacher: {
    select: {
      id: true,
      name: true,
    },
  },
  grade: {
    select: {
      id: true,
      name: true,
    },
  },
  subject: {
    select: {
      id: true,
      name: true,
    },
  },
  department: {
    select: {
      id: true,
      name: true,
    },
  },
  decidedBy: {
    select: {
      id: true,
      displayName: true,
    },
  },
} as const;

function listWhereForSession(session: AuthorizedSession) {
  if (
    session.user.role === UserRole.SYSTEM_ADMIN ||
    session.user.role === UserRole.SCHOOL_LEADER
  ) {
    return {};
  }

  if (session.user.teacherId) {
    return {
      applicantUserId: session.user.id,
    };
  }

  return {
    OR: [
      { applicantUserId: session.user.id },
      { currentApproverId: session.user.id },
      { decidedById: session.user.id },
    ],
  };
}

export async function getApprovalPageData(session: AuthorizedSession) {
  const [
    requestTypes,
    responsibilities,
    requests,
    users,
    teachers,
    grades,
    subjects,
    departments,
  ] = await Promise.all([
    prisma.approvalType.findMany({
      orderBy: [{ kind: "asc" }, { name: "asc" }],
    }),
    prisma.approvalResponsibility.findMany({
      orderBy: [{ isActive: "desc" }, { kind: "asc" }, { name: "asc" }],
      include: {
        approver: {
          select: {
            id: true,
            displayName: true,
            role: true,
          },
        },
        requestType: {
          select: {
            id: true,
            name: true,
          },
        },
        grade: {
          select: {
            id: true,
            name: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.approvalRequest.findMany({
      where: listWhereForSession(session),
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: requestInclude,
      take: 80,
    }),
    prisma.user.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ role: "asc" }, { displayName: "asc" }],
      select: {
        id: true,
        displayName: true,
        role: true,
        teacherId: true,
      },
    }),
    prisma.teacher.findMany({
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        subjectId: true,
        departmentId: true,
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
        departmentAssignments: {
          select: {
            departmentId: true,
            identityType: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [{ department: { name: "asc" } }],
        },
      },
    }),
    prisma.grade.findMany({
      where: {
        isVisibleInMain: true,
      },
      orderBy: [{ enrollmentYear: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.subject.findMany({
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.department.findMany({
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  const approvableIds = new Set<string>();
  await Promise.all(
    requests
      .filter((request) => request.status === ApprovalStatus.PENDING)
      .map(async (request) => {
        if (await canSessionApproveRequest(prisma, session, request.id)) {
          approvableIds.add(request.id);
        }
      }),
  );

  return {
    requestTypes,
    responsibilities,
    requests,
    users,
    teachers,
    grades,
    subjects,
    departments,
    approvableIds,
  };
}
