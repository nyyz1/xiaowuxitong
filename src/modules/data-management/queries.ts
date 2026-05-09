import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DATA_MANAGEMENT_PAGE_SIZE,
  MANAGED_TABLE_KEYS,
  type ManagedTableKey,
  managedTableDefinitions,
} from "@/modules/data-management/definitions";

export type DataManagementRow = {
  id: string;
  title: string;
  subtitle: string;
  cells: { label: string; value: string }[];
};

export type DataManagementTableData = {
  table: ManagedTableKey;
  q: string;
  page: number;
  total: number;
  pageSize: number;
  rows: DataManagementRow[];
};

export type TableImpactPreview = {
  label: string;
  value: number;
};

function normalizeSearch(value: string | undefined) {
  return value?.trim() ?? "";
}

function stringContains(q: string) {
  return {
    contains: q,
  };
}

function maybeDate(value: Date | null | undefined) {
  if (!value) {
    return "-";
  }

  return value.toISOString().slice(0, 10);
}

function maybeDateTime(value: Date | null | undefined) {
  if (!value) {
    return "-";
  }

  return value.toISOString().replace("T", " ").slice(0, 19);
}

function boolText(value: boolean) {
  return value ? "是" : "否";
}

function teacherWhere(q: string): Prisma.TeacherWhereInput {
  if (!q) {
    return {};
  }

  return {
    OR: [
      { name: stringContains(q) },
      { idCardNumber: stringContains(q) },
      { employeeNumber: stringContains(q) },
      { phone: stringContains(q) },
      { remarks: stringContains(q) },
    ],
  };
}

function studentWhere(q: string, isArchived: boolean): Prisma.StudentWhereInput {
  const base: Prisma.StudentWhereInput = {
    isArchived,
  };

  if (!q) {
    return base;
  }

  return {
    ...base,
    OR: [
      { name: stringContains(q) },
      { idCardNumber: stringContains(q) },
      { studentNumber: stringContains(q) },
      { phone: stringContains(q) },
      { guardianContact: stringContains(q) },
      { remarks: stringContains(q) },
      { grade: { name: stringContains(q) } },
      { class: { name: stringContains(q) } },
    ],
  };
}

function auditWhere(q: string): Prisma.AuditLogWhereInput {
  if (!q) {
    return {};
  }

  return {
    OR: [
      { action: stringContains(q) },
      { targetType: stringContains(q) },
      { targetId: stringContains(q) },
      { summary: stringContains(q) },
    ],
  };
}

function relationSearchWhere(q: string): Prisma.TeacherDepartmentAssignmentWhereInput {
  if (!q) {
    return {};
  }

  return {
    OR: [
      { teacher: { name: stringContains(q) } },
      { department: { name: stringContains(q) } },
    ],
  };
}

