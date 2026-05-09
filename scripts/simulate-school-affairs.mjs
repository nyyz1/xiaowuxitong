import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import * as XLSX from "xlsx";
import { buildDemoDataset, isoDate } from "./demo-data.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const dbPath = path.join(projectRoot, ".tmp", "pglite-school-affairs");
const outputDir = path.join(projectRoot, "outputs", "simulation");

const targetTypeLabels = {
  STUDENT: "学生量化",
  TEACHER: "教师量化",
};

async function resetSchema(db) {
  await db.exec(`
    DROP TABLE IF EXISTS "AuditLog" CASCADE;
    DROP TABLE IF EXISTS "InspectionRecord" CASCADE;
    DROP TABLE IF EXISTS "InspectionItem" CASCADE;
    DROP TABLE IF EXISTS "InspectionCategory" CASCADE;
    DROP TABLE IF EXISTS "TeacherDepartmentAssignment" CASCADE;
    DROP TABLE IF EXISTS "ProfileFieldDefinition" CASCADE;
    DROP TABLE IF EXISTS "Student" CASCADE;
    DROP TABLE IF EXISTS "Teacher" CASCADE;
    DROP TABLE IF EXISTS "Subject" CASCADE;
    DROP TABLE IF EXISTS "Department" CASCADE;
    DROP TABLE IF EXISTS "Class" CASCADE;
    DROP TABLE IF EXISTS "Grade" CASCADE;
    DROP TABLE IF EXISTS "AcademicYear" CASCADE;
    DROP TABLE IF EXISTS "User" CASCADE;
    DROP TYPE IF EXISTS "InspectionTargetType" CASCADE;
    DROP TYPE IF EXISTS "ProfileFieldTargetType" CASCADE;
    DROP TYPE IF EXISTS "GradeStage" CASCADE;
    DROP TYPE IF EXISTS "InspectionValueType" CASCADE;
    DROP TYPE IF EXISTS "UserRole" CASCADE;

    CREATE TYPE "UserRole" AS ENUM (
      'SYSTEM_ADMIN',
      'SCHOOL_LEADER',
      'GRADE_MANAGER',
      'DATA_MANAGER',
      'INSPECTION_STAFF'
    );

    CREATE TYPE "InspectionValueType" AS ENUM (
      'SCORE',
      'COUNT',
      'DEDUCTION'
    );

    CREATE TYPE "InspectionTargetType" AS ENUM (
      'STUDENT',
      'TEACHER'
    );

    CREATE TYPE "ProfileFieldTargetType" AS ENUM (
      'TEACHER',
      'STUDENT'
    );

    CREATE TYPE "GradeStage" AS ENUM (
      'HIGH_ONE',
      'HIGH_TWO',
      'HIGH_THREE',
      'ALUMNI'
    );

    CREATE TABLE "User" (
      "id" TEXT PRIMARY KEY,
      "username" TEXT NOT NULL UNIQUE,
      "displayName" TEXT NOT NULL,
      "passwordHash" TEXT,
      "role" "UserRole" NOT NULL DEFAULT 'DATA_MANAGER',
      "managedGradeId" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE "AcademicYear" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL UNIQUE,
      "startDate" TIMESTAMPTZ,
      "endDate" TIMESTAMPTZ,
      "isCurrent" BOOLEAN NOT NULL DEFAULT FALSE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE "Grade" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "academicYearId" TEXT NOT NULL REFERENCES "AcademicYear"("id") ON DELETE RESTRICT,
      "stage" "GradeStage",
      "enrollmentYear" INTEGER,
      "isVisibleInMain" BOOLEAN NOT NULL DEFAULT TRUE,
      "graduationYear" INTEGER,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE ("academicYearId", "name"),
      UNIQUE ("academicYearId", "enrollmentYear")
    );

    CREATE TABLE "Class" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "gradeId" TEXT NOT NULL REFERENCES "Grade"("id") ON DELETE RESTRICT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE ("gradeId", "name")
    );

    CREATE TABLE "Department" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL UNIQUE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE "Subject" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL UNIQUE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE "Teacher" (
      "id" TEXT PRIMARY KEY,
      "idCardNumber" TEXT UNIQUE,
      "employeeNumber" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "gender" TEXT,
      "departmentId" TEXT REFERENCES "Department"("id") ON DELETE SET NULL,
      "subjectId" TEXT REFERENCES "Subject"("id") ON DELETE SET NULL,
      "duties" TEXT[] NOT NULL DEFAULT '{}',
      "profileData" JSONB NOT NULL DEFAULT '{}'::jsonb,
      "phone" TEXT,
      "employmentStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
      "remarks" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE "TeacherDepartmentAssignment" (
      "teacherId" TEXT NOT NULL REFERENCES "Teacher"("id") ON DELETE CASCADE,
      "departmentId" TEXT NOT NULL REFERENCES "Department"("id") ON DELETE RESTRICT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY ("teacherId", "departmentId")
    );

    CREATE TABLE "Student" (
      "id" TEXT PRIMARY KEY,
      "idCardNumber" TEXT UNIQUE,
      "studentNumber" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "gender" TEXT,
      "gradeId" TEXT NOT NULL REFERENCES "Grade"("id") ON DELETE RESTRICT,
      "classId" TEXT REFERENCES "Class"("id") ON DELETE SET NULL,
      "enrollmentStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
      "isArchived" BOOLEAN NOT NULL DEFAULT FALSE,
      "archivedAt" TIMESTAMPTZ,
      "profileData" JSONB NOT NULL DEFAULT '{}'::jsonb,
      "phone" TEXT,
      "guardianContact" TEXT,
      "remarks" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE "ProfileFieldDefinition" (
      "id" TEXT PRIMARY KEY,
      "targetType" "ProfileFieldTargetType" NOT NULL,
      "fieldKey" TEXT,
      "name" TEXT NOT NULL,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
      "isDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE ("targetType", "name"),
      UNIQUE ("targetType", "fieldKey")
    );

    CREATE TABLE "InspectionCategory" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "targetType" "InspectionTargetType" NOT NULL DEFAULT 'STUDENT',
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE ("targetType", "name")
    );

    CREATE TABLE "InspectionItem" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "categoryId" TEXT NOT NULL REFERENCES "InspectionCategory"("id") ON DELETE RESTRICT,
      "valueType" "InspectionValueType" NOT NULL DEFAULT 'SCORE',
      "description" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE ("categoryId", "name")
    );

    CREATE TABLE "InspectionRecord" (
      "id" TEXT PRIMARY KEY,
      "inspectionDate" TIMESTAMPTZ NOT NULL,
      "inspectionItemId" TEXT NOT NULL REFERENCES "InspectionItem"("id") ON DELETE RESTRICT,
      "gradeId" TEXT REFERENCES "Grade"("id") ON DELETE SET NULL,
      "classId" TEXT REFERENCES "Class"("id") ON DELETE SET NULL,
      "teacherId" TEXT REFERENCES "Teacher"("id") ON DELETE SET NULL,
      "recordedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
      "value" DOUBLE PRECISION NOT NULL,
      "remarks" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE "AuditLog" (
      "id" TEXT PRIMARY KEY,
      "actorId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
      "action" TEXT NOT NULL,
      "targetType" TEXT NOT NULL,
      "targetId" TEXT,
      "summary" TEXT NOT NULL,
      "metadata" JSONB,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX "InspectionCategory_targetType_idx" ON "InspectionCategory"("targetType");
    CREATE INDEX "ProfileFieldDefinition_targetType_idx" ON "ProfileFieldDefinition"("targetType", "isActive", "sortOrder");
    CREATE INDEX "InspectionRecord_inspectionDate_idx" ON "InspectionRecord"("inspectionDate");
    CREATE INDEX "InspectionRecord_inspectionItemId_idx" ON "InspectionRecord"("inspectionItemId");
    CREATE INDEX "InspectionRecord_gradeId_idx" ON "InspectionRecord"("gradeId");
    CREATE INDEX "InspectionRecord_classId_idx" ON "InspectionRecord"("classId");
    CREATE INDEX "InspectionRecord_teacherId_idx" ON "InspectionRecord"("teacherId");
    CREATE INDEX "AuditLog_target_idx" ON "AuditLog"("targetType", "targetId");
  `);
}

