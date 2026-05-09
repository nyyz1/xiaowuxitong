import "dotenv/config";
import { Client } from "pg";
import { buildDemoDataset } from "./demo-data.mjs";

const isDryRun = process.argv.includes("--dry-run");
const dataset = buildDemoDataset();

function buildTeacherDepartmentAssignments(teachers) {
  return teachers.flatMap((teacher) =>
    (teacher.departmentIds ?? []).map((departmentId) => ({
      teacherId: teacher.id,
      departmentId,
    })),
  );
}

const demoRowsByTable = {
  AcademicYear: dataset.academicYears,
  Grade: dataset.grades,
  Class: dataset.classes,
  Department: dataset.departments,
  Subject: dataset.subjects,
  ProfileFieldDefinition: dataset.profileFieldDefinitions,
  User: dataset.users,
  Teacher: dataset.teachers,
  TeacherDepartmentAssignment: buildTeacherDepartmentAssignments(dataset.teachers),
  Student: dataset.students,
  InspectionCategory: dataset.inspectionCategories,
  InspectionItem: dataset.inspectionItems,
  InspectionRecord: dataset.inspectionRecords,
  AuditLog: [{ id: "audit-demo-seed" }],
};

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

function plannedCounts() {
  return Object.fromEntries(
    deleteOrder.map((table) => [table, demoRowsByTable[table]?.length ?? 0]),
  );
}

async function deleteDemoRows(client) {
  const deleted = {};

  for (const table of deleteOrder) {
    const rows = demoRowsByTable[table] ?? [];

    if (rows.length === 0) {
      deleted[table] = 0;
      continue;
    }

    if (table === "TeacherDepartmentAssignment") {
      let count = 0;

      for (const row of rows) {
        const result = await client.query(
          'DELETE FROM "TeacherDepartmentAssignment" WHERE "teacherId" = $1 AND "departmentId" = $2',
          [row.teacherId, row.departmentId],
        );
        count += result.rowCount ?? 0;
      }

      deleted[table] = count;
      continue;
    }

    const ids = rows.map((row) => row.id);
    const result = await client.query(`DELETE FROM "${table}" WHERE "id" = ANY($1::text[])`, [
      ids,
    ]);
    deleted[table] = result.rowCount ?? 0;
  }

  return deleted;
}

async function main() {
  if (isDryRun) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          message: "No database connection was opened.",
          plannedDeletes: plannedCounts(),
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
    const deleted = await deleteDemoRows(client);
    await client.query("COMMIT");

    console.log(
      JSON.stringify(
        {
          mode: "cleared",
          message: "Fixed demo dataset rows were deleted successfully.",
          deleted,
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
