import "dotenv/config";
import { Client } from "pg";

const isDryRun = process.argv.includes("--dry-run");
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required. Copy .env.example and set DATABASE_URL first.");
}

function teacherCategoryWhereClause() {
  return `"name" LIKE '%教师%'`;
}

async function main() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const categoriesResult = await client.query(`
      SELECT id, name, "targetType"
      FROM "InspectionCategory"
      WHERE ${teacherCategoryWhereClause()}
      ORDER BY name ASC
    `);

    const orphanTeacherRecordsBefore = await client.query(`
      SELECT
        ir.id,
        ir."inspectionDate",
        ii.name AS "itemName",
        ic.name AS "categoryName",
        g.name AS "gradeName",
        c.name AS "className",
        ir.value,
        ir.remarks
      FROM "InspectionRecord" ir
      JOIN "InspectionItem" ii ON ii.id = ir."inspectionItemId"
      JOIN "InspectionCategory" ic ON ic.id = ii."categoryId"
      LEFT JOIN "Grade" g ON g.id = ir."gradeId"
      LEFT JOIN "Class" c ON c.id = ir."classId"
      WHERE ic."targetType" = 'TEACHER' AND ir."teacherId" IS NULL
      ORDER BY ir."inspectionDate" DESC, ir.id ASC
    `);

    if (isDryRun) {
      console.log(
        JSON.stringify(
          {
            mode: "dry-run",
            teacherNamedCategories: categoriesResult.rows,
            orphanTeacherRecords: orphanTeacherRecordsBefore.rows,
          },
          null,
          2,
        ),
      );
      return;
    }

    await client.query("BEGIN");

    const updateResult = await client.query(`
      UPDATE "InspectionCategory"
      SET "targetType" = 'TEACHER'
      WHERE ${teacherCategoryWhereClause()} AND "targetType" <> 'TEACHER'
      RETURNING id, name, "targetType"
    `);

    const orphanTeacherRecordsAfter = await client.query(`
      SELECT
        ir.id,
        ir."inspectionDate",
        ii.name AS "itemName",
        ic.name AS "categoryName",
        g.name AS "gradeName",
        c.name AS "className",
        ir.value,
        ir.remarks
      FROM "InspectionRecord" ir
      JOIN "InspectionItem" ii ON ii.id = ir."inspectionItemId"
      JOIN "InspectionCategory" ic ON ic.id = ii."categoryId"
      LEFT JOIN "Grade" g ON g.id = ir."gradeId"
      LEFT JOIN "Class" c ON c.id = ir."classId"
      WHERE ic."targetType" = 'TEACHER' AND ir."teacherId" IS NULL
      ORDER BY ir."inspectionDate" DESC, ir.id ASC
    `);

    await client.query("COMMIT");

    console.log(
      JSON.stringify(
        {
          mode: "updated",
          updatedCategories: updateResult.rows,
          orphanTeacherRecords: orphanTeacherRecordsAfter.rows,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    throw error;
  } finally {
    await client.end();
  }
}

await main();