async function insertMany(db, tableName, columns, rows) {
  for (const row of rows) {
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
    const quotedColumns = columns.map((column) => `"${column}"`).join(", ");
    await db.query(
      `INSERT INTO "${tableName}" (${quotedColumns}) VALUES (${placeholders})`,
      columns.map((column) => row[column]),
    );
  }
}

function buildTeacherDepartmentAssignments(teachers) {
  return teachers.flatMap((teacher) =>
    (teacher.departmentIds ?? []).map((departmentId) => ({
      teacherId: teacher.id,
      departmentId,
      createdAt: new Date().toISOString(),
    })),
  );
}

async function seedDemoData(db) {
  const dataset = buildDemoDataset();

  await insertMany(
    db,
    "User",
    ["id", "username", "displayName", "role", "managedGradeId", "isActive"],
    dataset.users,
  );
  await insertMany(
    db,
    "AcademicYear",
    ["id", "name", "startDate", "endDate", "isCurrent"],
    dataset.academicYears.map((year) => ({
      ...year,
      startDate: isoDate(year.startDate),
      endDate: isoDate(year.endDate),
    })),
  );
  await insertMany(
    db,
    "Grade",
    [
      "id",
      "name",
      "academicYearId",
      "stage",
      "enrollmentYear",
      "isVisibleInMain",
      "graduationYear",
    ],
    dataset.grades,
  );
  await insertMany(db, "Class", ["id", "name", "gradeId"], dataset.classes);
  await insertMany(db, "Department", ["id", "name"], dataset.departments);
  await insertMany(db, "Subject", ["id", "name"], dataset.subjects);
  await insertMany(
    db,
    "ProfileFieldDefinition",
    ["id", "targetType", "fieldKey", "name", "sortOrder", "isActive", "isDeleted"],
    dataset.profileFieldDefinitions,
  );
  await insertMany(
    db,
    "Teacher",
    [
      "id",
      "idCardNumber",
      "employeeNumber",
      "name",
      "gender",
      "departmentId",
      "subjectId",
      "duties",
      "profileData",
      "phone",
      "employmentStatus",
      "remarks",
    ],
    dataset.teachers.map((teacher) => ({
      ...teacher,
      profileData: JSON.stringify(teacher.profileData ?? {}),
    })),
  );
  await insertMany(
    db,
    "TeacherDepartmentAssignment",
    ["teacherId", "departmentId", "createdAt"],
    buildTeacherDepartmentAssignments(dataset.teachers),
  );
  await insertMany(
    db,
    "Student",
    [
      "id",
      "idCardNumber",
      "studentNumber",
      "name",
      "gender",
      "gradeId",
      "classId",
      "enrollmentStatus",
      "isArchived",
      "archivedAt",
      "profileData",
      "phone",
      "guardianContact",
      "remarks",
    ],
    dataset.students.map((student) => ({
      ...student,
      profileData: JSON.stringify(student.profileData ?? {}),
    })),
  );
  await insertMany(
    db,
    "InspectionCategory",
    ["id", "name", "targetType"],
    dataset.inspectionCategories,
  );
  await insertMany(
    db,
    "InspectionItem",
    ["id", "categoryId", "name", "valueType", "description"],
    dataset.inspectionItems,
  );
  await insertMany(
    db,
    "InspectionRecord",
    [
      "id",
      "inspectionDate",
      "inspectionItemId",
      "gradeId",
      "classId",
      "teacherId",
      "recordedById",
      "value",
      "remarks",
    ],
    dataset.inspectionRecords.map((record) => ({
      ...record,
      inspectionDate: isoDate(record.inspectionDate),
    })),
  );

  return dataset;
}

