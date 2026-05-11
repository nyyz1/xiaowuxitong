import pg from "pg";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function loadLocalEnv() {
  for (const filename of [".env.local", ".env"]) {
    const path = join(process.cwd(), filename);
    if (!existsSync(path)) {
      continue;
    }

    const content = readFileSync(path, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separator = trimmed.indexOf("=");
      if (separator === -1) {
        continue;
      }

      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^"|"$/g, "");
      process.env[key] ??= value;
    }
  }
}

loadLocalEnv();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const client = new pg.Client({ connectionString });

const newRoleValues = [
  "DEPARTMENT_LEADER",
  "STUDENT_AFFAIRS_STAFF",
  "ACADEMIC_AFFAIRS_STAFF",
  "ADMIN_OFFICE_STAFF",
  "LOGISTICS_STAFF",
  "TEACHER",
];

await client.connect();

try {
  for (const role of newRoleValues) {
    await client.query(`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS '${role}'`);
  }

  await client.query(
    `UPDATE "User" SET role = 'ACADEMIC_AFFAIRS_STAFF'::"UserRole" WHERE role::text = 'DATA_MANAGER'`,
  );
  await client.query(
    `UPDATE "User" SET role = 'STUDENT_AFFAIRS_STAFF'::"UserRole" WHERE role::text = 'INSPECTION_STAFF'`,
  );

  const { rows } = await client.query(
    `SELECT role::text AS role, COUNT(*)::int AS count FROM "User" GROUP BY role::text ORDER BY role::text`,
  );

  console.table(rows);
} finally {
  await client.end();
}
