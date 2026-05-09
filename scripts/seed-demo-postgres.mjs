import "dotenv/config";
import bcrypt from "bcryptjs";
import { Client } from "pg";
import { buildDemoDataset, demoUserPassword, isoDate } from "./demo-data.mjs";

const isDryRun = process.argv.includes("--dry-run");
const dataset = buildDemoDataset();
const seededAt = isoDate(new Date());

function withDemoPasswordHash(user) {
  const { plainPassword, ...userWithoutPlainPassword } = user;

  return {
    ...userWithoutPlainPassword,
    passwordHash: bcrypt.hashSync(plainPassword ?? demoUserPassword, 12),
  };
}

function withTimestamps(row) {
  return {
    ...row,
    createdAt: seededAt,
    updatedAt: seededAt,
  };
}

function buildTeacherDepartmentAssignments(teachers) {
  return teachers.flatMap((teacher) =>
    (teacher.departmentIds ?? []).map((departmentId) => ({
      id: `${teacher.id}::${departmentId}`,
      teacherId: teacher.id,
      departmentId,
      createdAt: seededAt,
    })),
  );
}

const tableSpecs = [
  {
    table: "AcademicYear",
    columns: [
      "id",
      "name",
      "startDate",
      "endDate",
      "isCurrent",
      "createdAt",
      "updatedAt",
    ],
    rows: dataset.academicYears
      .map((year) => ({
        ...year,
        startDate: isoDate(year.startDate),
        endDate: isoDate(year.endDate),
      }))
      .map(withTimestamps),
  },
  {
    table: "Grade",
    columns: [
      "id",
      "name",
      "academicYearId",
      "stage",
      "enrollmentYear",
      "isVisibleInMain",
      "graduationYear",
      "createdAt",
      "updatedAt",
    ],
    rows: dataset.grades.map(withTimestamps),
  },
  {
    table: "Class",
    columns: ["id", "name", "gradeId", "createdAt", "updatedAt"],
    rows: dataset.classes.map(withTimestamps),
  },
  {
    table: "Department",
    columns: ["id", "name", "createdAt", "updatedAt"],
    rows: dataset.departments.map(withTimestamps),
  },
  {
    table: "Subject",
    columns: ["id", "name", "createdAt", "updatedAt"],
    rows: dataset.subjects.map(withTimestamps),
  },
  {
    table: "ProfileFieldDefinition",
    columns: [
      "id",
      "targetType",
      "fieldKey",
      "name",
      "sortOrder",
      "isActive",
      "isDeleted",
      "createdAt",
      "updatedAt",
    ],
    rows: dataset.profileFieldDefinitions.map(withTimestamps),
  },
  {
    table: "User",
    columns: [
      "id",
      "username",
      "displayName",
      "passwordHash",
      "role",
      "managedGradeId",
      "isActive",
      "createdAt",
      "updatedAt",
    ],
    rows: dataset.users.map(withDemoPasswordHash).map(withTimestamps),
  },
  {
    table: "Teacher",
    columns: [
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
      "createdAt",
      "updatedAt",
    ],
    rows: dataset.teachers.map((teacher) =>
      withTimestamps({
        ...teacher,
        profileData: JSON.stringify(teacher.profileData ?? {}),
      }),
    ),
  },
  {
    table: "TeacherDepartmentAssignment",
    columns: ["teacherId", "departmentId", "createdAt"],
    rows: buildTeacherDepartmentAssignments(dataset.teachers),
  },
  {
    table: "Student",
    columns: [
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
      "createdAt",
      "updatedAt",
    ],
    rows: dataset.students.map((student) =>
      withTimestamps({
        ...student,
        profileData: JSON.stringify(student.profileData ?? {}),
      }),
    ),
  },
  {
    table: "InspectionCategory",
    columns: ["id", "name", "targetType", "createdAt", "updatedAt"],
    rows: dataset.inspectionCategories.map(withTimestamps),
  },
  {
    table: "InspectionItem",
    columns: [
      "id",
      "categoryId",
      "name",
      "valueType",
      "description",
      "createdAt",
      "updatedAt",
    ],
    rows: dataset.inspectionItems.map(withTimestamps),
  },
  {
    table: "InspectionRecord",
    columns: [
      "id",
      "inspectionDate",
      "inspectionItemId",
      "gradeId",
      "classId",
      "teacherId",
      "recordedById",
      "value",
      "remarks",
      "createdAt",
      "updatedAt",
    ],
    rows: dataset.inspectionRecords
      .map((record) => ({
        ...record,
        inspectionDate: isoDate(record.inspectionDate),
      }))
      .map(withTimestamps),
  },
];

