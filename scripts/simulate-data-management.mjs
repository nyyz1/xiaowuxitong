import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const dbPath = path.join(projectRoot, ".tmp", "pglite-data-management");
const outputDir = path.join(projectRoot, "outputs", "simulation");

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

    CREATE TABLE "User" (
      "id" TEXT PRIMARY KEY,
      "username" TEXT NOT NULL UNIQUE,
      "managedGradeId" TEXT
    );

    CREATE TABLE "AcademicYear" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL UNIQUE
    );

    CREATE TABLE "Grade" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "academicYearId" TEXT NOT NULL REFERENCES "AcademicYear"("id") ON DELETE RESTRICT
    );

    ALTER TABLE "User"
      ADD CONSTRAINT "User_managedGradeId_fkey"
      FOREIGN KEY ("managedGradeId") REFERENCES "Grade"("id") ON DELETE SET NULL;

    CREATE TABLE "Class" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "gradeId" TEXT NOT NULL REFERENCES "Grade"("id") ON DELETE RESTRICT
    );

    CREATE TABLE "Department" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL UNIQUE
    );

    CREATE TABLE "Subject" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL UNIQUE
    );

    CREATE TABLE "Teacher" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "departmentId" TEXT REFERENCES "Department"("id") ON DELETE SET NULL,
      "subjectId" TEXT REFERENCES "Subject"("id") ON DELETE SET NULL,
      "profileData" JSONB NOT NULL DEFAULT '{}'::jsonb
    );

    CREATE TABLE "TeacherDepartmentAssignment" (
      "teacherId" TEXT NOT NULL REFERENCES "Teacher"("id") ON DELETE CASCADE,
      "departmentId" TEXT NOT NULL REFERENCES "Department"("id") ON DELETE RESTRICT,
      PRIMARY KEY ("teacherId", "departmentId")
    );

    CREATE TABLE "Student" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "gradeId" TEXT NOT NULL REFERENCES "Grade"("id") ON DELETE RESTRICT,
      "classId" TEXT REFERENCES "Class"("id") ON DELETE SET NULL,
      "isArchived" BOOLEAN NOT NULL DEFAULT FALSE,
      "profileData" JSONB NOT NULL DEFAULT '{}'::jsonb
    );

    CREATE TABLE "ProfileFieldDefinition" (
      "id" TEXT PRIMARY KEY,
      "targetType" TEXT NOT NULL,
      "name" TEXT NOT NULL
    );

    CREATE TABLE "InspectionCategory" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "targetType" TEXT NOT NULL
    );

    CREATE TABLE "InspectionItem" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "categoryId" TEXT NOT NULL REFERENCES "InspectionCategory"("id") ON DELETE RESTRICT
    );

    CREATE TABLE "InspectionRecord" (
      "id" TEXT PRIMARY KEY,
      "inspectionItemId" TEXT NOT NULL REFERENCES "InspectionItem"("id") ON DELETE RESTRICT,
      "gradeId" TEXT REFERENCES "Grade"("id") ON DELETE SET NULL,
      "classId" TEXT REFERENCES "Class"("id") ON DELETE SET NULL,
      "teacherId" TEXT REFERENCES "Teacher"("id") ON DELETE SET NULL,
      "value" DOUBLE PRECISION NOT NULL
    );

    CREATE TABLE "AuditLog" (
      "id" TEXT PRIMARY KEY,
      "action" TEXT NOT NULL,
      "targetType" TEXT NOT NULL,
      "summary" TEXT NOT NULL,
      "metadata" JSONB
    );
  `);
}

async function seedScenario(db) {
  await db.exec(`
    INSERT INTO "AcademicYear" ("id", "name") VALUES
      ('year-current', '2026兼容学年');

    INSERT INTO "Grade" ("id", "name", "academicYearId") VALUES
      ('grade-2025', '2025级', 'year-current'),
      ('grade-2024', '2024级', 'year-current');

    INSERT INTO "User" ("id", "username", "managedGradeId") VALUES
      ('user-admin', 'admin', NULL),
      ('user-grade', 'grade.manager', 'grade-2025');

    INSERT INTO "Class" ("id", "name", "gradeId") VALUES
      ('class-1', '1班', 'grade-2025'),
      ('class-2', '2班', 'grade-2024');

    INSERT INTO "Department" ("id", "name") VALUES
      ('dept-a', '教务处'),
      ('dept-b', '2025级年级');

    INSERT INTO "Subject" ("id", "name") VALUES
      ('subject-math', '数学');

    INSERT INTO "Teacher" ("id", "name", "departmentId", "subjectId", "profileData") VALUES
      ('teacher-a', '王老师', 'dept-a', 'subject-math', '{"field-teacher-title":"高级教师"}'),
      ('teacher-b', '李老师', 'dept-b', 'subject-math', '{"field-teacher-title":"一级教师"}');

    INSERT INTO "TeacherDepartmentAssignment" ("teacherId", "departmentId") VALUES
      ('teacher-a', 'dept-a'),
      ('teacher-b', 'dept-b');

    INSERT INTO "Student" ("id", "name", "gradeId", "classId", "isArchived", "profileData") VALUES
      ('student-a', '张同学', 'grade-2025', 'class-1', FALSE, '{"field-student-origin":"市区"}'),
      ('student-b', '陈同学', 'grade-2024', 'class-2', TRUE, '{"field-student-origin":"县区"}');

    INSERT INTO "ProfileFieldDefinition" ("id", "targetType", "name") VALUES
      ('field-teacher-title', 'TEACHER', '职称'),
      ('field-student-origin', 'STUDENT', '生源地');

    INSERT INTO "InspectionCategory" ("id", "name", "targetType") VALUES
      ('category-student', '学生检查', 'STUDENT'),
      ('category-teacher', '教师检查', 'TEACHER');

    INSERT INTO "InspectionItem" ("id", "name", "categoryId") VALUES
      ('item-student', '卫生检查', 'category-student'),
      ('item-teacher', '教师考勤', 'category-teacher');

    INSERT INTO "InspectionRecord" ("id", "inspectionItemId", "gradeId", "classId", "teacherId", "value") VALUES
      ('record-student-1', 'item-student', 'grade-2025', 'class-1', NULL, 95),
      ('record-student-2', 'item-student', 'grade-2024', 'class-2', NULL, 90),
      ('record-teacher-1', 'item-teacher', NULL, NULL, 'teacher-a', 1);

    INSERT INTO "AuditLog" ("id", "action", "targetType", "summary", "metadata") VALUES
      ('audit-existing', 'LOGIN', 'User', '保留的审计日志', '{}'::jsonb);
  `);
}

async function countTables(db) {
  const counts = {};

  for (const table of tables) {
    const result = await db.query(`SELECT COUNT(*)::int AS count FROM "${table}"`);
    counts[table] = result.rows[0].count;
  }

  return counts;
}

async function dependencyPreview(db) {
  const result = await db.query(`
    SELECT
      (SELECT COUNT(*)::int FROM "InspectionRecord") AS "inspectionRecords",
      (SELECT COUNT(*)::int FROM "TeacherDepartmentAssignment") AS "teacherDepartmentAssignments",
      (SELECT COUNT(*)::int FROM "Student" WHERE "isArchived" = FALSE) AS "activeStudents",
      (SELECT COUNT(*)::int FROM "Student" WHERE "isArchived" = TRUE) AS "archivedStudents",
      (SELECT COUNT(*)::int FROM "Class") AS "classes",
      (SELECT COUNT(*)::int FROM "Grade") AS "grades",
      (SELECT COUNT(*)::int FROM "AuditLog") AS "auditLogs"
  `);

  return result.rows[0];
}

async function runTransaction(db, callback) {
  await db.exec("BEGIN");

  try {
    const result = await callback();
    await db.exec("COMMIT");
    return result;
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}

async function clearInspectionRecords(db) {
  return runTransaction(db, async () => {
    const records = await db.query(`DELETE FROM "InspectionRecord"`);
    await db.query(
      `INSERT INTO "AuditLog" ("id", "action", "targetType", "summary", "metadata")
       VALUES ('audit-clear-inspection', 'DATA_MANAGEMENT_CLEANUP', '清空检查数据', '清空检查数据完成', '{}'::jsonb)`,
    );
    return {
      InspectionRecord: records.affectedRows,
    };
  });
}

async function clearPeopleRecords(db) {
  return runTransaction(db, async () => {
    const assignments = await db.query(`DELETE FROM "TeacherDepartmentAssignment"`);
    const students = await db.query(`DELETE FROM "Student"`);
    const teachers = await db.query(`DELETE FROM "Teacher"`);
    await db.query(
      `INSERT INTO "AuditLog" ("id", "action", "targetType", "summary", "metadata")
       VALUES ('audit-clear-people', 'DATA_MANAGEMENT_CLEANUP', '清空师生档案', '清空师生档案完成', '{}'::jsonb)`,
    );

    return {
      TeacherDepartmentAssignment: assignments.affectedRows,
      Student: students.affectedRows,
      Teacher: teachers.affectedRows,
    };
  });
}

async function clearStructureAndBusinessData(db) {
  return runTransaction(db, async () => {
    const records = await db.query(`DELETE FROM "InspectionRecord"`);
    const assignments = await db.query(`DELETE FROM "TeacherDepartmentAssignment"`);
    const students = await db.query(`DELETE FROM "Student"`);
    const teachers = await db.query(`DELETE FROM "Teacher"`);
    const fields = await db.query(`DELETE FROM "ProfileFieldDefinition"`);
    const items = await db.query(`DELETE FROM "InspectionItem"`);
    const categories = await db.query(`DELETE FROM "InspectionCategory"`);
    const classes = await db.query(`DELETE FROM "Class"`);
    const grades = await db.query(`DELETE FROM "Grade"`);
    const years = await db.query(`DELETE FROM "AcademicYear"`);
    const departments = await db.query(`DELETE FROM "Department"`);
    const subjects = await db.query(`DELETE FROM "Subject"`);
    await db.query(
      `INSERT INTO "AuditLog" ("id", "action", "targetType", "summary", "metadata")
       VALUES ('audit-clear-all', 'DATA_MANAGEMENT_CLEANUP', '清空结构与业务数据', '清空结构与业务数据完成', '{}'::jsonb)`,
    );

    return {
      InspectionRecord: records.affectedRows,
      TeacherDepartmentAssignment: assignments.affectedRows,
      Student: students.affectedRows,
      Teacher: teachers.affectedRows,
      ProfileFieldDefinition: fields.affectedRows,
      InspectionItem: items.affectedRows,
      InspectionCategory: categories.affectedRows,
      Class: classes.affectedRows,
      Grade: grades.affectedRows,
      AcademicYear: years.affectedRows,
      Department: departments.affectedRows,
      Subject: subjects.affectedRows,
    };
  });
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

async function runScenario(db, name, cleanup) {
  await resetSchema(db);
  await seedScenario(db);
  const before = await countTables(db);
  const preview = await dependencyPreview(db);
  const deleted = await cleanup(db);
  const after = await countTables(db);

  return {
    name,
    before,
    preview,
    deleted,
    after,
  };
}

async function main() {
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  await fs.mkdir(outputDir, { recursive: true });
  const db = new PGlite(dbPath);

  const inspection = await runScenario(db, "clearInspectionRecords", clearInspectionRecords);
  assertEqual(inspection.deleted.InspectionRecord, 3, "clearInspectionRecords deletes records");
  assertEqual(inspection.after.InspectionCategory, 2, "clearInspectionRecords keeps categories");
  assertEqual(inspection.after.InspectionItem, 2, "clearInspectionRecords keeps items");

  const people = await runScenario(db, "clearPeopleRecords", clearPeopleRecords);
  assertEqual(people.deleted.TeacherDepartmentAssignment, 2, "clearPeopleRecords deletes assignments");
  assertEqual(people.deleted.Student, 2, "clearPeopleRecords deletes students");
  assertEqual(people.deleted.Teacher, 2, "clearPeopleRecords deletes teachers");
  assertEqual(people.after.Grade, 2, "clearPeopleRecords keeps grades");
  assertEqual(people.after.ProfileFieldDefinition, 2, "clearPeopleRecords keeps profile fields");
  assertEqual(people.after.InspectionRecord, 3, "clearPeopleRecords keeps inspection records");

  const all = await runScenario(
    db,
    "clearStructureAndBusinessData",
    clearStructureAndBusinessData,
  );
  assertEqual(all.after.User, 2, "clearStructureAndBusinessData keeps users");
  assertEqual(all.after.AuditLog, 2, "clearStructureAndBusinessData keeps and appends audit logs");
  for (const table of tables.filter((table) => table !== "User" && table !== "AuditLog")) {
    assertEqual(all.after[table], 0, `clearStructureAndBusinessData clears ${table}`);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    scenarios: [inspection, people, all],
  };
  const jsonPath = path.join(outputDir, "data-management-cleanup-summary.json");
  await fs.writeFile(jsonPath, JSON.stringify(summary, null, 2), "utf8");
  await db.close();

  console.log(
    JSON.stringify(
      {
        database: dbPath,
        output: jsonPath,
        scenarios: summary.scenarios.map((scenario) => ({
          name: scenario.name,
          preview: scenario.preview,
          deleted: scenario.deleted,
          after: scenario.after,
        })),
      },
      null,
      2,
    ),
  );
}

await main();