async function getCounts(db) {
  const tables = [
    "User",
    "AcademicYear",
    "Grade",
    "Class",
    "Department",
    "Subject",
    "ProfileFieldDefinition",
    "Teacher",
    "TeacherDepartmentAssignment",
    "Student",
    "InspectionCategory",
    "InspectionItem",
    "InspectionRecord",
    "AuditLog",
  ];
  const counts = {};

  for (const table of tables) {
    const result = await db.query(`SELECT COUNT(*)::int AS count FROM "${table}"`);
    counts[table] = result.rows[0].count;
  }

  return counts;
}

async function getSummaries(db, targetType) {
  const filterCondition =
    targetType === "STUDENT"
      ? `ic."targetType" = 'STUDENT' AND g."isVisibleInMain" = TRUE`
      : `ic."targetType" = 'TEACHER'`;

  const scopeQuery =
    targetType === "STUDENT"
      ? `
        SELECT
          g."name" || ' / ' || COALESCE(c."name", '全年级') AS "label",
          CASE WHEN c."id" IS NULL THEN '全年级' ELSE '班级' END AS "subLabel",
          COUNT(*)::int AS "recordCount",
          ROUND(SUM(ir."value")::numeric, 2)::float AS "totalValue",
          ROUND(AVG(ir."value")::numeric, 2)::float AS "averageValue",
          MIN(ir."value")::float AS "minValue",
          MAX(ir."value")::float AS "maxValue"
        FROM "InspectionRecord" ir
        JOIN "InspectionItem" ii ON ii."id" = ir."inspectionItemId"
        JOIN "InspectionCategory" ic ON ic."id" = ii."categoryId"
        JOIN "Grade" g ON g."id" = ir."gradeId"
        LEFT JOIN "Class" c ON c."id" = ir."classId"
        WHERE ${filterCondition}
        GROUP BY g."name", c."id", c."name"
        ORDER BY "recordCount" DESC, "label" ASC
      `
      : `
        SELECT
          t."name" || ' / ' || COALESCE(t."idCardNumber", '未填写身份证号') AS "label",
          COALESCE(d."name", '教师个人') AS "subLabel",
          COUNT(*)::int AS "recordCount",
          ROUND(SUM(ir."value")::numeric, 2)::float AS "totalValue",
          ROUND(AVG(ir."value")::numeric, 2)::float AS "averageValue",
          MIN(ir."value")::float AS "minValue",
          MAX(ir."value")::float AS "maxValue"
        FROM "InspectionRecord" ir
        JOIN "InspectionItem" ii ON ii."id" = ir."inspectionItemId"
        JOIN "InspectionCategory" ic ON ic."id" = ii."categoryId"
        JOIN "Teacher" t ON t."id" = ir."teacherId"
        LEFT JOIN "Department" d ON d."id" = t."departmentId"
        WHERE ${filterCondition}
        GROUP BY t."id", t."name", t."idCardNumber", d."name"
        ORDER BY "recordCount" DESC, "label" ASC
      `;

  const [byItem, byScope, byDate, byValueType, kpis] = await Promise.all([
    db.query(`
      SELECT
        ic."name" || ' / ' || ii."name" AS "label",
        ii."valueType"::text AS "subLabel",
        COUNT(*)::int AS "recordCount",
        ROUND(SUM(ir."value")::numeric, 2)::float AS "totalValue",
        ROUND(AVG(ir."value")::numeric, 2)::float AS "averageValue",
        MIN(ir."value")::float AS "minValue",
        MAX(ir."value")::float AS "maxValue"
      FROM "InspectionRecord" ir
      JOIN "InspectionItem" ii ON ii."id" = ir."inspectionItemId"
      JOIN "InspectionCategory" ic ON ic."id" = ii."categoryId"
      LEFT JOIN "Grade" g ON g."id" = ir."gradeId"
      WHERE ${filterCondition}
      GROUP BY ic."name", ii."name", ii."valueType"
      ORDER BY "recordCount" DESC, "label" ASC
    `),
    db.query(scopeQuery),
    db.query(`
      SELECT
        to_char(ir."inspectionDate", 'YYYY-MM-DD') AS "label",
        '按日期汇总' AS "subLabel",
        COUNT(*)::int AS "recordCount",
        ROUND(SUM(ir."value")::numeric, 2)::float AS "totalValue",
        ROUND(AVG(ir."value")::numeric, 2)::float AS "averageValue",
        MIN(ir."value")::float AS "minValue",
        MAX(ir."value")::float AS "maxValue"
      FROM "InspectionRecord" ir
      JOIN "InspectionItem" ii ON ii."id" = ir."inspectionItemId"
      JOIN "InspectionCategory" ic ON ic."id" = ii."categoryId"
      LEFT JOIN "Grade" g ON g."id" = ir."gradeId"
      WHERE ${filterCondition}
      GROUP BY to_char(ir."inspectionDate", 'YYYY-MM-DD')
      ORDER BY "label" ASC
    `),
    db.query(`
      SELECT
        ii."valueType"::text AS "label",
        '按结果类型汇总' AS "subLabel",
        COUNT(*)::int AS "recordCount",
        ROUND(SUM(ir."value")::numeric, 2)::float AS "totalValue",
        ROUND(AVG(ir."value")::numeric, 2)::float AS "averageValue",
        MIN(ir."value")::float AS "minValue",
        MAX(ir."value")::float AS "maxValue"
      FROM "InspectionRecord" ir
      JOIN "InspectionItem" ii ON ii."id" = ir."inspectionItemId"
      JOIN "InspectionCategory" ic ON ic."id" = ii."categoryId"
      LEFT JOIN "Grade" g ON g."id" = ir."gradeId"
      WHERE ${filterCondition}
      GROUP BY ii."valueType"
      ORDER BY "recordCount" DESC, "label" ASC
    `),
    db.query(`
      SELECT
        COUNT(*)::int AS "matchedRecords",
        ROUND(SUM(ir."value")::numeric, 2)::float AS "totalValue",
        ROUND(AVG(ir."value")::numeric, 2)::float AS "averageValue",
        MIN(ir."value")::float AS "minValue",
        MAX(ir."value")::float AS "maxValue"
      FROM "InspectionRecord" ir
      JOIN "InspectionItem" ii ON ii."id" = ir."inspectionItemId"
      JOIN "InspectionCategory" ic ON ic."id" = ii."categoryId"
      LEFT JOIN "Grade" g ON g."id" = ir."gradeId"
      WHERE ${filterCondition}
    `),
  ]);

  return {
    targetType,
    targetTypeLabel: targetTypeLabels[targetType],
    kpis: kpis.rows[0],
    byItem: byItem.rows,
    byScope: byScope.rows,
    byDate: byDate.rows,
    byValueType: byValueType.rows,
  };
}