const deleteOrder = [
  "AuditLog",
  "InspectionRecord",
  "TeacherDepartmentAssignment",
  "User",
  "Student",
  "Teacher",
  "ProfileFieldDefinition",
  "InspectionItem",
  "InspectionCategory",
  "Class",
  "Grade",
  "AcademicYear",
  "Department",
  "Subject",
];

function rowCountByTable() {
  return Object.fromEntries(tableSpecs.map((spec) => [spec.table, spec.rows.length]));
}

function getRowsForTable(table) {
  if (table === "AuditLog") {
    return [{ id: "audit-demo-seed" }];
  }

  return tableSpecs.find((spec) => spec.table === table)?.rows ?? [];
}

async function deleteDemoRows(client) {
  for (const table of deleteOrder) {
    if (table === "TeacherDepartmentAssignment") {
      const rows = getRowsForTable(table);

      for (const row of rows) {
        await client.query(
          'DELETE FROM "TeacherDepartmentAssignment" WHERE "teacherId" = $1 AND "departmentId" = $2',
          [row.teacherId, row.departmentId],
        );
      }

      continue;
    }

    const ids = getRowsForTable(table).map((row) => row.id);

    if (ids.length === 0) {
      continue;
    }

    await client.query(`DELETE FROM "${table}" WHERE "id" = ANY($1::text[])`, [ids]);
  }
}

async function insertMany(client, spec) {
  for (const row of spec.rows) {
    const placeholders = spec.columns.map((_, index) => `$${index + 1}`).join(", ");
    const quotedColumns = spec.columns.map((column) => `"${column}"`).join(", ");

    await client.query(
      `INSERT INTO "${spec.table}" (${quotedColumns}) VALUES (${placeholders})`,
      spec.columns.map((column) => row[column]),
    );
  }
}

async function insertAuditLog(client) {
  await client.query(
    `
      INSERT INTO "AuditLog"
        ("id", "actorId", "action", "targetType", "summary", "metadata")
      VALUES
        ($1, $2, $3, $4, $5, $6::jsonb)
    `,
    [
      "audit-demo-seed",
      "user-admin",
      "SEED_DEMO_DATA",
      "DemoDataset",
      "写入演示用高中校务模拟数据。",
      JSON.stringify({
        source: "scripts/seed-demo-postgres.mjs",
        counts: rowCountByTable(),
      }),
    ],
  );
}

async function getCounts(client) {
  const counts = {};

  for (const spec of tableSpecs) {
    const result = await client.query(`SELECT COUNT(*)::int AS count FROM "${spec.table}"`);
    counts[spec.table] = result.rows[0].count;
  }

  const auditResult = await client.query('SELECT COUNT(*)::int AS count FROM "AuditLog"');
  counts.AuditLog = auditResult.rows[0].count;

  return counts;
}

async function main() {
  if (isDryRun) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          message: "No database connection was opened.",
          plannedCounts: rowCountByTable(),
          demoLoginAccounts: dataset.users.map((user) => ({
            username: user.username,
            displayName: user.displayName,
            role: user.role,
            password: user.plainPassword ?? demoUserPassword,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required. Copy .env.example and set DATABASE_URL first.");
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query("BEGIN");
    await deleteDemoRows(client);

    for (const spec of tableSpecs) {
      await insertMany(client, spec);
    }

    await insertAuditLog(client);
    await client.query("COMMIT");

    const counts = await getCounts(client);

    console.log(
      JSON.stringify(
        {
          mode: "seeded",
          message: "Demo dataset was written successfully.",
          counts,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

await main();
