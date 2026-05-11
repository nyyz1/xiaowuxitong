import "server-only";

import { GradeStage } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { flattenClassOptions } from "@/lib/grade-options";
import { prisma } from "@/lib/prisma";
import { peopleFilterSchema } from "@/lib/validation/people";
import { sortProfileFieldDefinitions } from "@/modules/people/helpers";
import { systemProfileFieldsByTarget } from "@/modules/people/system-profile-fields";

export type StudentViewMode = "active" | "archived";
export type PeopleFilters = ReturnType<typeof normalizePeopleFilters>;

type RawSearchParams = Record<string, string | string[] | undefined>;
type PeopleQueryOptions = {
  gradeScopeId?: string | null;
  includeTeacherData?: boolean;
  includeStudentData?: boolean;
  studentViewMode?: StudentViewMode;
  teacherDepartmentScopeIds?: string[];
};

function readParam(params: RawSearchParams, key: string) {
  const value = params[key];

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function getStudentGradeWhere(studentViewMode: StudentViewMode): Prisma.GradeWhereInput {
  if (studentViewMode === "archived") {
    return {
      stage: GradeStage.ALUMNI,
    };
  }

  return {
    isVisibleInMain: true,
  };
}

function normalizeQuickSearchKeyword(value: string) {
  return value.trim().toUpperCase();
}

function matchesQuickSearchValue(value: string | null | undefined, keyword: string) {
  if (!value) {
    return false;
  }

  return value.toUpperCase().includes(keyword);
}

function matchesStudentQuickSearchKeyword(
  student: {
    idCardNumber?: string | null;
    studentNumber?: string | null;
    name: string;
    phone?: string | null;
    guardianContact?: string | null;
    profileData: unknown;
  },
  keyword: string,
  dormitoryFieldIds: string[],
) {
  if (!keyword) {
    return true;
  }

  if (
    matchesQuickSearchValue(student.idCardNumber, keyword) ||
    matchesQuickSearchValue(student.studentNumber, keyword) ||
    matchesQuickSearchValue(student.name, keyword) ||
    matchesQuickSearchValue(student.phone, keyword) ||
    matchesQuickSearchValue(student.guardianContact, keyword)
  ) {
    return true;
  }

  const profileData =
    student.profileData && typeof student.profileData === "object" && !Array.isArray(student.profileData)
      ? (student.profileData as Record<string, unknown>)
      : {};

  return dormitoryFieldIds.some((fieldId) => {
    const rawValue = profileData[fieldId];
    return typeof rawValue === "string" && matchesQuickSearchValue(rawValue, keyword);
  });
}

export function normalizePeopleFilters(params: RawSearchParams) {
  return peopleFilterSchema.parse({
    teacherKeyword: readParam(params, "teacherKeyword"),
    teacherDepartmentId: readParam(params, "teacherDepartmentId"),
    teacherSubjectId: readParam(params, "teacherSubjectId"),
    teacherStatus: readParam(params, "teacherStatus") || "ALL",
    studentKeyword: readParam(params, "studentKeyword"),
    studentGradeId: readParam(params, "studentGradeId"),
    studentClassId: readParam(params, "studentClassId"),
    studentStatus: readParam(params, "studentStatus") || "ALL",
  });
}

export async function getProfileFieldDefinitions(
  targetType: "TEACHER" | "STUDENT",
  options: {
    activeOnly?: boolean;
  } = {},
) {
  await ensureSystemProfileFieldDefinitions(targetType);

  const definitions = await prisma.profileFieldDefinition.findMany({
    where: {
      targetType,
      isDeleted: false,
      ...(options.activeOnly ? { isActive: true } : {}),
    },
  });

  return sortProfileFieldDefinitions(definitions);
}

async function ensureSystemProfileFieldDefinitions(
  targetType: "TEACHER" | "STUDENT",
) {
  const systemFields = systemProfileFieldsByTarget[targetType];

  for (const field of systemFields) {
    const existing = await prisma.profileFieldDefinition.findUnique({
      where: {
        targetType_fieldKey: {
          targetType,
          fieldKey: field.fieldKey,
        },
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      continue;
    }

    await prisma.profileFieldDefinition.create({
      data: {
        targetType,
        fieldKey: field.fieldKey,
        name: field.name,
        sortOrder: field.sortOrder,
      },
    });
  }
}

export function buildTeacherWhere(
  filters: PeopleFilters,
  departmentScopeIds: string[] = [],
): Prisma.TeacherWhereInput {
  const andConditions: Prisma.TeacherWhereInput[] = [];

  if (filters.teacherKeyword) {
    andConditions.push({
      OR: [
        { idCardNumber: { contains: filters.teacherKeyword } },
        { employeeNumber: { contains: filters.teacherKeyword } },
        { name: { contains: filters.teacherKeyword } },
        { phone: { contains: filters.teacherKeyword } },
        { duties: { has: filters.teacherKeyword } },
      ],
    });
  }

  if (filters.teacherDepartmentId) {
    andConditions.push({
      OR: [
        { departmentId: filters.teacherDepartmentId },
        {
          departmentAssignments: {
            some: {
              departmentId: filters.teacherDepartmentId,
            },
          },
        },
      ],
    });
  }

  if (departmentScopeIds.length > 0) {
    andConditions.push({
      departmentAssignments: {
        some: {
          departmentId: {
            in: departmentScopeIds,
          },
        },
      },
    });
  }

  if (filters.teacherSubjectId) {
    andConditions.push({
      subjectId: filters.teacherSubjectId,
    });
  }

  if (filters.teacherStatus !== "ALL") {
    andConditions.push({
      employmentStatus: filters.teacherStatus,
    });
  }

  if (andConditions.length === 0) {
    return {};
  }

  return andConditions.length === 1 ? andConditions[0] : { AND: andConditions };
}

export function buildStudentWhere(
  filters: PeopleFilters,
  gradeScopeId?: string | null,
  studentViewMode: StudentViewMode = "active",
): Prisma.StudentWhereInput {
  const andConditions: Prisma.StudentWhereInput[] = [
    {
      isArchived: studentViewMode === "archived",
    },
    {
      grade: getStudentGradeWhere(studentViewMode),
    },
  ];

  if (filters.studentKeyword) {
    andConditions.push({
      OR: [
        { idCardNumber: { contains: filters.studentKeyword } },
        { studentNumber: { contains: filters.studentKeyword } },
        { name: { contains: filters.studentKeyword } },
        { phone: { contains: filters.studentKeyword } },
        { guardianContact: { contains: filters.studentKeyword } },
      ],
    });
  }

  if (gradeScopeId) {
    andConditions.push({
      gradeId: gradeScopeId,
    });
  } else if (filters.studentGradeId) {
    andConditions.push({
      gradeId: filters.studentGradeId,
    });
  }

  if (filters.studentClassId) {
    andConditions.push({
      classId: filters.studentClassId,
    });
  }

  if (filters.studentStatus !== "ALL") {
    andConditions.push({
      enrollmentStatus: filters.studentStatus,
    });
  }

  return andConditions.length === 1 ? andConditions[0] : { AND: andConditions };
}

async function getStudentGrades(
  studentViewMode: StudentViewMode,
  gradeScopeId?: string | null,
) {
  return prisma.grade.findMany({
    where: {
      ...getStudentGradeWhere(studentViewMode),
      ...(gradeScopeId ? { id: gradeScopeId } : {}),
    },
    orderBy:
      studentViewMode === "archived"
        ? [{ graduationYear: "desc" }, { enrollmentYear: "desc" }, { name: "desc" }]
        : [{ enrollmentYear: "asc" }, { name: "asc" }],
    include: {
      classes: {
        orderBy: { name: "asc" },
      },
    },
  });
}

export async function getPeopleManagementData(
  filters: PeopleFilters,
  options: PeopleQueryOptions = {},
) {
  const gradeScopeId = options.gradeScopeId ?? null;
  const includeTeacherData = options.includeTeacherData ?? true;
  const includeStudentData = options.includeStudentData ?? true;
  const studentViewMode = options.studentViewMode ?? "active";
  const teacherWhere = buildTeacherWhere(
    filters,
    options.teacherDepartmentScopeIds ?? [],
  );
  const studentWhere = buildStudentWhere(filters, gradeScopeId, studentViewMode);
  const [
    teachers,
    students,
    teacherCount,
    studentCount,
    departments,
    subjects,
    studentGrades,
    teacherProfileFields,
    studentProfileFields,
  ] = await Promise.all([
    includeTeacherData
      ? prisma.teacher.findMany({
          where: teacherWhere,
          orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
          take: 80,
          include: {
            department: true,
            departmentAssignments: {
              include: {
                department: true,
                position: true,
              },
              orderBy: [{ department: { name: "asc" } }],
            },
            subject: true,
          },
        })
      : Promise.resolve([]),
    includeStudentData
      ? prisma.student.findMany({
          where: studentWhere,
          orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
          take: 120,
          include: {
            grade: true,
            class: true,
          },
        })
      : Promise.resolve([]),
    includeTeacherData
      ? prisma.teacher.count({
          where: teacherWhere,
        })
      : Promise.resolve(0),
    includeStudentData
      ? prisma.student.count({
          where: studentWhere,
        })
      : Promise.resolve(0),
    includeTeacherData
      ? prisma.department.findMany({
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    includeTeacherData
      ? prisma.subject.findMany({
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    includeStudentData
      ? getStudentGrades(studentViewMode, gradeScopeId)
      : Promise.resolve([]),
    includeTeacherData
      ? getProfileFieldDefinitions("TEACHER")
      : Promise.resolve([]),
    getProfileFieldDefinitions("STUDENT"),
  ]);
  const gradeOptions = studentGrades;
  const classOptions = flattenClassOptions(studentGrades);

  return {
    teachers,
    students,
    teacherCount,
    studentCount,
    departments,
    subjects,
    gradeOptions,
    classOptions,
    teacherProfileFields,
    studentProfileFields,
  };
}

export async function getStudentQuickSearchData(
  filters: PeopleFilters,
  options: {
    gradeScopeId?: string | null;
    shouldSearch?: boolean;
  } = {},
) {
  const gradeScopeId = options.gradeScopeId ?? null;
  const shouldSearch = options.shouldSearch ?? false;
  const normalizedKeyword = normalizeQuickSearchKeyword(filters.studentKeyword);
  const [studentGrades, studentProfileFields] =
    await Promise.all([
      getStudentGrades("active", gradeScopeId),
      getProfileFieldDefinitions("STUDENT", { activeOnly: true }),
    ]);
  const dormitoryFieldIds = studentProfileFields
    .filter((field) => field.name.includes("宿舍"))
    .map((field) => field.id);
  const studentWhere = buildStudentWhere(
    {
      ...filters,
      studentKeyword: "",
    },
    gradeScopeId,
    "active",
  );
  const [candidateStudents] =
    await Promise.all([
      shouldSearch
        ? prisma.student.findMany({
            where: studentWhere,
            orderBy: [
              { grade: { enrollmentYear: "asc" } },
              { class: { name: "asc" } },
              { name: "asc" },
            ],
            take: 40,
            include: {
              grade: true,
              class: true,
            },
          })
        : Promise.resolve([]),
    ]);

  const matchedStudents = shouldSearch
    ? candidateStudents.filter((student) =>
        matchesStudentQuickSearchKeyword(student, normalizedKeyword, dormitoryFieldIds),
      )
    : [];
  const students = matchedStudents.slice(0, 40);
  const studentCount = matchedStudents.length;

  return {
    students,
    studentCount,
    gradeOptions: studentGrades,
    classOptions: flattenClassOptions(studentGrades),
    studentProfileFields,
  };
}

export async function getTeachersForExport(
  filters: PeopleFilters,
  departmentScopeIds: string[] = [],
) {
  return prisma.teacher.findMany({
    where: buildTeacherWhere(filters, departmentScopeIds),
    orderBy: [{ department: { name: "asc" } }, { subject: { name: "asc" } }, { name: "asc" }],
    take: 5000,
    include: {
      department: true,
      departmentAssignments: {
        include: {
          department: true,
          position: true,
        },
        orderBy: [{ department: { name: "asc" } }],
      },
      subject: true,
    },
  });
}

export async function getStudentsForExport(
  filters: PeopleFilters,
  gradeScopeId?: string | null,
  studentViewMode: StudentViewMode = "active",
) {
  return prisma.student.findMany({
    where: buildStudentWhere(filters, gradeScopeId, studentViewMode),
    orderBy:
      studentViewMode === "archived"
        ? [
            { grade: { graduationYear: "desc" } },
            { grade: { enrollmentYear: "desc" } },
            { class: { name: "asc" } },
            { name: "asc" },
          ]
        : [
            { grade: { enrollmentYear: "asc" } },
            { grade: { name: "asc" } },
            { class: { name: "asc" } },
            { name: "asc" },
          ],
    take: 10000,
    include: {
      grade: true,
      class: true,
    },
  });
}