function appendSheet(workbook, sheetName, rows) {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const width = rows[0]?.length ?? 1;

  worksheet["!cols"] = Array.from({ length: width }, (_, index) => ({
    wch: index <= 1 ? 28 : 14,
  }));

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
}

function summaryRows(rows, dimension) {
  return rows.map((row) => [
    dimension,
    row.label,
    row.subLabel ?? "",
    row.recordCount,
    row.totalValue,
    row.averageValue,
    row.minValue,
    row.maxValue,
  ]);
}

async function writeReportExports(targetType, summaries) {
  await fs.mkdir(outputDir, { recursive: true });

  const headers = [
    "统计维度",
    "名称",
    "补充说明",
    "记录数",
    "总值",
    "平均值",
    "最小值",
    "最大值",
  ];
  const workbook = XLSX.utils.book_new();
  const scopeDimension = targetType === "TEACHER" ? "教师" : "年级/班级";
  const scopeSheetName = targetType === "TEACHER" ? "按教师" : "按年级班级";

  appendSheet(workbook, "统计概览", [
    ["指标", "数值"],
    ["量化类型", targetTypeLabels[targetType]],
    ["匹配记录数", summaries.kpis.matchedRecords],
    ["总值", summaries.kpis.totalValue],
    ["平均值", summaries.kpis.averageValue],
    ["最小值", summaries.kpis.minValue],
    ["最大值", summaries.kpis.maxValue],
  ]);
  appendSheet(workbook, "按检查项目", [
    headers,
    ...summaryRows(summaries.byItem, "检查项目"),
  ]);
  appendSheet(workbook, scopeSheetName, [
    headers,
    ...summaryRows(summaries.byScope, scopeDimension),
  ]);
  appendSheet(workbook, "按日期", [headers, ...summaryRows(summaries.byDate, "日期")]);
  appendSheet(workbook, "按结果类型", [
    headers,
    ...summaryRows(summaries.byValueType, "结果类型"),
  ]);

  const prefix = targetType === "TEACHER" ? "teacher-quantification" : "student-quantification";
  const xlsxPath = path.join(outputDir, `${prefix}-report-simulation.xlsx`);
  const csvPath = path.join(outputDir, `${prefix}-report-simulation.csv`);
  const csvRows = [
    headers,
    ...summaryRows(summaries.byItem, "检查项目"),
    ...summaryRows(summaries.byScope, scopeDimension),
    ...summaryRows(summaries.byDate, "日期"),
    ...summaryRows(summaries.byValueType, "结果类型"),
  ];

  XLSX.writeFile(workbook, xlsxPath);
  await fs.writeFile(
    csvPath,
    `\uFEFF${csvRows
      .map((row) =>
        row
          .map((value) => {
            const text = String(value ?? "");
            return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
          })
          .join(","),
      )
      .join("\r\n")}`,
    "utf8",
  );

  return {
    xlsxPath,
    csvPath,
  };
}

