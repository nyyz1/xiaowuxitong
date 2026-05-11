import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

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

function permissionTagsForIdentity(identityType) {
  if (identityType === "STUDENT_AFFAIRS_STAFF") return ["PEOPLE_STUDENT_AFFAIRS"];
  if (identityType === "ACADEMIC_AFFAIRS_STAFF") return ["PEOPLE_ACADEMIC_AFFAIRS"];
  if (identityType === "DEPARTMENT_LEADER") return ["DEPARTMENT_LEADER"];
  if (identityType === "GRADE_MANAGER") return ["GRADE_MANAGER"];
  if (identityType === "LOGISTICS_STAFF") return ["LOGISTICS"];
  if (identityType === "GRADE_SUBJECT_LEADER") return ["GRADE_SUBJECT_LEADER"];
  return [];
}

function defaultsForDepartment(name) {
  if (/^\d{4}级年级/u.test(name.trim())) {
    return [
      ["一线教师", "FRONTLINE_TEACHER"],
      ["学科组长", "GRADE_SUBJECT_LEADER"],
      ["年级管理", "GRADE_MANAGER"],
    ];
  }

  if (name.trim() === "校领导") {
    return [
      ["校长", "DEPARTMENT_LEADER"],
      ["副校长", "DEPARTMENT_LEADER"],
      ["书记", "DEPARTMENT_LEADER"],
    ];
  }

  return [
    ["部门管理", "DEPARTMENT_LEADER"],
    ["工作人员", "FRONTLINE_TEACHER"],
  ];
}

loadLocalEnv();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const pool = new pg.Pool({ connectionString });
let createdOrUpdated = 0;

try {
  const { rows: departments } = await pool.query(
    'SELECT "id", "name" FROM "Department" ORDER BY "name" ASC',
  );

  for (const department of departments) {
    const defaults = defaultsForDepartment(department.name);

    for (const [sortOrder, [name, identityType]] of defaults.entries()) {
      await pool.query(
        `
          INSERT INTO "DepartmentPosition"
            ("id", "departmentId", "name", "identityType", "permissionTags", "sortOrder", "isActive", "createdAt", "updatedAt")
          VALUES
            ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
          ON CONFLICT ("departmentId", "name")
          DO UPDATE SET
            "identityType" = EXCLUDED."identityType",
            "permissionTags" = EXCLUDED."permissionTags",
            "sortOrder" = EXCLUDED."sortOrder",
            "isActive" = true,
            "updatedAt" = NOW()
        `,
        [
          `deptpos_${randomUUID()}`,
          department.id,
          name,
          identityType,
          permissionTagsForIdentity(identityType),
          sortOrder,
        ],
      );
      createdOrUpdated += 1;
    }
  }

  console.log(`Department position seed completed: ${createdOrUpdated} rows touched.`);
} finally {
  await pool.end();
}