async function queryRows(table: ManagedTableKey, q: string, page: number) {
  const skip = (page - 1) * DATA_MANAGEMENT_PAGE_SIZE;
  const take = DATA_MANAGEMENT_PAGE_SIZE;

  switch (table) {
    case "teacher": {
      const where = teacherWhere(q);
      const [total, rows] = await Promise.all([
        prisma.teacher.count({ where }),
        prisma.teacher.findMany({
          where,
          orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
          skip,
          take,
          include: {
            subject: true,
            departmentAssignments: {
              include: {
                department: true,
              },
            },
          },
        }),
      ]);

      return {
        total,
        rows: rows.map((teacher) => ({
          id: teacher.id,
          title: teacher.name,
          subtitle: teacher.idCardNumber ?? "无身份证号",
          cells: [
            { label: "工号", value: teacher.employeeNumber },
            { label: "状态", value: teacher.employmentStatus },
            { label: "学科", value: teacher.subject?.name ?? "-" },
            {
              label: "部门",
              value:
                teacher.departmentAssignments
                  .map((item) => item.department.name)
                  .join("、") || "-",
            },
          ],
        })),
      };
    }
    case "activeStudent":
    case "archivedStudent": {
      const where = studentWhere(q, table === "archivedStudent");
      const [total, rows] = await Promise.all([
        prisma.student.count({ where }),
        prisma.student.findMany({
          where,
          orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
          skip,
          take,
          include: {
            grade: true,
            class: true,
          },
        }),
      ]);

      return {
        total,
        rows: rows.map((student) => ({
          id: student.id,
          title: student.name,
          subtitle: student.idCardNumber ?? "无身份证号",
          cells: [
            { label: "学籍号", value: student.studentNumber },
            { label: "状态", value: student.enrollmentStatus },
            { label: "年级", value: student.grade.name },
            { label: "班级", value: student.class?.name ?? "-" },
          ],
        })),
      };
    }
    case "teacherDepartmentAssignment": {
      const where = relationSearchWhere(q);
      const [total, rows] = await Promise.all([
        prisma.teacherDepartmentAssignment.count({ where }),
        prisma.teacherDepartmentAssignment.findMany({
          where,
          orderBy: [{ createdAt: "desc" }],
          skip,
          take,
          include: {
            teacher: true,
            department: true,
          },
        }),
      ]);

      return {
        total,
        rows: rows.map((item) => ({
          id: `${item.teacherId}::${item.departmentId}`,
          title: `${item.teacher.name} / ${item.department.name}`,
          subtitle: "教师部门关联",
          cells: [
            { label: "教师", value: item.teacher.name },
            { label: "部门", value: item.department.name },
            { label: "创建时间", value: maybeDateTime(item.createdAt) },
          ],
        })),
      };
    }
    case "inspectionRecord": {
      const where: Prisma.InspectionRecordWhereInput = q
        ? {
            OR: [
              { remarks: stringContains(q) },
              { inspectionItem: { name: stringContains(q) } },
              { grade: { name: stringContains(q) } },
              { class: { name: stringContains(q) } },
              { teacher: { name: stringContains(q) } },
            ],
          }
        : {};
      const [total, rows] = await Promise.all([
        prisma.inspectionRecord.count({ where }),
        prisma.inspectionRecord.findMany({
          where,
          orderBy: [{ inspectionDate: "desc" }, { updatedAt: "desc" }],
          skip,
          take,
          include: {
            inspectionItem: {
              include: {
                category: true,
              },
            },
            grade: true,
            class: true,
            teacher: true,
          },
        }),
      ]);

      return {
        total,
        rows: rows.map((record) => ({
          id: record.id,
          title: `${maybeDate(record.inspectionDate)} / ${record.inspectionItem.name}`,
          subtitle:
            record.teacher?.name ??
            ([record.grade?.name, record.class?.name].filter(Boolean).join(" / ") ||
              "未绑定对象"),
          cells: [
            { label: "类型", value: record.inspectionItem.category.targetType },
            { label: "数值", value: String(record.value) },
            { label: "备注", value: record.remarks ?? "-" },
          ],
        })),
      };
    }
    case "inspectionCategory": {
      const where: Prisma.InspectionCategoryWhereInput = q
        ? { name: stringContains(q) }
        : {};
      const [total, rows] = await Promise.all([
        prisma.inspectionCategory.count({ where }),
        prisma.inspectionCategory.findMany({
          where,
          orderBy: [{ targetType: "asc" }, { name: "asc" }],
          skip,
          take,
          include: {
            _count: {
              select: {
                items: true,
              },
            },
          },
        }),
      ]);

      return {
        total,
        rows: rows.map((category) => ({
          id: category.id,
          title: category.name,
          subtitle: category.targetType,
          cells: [{ label: "检查项目数", value: String(category._count.items) }],
        })),
      };
    }
    case "inspectionItem": {
      const where: Prisma.InspectionItemWhereInput = q
        ? {
            OR: [
              { name: stringContains(q) },
              { description: stringContains(q) },
              { category: { name: stringContains(q) } },
            ],
          }
        : {};
      const [total, rows] = await Promise.all([
        prisma.inspectionItem.count({ where }),
        prisma.inspectionItem.findMany({
          where,
          orderBy: [{ categoryId: "asc" }, { name: "asc" }],
          skip,
          take,
          include: {
            category: true,
            _count: {
              select: {
                records: true,
              },
            },
          },
        }),
      ]);

      return {
        total,
        rows: rows.map((item) => ({
          id: item.id,
          title: item.name,
          subtitle: item.category.name,
          cells: [
            { label: "类型", value: item.category.targetType },
            { label: "数值类型", value: item.valueType },
            { label: "启用", value: boolText(item.isActive) },
            { label: "记录数", value: String(item._count.records) },
          ],
        })),
      };
    }
    case "grade": {
      const where: Prisma.GradeWhereInput = q ? { name: stringContains(q) } : {};
      const [total, rows] = await Promise.all([
        prisma.grade.count({ where }),
        prisma.grade.findMany({
          where,
          orderBy: [{ enrollmentYear: "desc" }, { name: "asc" }],
          skip,
          take,
          include: {
            academicYear: true,
            _count: {
              select: {
                classes: true,
                students: true,
                inspections: true,
              },
            },
          },
        }),
      ]);

      return {
        total,
        rows: rows.map((grade) => ({
          id: grade.id,
          title: grade.name,
          subtitle: grade.academicYear.name,
          cells: [
            { label: "入学年", value: grade.enrollmentYear?.toString() ?? "-" },
            { label: "前台可见", value: boolText(grade.isVisibleInMain) },
            { label: "班级", value: String(grade._count.classes) },
            { label: "学生", value: String(grade._count.students) },
            { label: "检查记录", value: String(grade._count.inspections) },
          ],
        })),
      };
    }
    case "class": {
      const where: Prisma.ClassWhereInput = q
        ? {
            OR: [{ name: stringContains(q) }, { grade: { name: stringContains(q) } }],
          }
        : {};
      const [total, rows] = await Promise.all([
        prisma.class.count({ where }),
        prisma.class.findMany({
          where,
          orderBy: [{ gradeId: "asc" }, { name: "asc" }],
          skip,
          take,
          include: {
            grade: true,
            _count: {
              select: {
                students: true,
                inspections: true,
              },
            },
          },
        }),
      ]);

      return {
        total,
        rows: rows.map((classItem) => ({
          id: classItem.id,
          title: classItem.name,
          subtitle: classItem.grade.name,
          cells: [
            { label: "学生", value: String(classItem._count.students) },
            { label: "检查记录", value: String(classItem._count.inspections) },
          ],
        })),
      };
    }
    case "department": {
      const where: Prisma.DepartmentWhereInput = q ? { name: stringContains(q) } : {};
      const [total, rows] = await Promise.all([
        prisma.department.count({ where }),
        prisma.department.findMany({
          where,
          orderBy: [{ name: "asc" }],
          skip,
          take,
          include: {
            _count: {
              select: {
                teachers: true,
                teacherAssignments: true,
              },
            },
          },
        }),
      ]);

      return {
        total,
        rows: rows.map((department) => ({
          id: department.id,
          title: department.name,
          subtitle: "部门",
          cells: [
            { label: "主部门教师", value: String(department._count.teachers) },
            { label: "部门关联", value: String(department._count.teacherAssignments) },
          ],
        })),
      };
    }
    case "subject": {
      const where: Prisma.SubjectWhereInput = q ? { name: stringContains(q) } : {};
      const [total, rows] = await Promise.all([
        prisma.subject.count({ where }),
        prisma.subject.findMany({
          where,
          orderBy: [{ name: "asc" }],
          skip,
          take,
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
        total,
        rows: rows.map((subject) => ({
          id: subject.id,
          title: subject.name,
          subtitle: "学科",
          cells: [{ label: "教师", value: String(subject._count.teachers) }],
        })),
      };
    }
    case "academicYear": {
      const where: Prisma.AcademicYearWhereInput = q
        ? { name: stringContains(q) }
        : {};
      const [total, rows] = await Promise.all([
        prisma.academicYear.count({ where }),
        prisma.academicYear.findMany({
          where,
          orderBy: [{ startDate: "desc" }, { name: "asc" }],
          skip,
          take,
          include: {
            _count: {
              select: {
                grades: true,
              },
            },
          },
        }),
      ]);

      return {
        total,
        rows: rows.map((year) => ({
          id: year.id,
          title: year.name,
          subtitle: year.isCurrent ? "当前兼容层" : "历史兼容层",
          cells: [
            { label: "开始", value: maybeDate(year.startDate) },
            { label: "结束", value: maybeDate(year.endDate) },
            { label: "年级", value: String(year._count.grades) },
          ],
        })),
      };
    }
    case "profileFieldDefinition": {
      const where: Prisma.ProfileFieldDefinitionWhereInput = q
        ? {
            OR: [{ name: stringContains(q) }, { fieldKey: stringContains(q) }],
          }
        : {};
      const [total, rows] = await Promise.all([
        prisma.profileFieldDefinition.count({ where }),
        prisma.profileFieldDefinition.findMany({
          where,
          orderBy: [{ targetType: "asc" }, { sortOrder: "asc" }],
          skip,
          take,
        }),
      ]);

      return {
        total,
        rows: rows.map((field) => ({
          id: field.id,
          title: field.name,
          subtitle: field.targetType,
          cells: [
            { label: "系统字段", value: field.fieldKey ?? "-" },
            { label: "启用", value: boolText(field.isActive) },
            { label: "已删除", value: boolText(field.isDeleted) },
          ],
        })),
      };
    }
    case "auditLog": {
      const where = auditWhere(q);
      const [total, rows] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          orderBy: [{ createdAt: "desc" }],
          skip,
          take,
          include: {
            actor: true,
          },
        }),
      ]);

      return {
        total,
        rows: rows.map((log) => ({
          id: log.id,
          title: log.action,
          subtitle: maybeDateTime(log.createdAt),
          cells: [
            { label: "对象", value: log.targetType },
            { label: "对象 ID", value: log.targetId ?? "-" },
            { label: "操作者", value: log.actor?.displayName ?? "系统/兜底账号" },
            { label: "摘要", value: log.summary },
          ],
        })),
      };
    }
  }
}