async function recordExportAudit(db, summaryBundle) {
  await db.query(
    `
      INSERT INTO "AuditLog"
        ("id", "actorId", "action", "targetType", "summary", "metadata")
      VALUES
        ($1, $2, $3, $4, $5, $6::jsonb)
    `,
    [
      "audit-export-simulation-1",
      "user-leader-1",
      "EXPORT_INSPECTION_REPORT",
      "InspectionRecord",
      `模拟导出学生量化和教师量化统计，共匹配 ${
        summaryBundle.student.kpis.matchedRecords + summaryBundle.teacher.kpis.matchedRecords
      } 条记录。`,
      JSON.stringify({
        format: "xlsx/csv",
        scenario: "PGlite demo database simulation",
        studentMatchedRecords: summaryBundle.student.kpis.matchedRecords,
        teacherMatchedRecords: summaryBundle.teacher.kpis.matchedRecords,
      }),
    ],
  );
}

async function main() {
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  const db = new PGlite(dbPath);

  await resetSchema(db);
  const seeded = await seedDemoData(db);
  const studentSummaries = await getSummaries(db, "STUDENT");
  const teacherSummaries = await getSummaries(db, "TEACHER");
  await recordExportAudit(db, {
    student: studentSummaries,
    teacher: teacherSummaries,
  });
  const counts = await getCounts(db);
  const outputs = {
    student: await writeReportExports("STUDENT", studentSummaries),
    teacher: await writeReportExports("TEACHER", teacherSummaries),
  };
  const jsonPath = path.join(outputDir, "demo-db-summary.json");
  await fs.writeFile(
    jsonPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        student: studentSummaries,
        teacher: teacherSummaries,
      },
      null,
      2,
    ),
    "utf8",
  );
  await db.close();

  console.log(
    JSON.stringify(
      {
        database: dbPath,
        counts,
        seeded: {
          classes: seeded.classes.length,
          teachers: seeded.teachers.length,
          students: seeded.students.length,
          inspectionRecords: seeded.inspectionRecords.length,
        },
        summaries: {
          student: {
            kpis: studentSummaries.kpis,
            topInspectionItems: studentSummaries.byItem.slice(0, 3),
          },
          teacher: {
            kpis: teacherSummaries.kpis,
            topInspectionItems: teacherSummaries.byItem.slice(0, 3),
          },
        },
        outputs: {
          ...outputs,
          jsonPath,
        },
      },
      null,
      2,
    ),
  );
}

await main();