async function countAllTables() {
  const [
    teacher,
    activeStudent,
    archivedStudent,
    teacherDepartmentAssignment,
    inspectionRecord,
    inspectionCategory,
    inspectionItem,
    grade,
    classCount,
    department,
    subject,
    academicYear,
    profileFieldDefinition,
    auditLog,
  ] = await Promise.all([
    prisma.teacher.count(),
    prisma.student.count({ where: { isArchived: false } }),
    prisma.student.count({ where: { isArchived: true } }),
    prisma.teacherDepartmentAssignment.count(),
    prisma.inspectionRecord.count(),
    prisma.inspectionCategory.count(),
    prisma.inspectionItem.count(),
    prisma.grade.count(),
    prisma.class.count(),
    prisma.department.count(),
    prisma.subject.count(),
    prisma.academicYear.count(),
    prisma.profileFieldDefinition.count(),
    prisma.auditLog.count(),
  ]);

  return {
    teacher,
    activeStudent,
    archivedStudent,
    teacherDepartmentAssignment,
    inspectionRecord,
    inspectionCategory,
    inspectionItem,
    grade,
    class: classCount,
    department,
    subject,
    academicYear,
    profileFieldDefinition,
    auditLog,
  } satisfies Record<ManagedTableKey, number>;
}

export async function getDataManagementPageData(input: {
  table?: string;
  q?: string;
  page?: string;
}) {
  const table = MANAGED_TABLE_KEYS.includes(input.table as ManagedTableKey)
    ? (input.table as ManagedTableKey)
    : "teacher";
  const q = normalizeSearch(input.q);
  const pageValue = Number.parseInt(input.page ?? "1", 10);
  const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
  const [tableCounts, tableData, impactPreview] = await Promise.all([
    countAllTables(),
    queryRows(table, q, page),
    getTableImpactPreview(table),
  ]);

  return {
    tableCounts,
    tableData: {
      ...tableData,
      table,
      q,
      page,
      pageSize: DATA_MANAGEMENT_PAGE_SIZE,
    } satisfies DataManagementTableData,
    currentDefinition: managedTableDefinitions[table],
    impactPreview,
  };
}

export async function getTableImpactPreview(table: ManagedTableKey) {
  switch (table) {
    case "teacher":
      return [
        { label: "教师部门关联", value: await prisma.teacherDepartmentAssignment.count() },
        {
          label: "教师量化记录将解除教师绑定",
          value: await prisma.inspectionRecord.count({ where: { teacherId: { not: null } } }),
        },
      ];
    case "activeStudent":
      return [
        {
          label: "在校学生",
          value: await prisma.student.count({ where: { isArchived: false } }),
        },
      ];
    case "archivedStudent":
      return [
        {
          label: "往届学生",
          value: await prisma.student.count({ where: { isArchived: true } }),
        },
      ];
    case "inspectionCategory":
      return [
        { label: "检查项目", value: await prisma.inspectionItem.count() },
        { label: "检查记录", value: await prisma.inspectionRecord.count() },
      ];
    case "inspectionItem":
      return [{ label: "检查记录", value: await prisma.inspectionRecord.count() }];
    case "grade":
      return [
        { label: "班级", value: await prisma.class.count() },
        { label: "学生", value: await prisma.student.count() },
        { label: "检查记录将解除年级绑定", value: await prisma.inspectionRecord.count() },
      ];
    case "class":
      return [
        {
          label: "学生将解除班级绑定",
          value: await prisma.student.count({ where: { classId: { not: null } } }),
        },
        {
          label: "检查记录将解除班级绑定",
          value: await prisma.inspectionRecord.count({ where: { classId: { not: null } } }),
        },
      ];
    case "department":
      return [
        { label: "教师部门关联", value: await prisma.teacherDepartmentAssignment.count() },
        {
          label: "教师主部门将解除绑定",
          value: await prisma.teacher.count({ where: { departmentId: { not: null } } }),
        },
      ];
    case "subject":
      return [
        {
          label: "教师学科将解除绑定",
          value: await prisma.teacher.count({ where: { subjectId: { not: null } } }),
        },
      ];
    case "academicYear":
      return [
        { label: "年级", value: await prisma.grade.count() },
        { label: "班级", value: await prisma.class.count() },
        { label: "学生", value: await prisma.student.count() },
      ];
    case "profileFieldDefinition":
      return [
        { label: "教师档案动态字段值", value: await prisma.teacher.count() },
        { label: "学生档案动态字段值", value: await prisma.student.count() },
      ];
    default:
      return [];
  }
}
