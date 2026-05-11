import "dotenv/config";
import bcrypt from "bcryptjs";
import { Client } from "pg";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const isDryRun = process.argv.includes("--dry-run");
const defaultPassword = "ChangeMe123!";

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

const standardAccounts = [
  {
    id: "user-logistics-office",
    username: "logistics.office",
    displayName: "后勤审批员",
    role: "LOGISTICS_STAFF",
  },
  {
    id: "user-admin-office",
    username: "admin.office",
    displayName: "行政审批员",
    role: "ADMIN_OFFICE_STAFF",
  },
  {
    id: "user-teacher-wangming",
    username: "teacher.wangming",
    displayName: "王明",
    role: "TEACHER",
    teacherName: "王明",
  },
];

const standardResponsibilities = [
  {
    id: "approval-resp-maintenance-logistics",
    name: "日常报修后勤审批",
    kind: "LOGISTICS",
    approverUsername: "logistics.office",
    requestTypeName: "日常报修申请",
  },
  {
    id: "approval-resp-print-teaching-academic",
    name: "教学用材料打印审批",
    kind: "PRINT_TEACHING",
    approverUsername: "data.manager",
    requestTypeName: "日常材料打印申请",
  },
  {
    id: "approval-resp-print-grade-2024",
    name: "2024级年级行政打印审批",
    kind: "PRINT_GRADE_ADMIN",
    approverUsername: "grade11.manager1",
    requestTypeName: "日常材料打印申请",
    gradeName: "2024级",
  },
  {
    id: "approval-resp-print-school-admin",
    name: "学校行政材料打印审批",
    kind: "PRINT_SCHOOL_ADMIN",
    approverUsername: "admin.office",
    requestTypeName: "日常材料打印申请",
    departmentName: "校务办公室",
  },
  {
    id: "approval-resp-other-leader",
    name: "其他日常申请审批",
    kind: "OTHER",
    approverUsername: "leader1",
    requestTypeName: "其他申请",
  },
];

async function getIdByName(client, table, name) {
  const result = await client.query(`SELECT "id" FROM "${table}" WHERE "name" = $1`, [
    name,
  ]);

  return result.rows[0]?.id ?? null;
}

async function getUserByUsername(client, username) {
  const result = await client.query(
    'SELECT "id", "username", "displayName", "role", "teacherId" FROM "User" WHERE "username" = $1',
    [username],
  );

  return result.rows[0] ?? null;
}

async function getTeacherIdByName(client, name) {
  if (!name) {
    return null;
  }

  const result = await client.query('SELECT "id" FROM "Teacher" WHERE "name" = $1', [
    name,
  ]);

  return result.rows[0]?.id ?? null;
}

async function ensureAccount(client, account, passwordHash) {
  const teacherId = await getTeacherIdByName(client, account.teacherName);

  if (account.teacherName && !teacherId) {
    throw new Error(`Teacher profile not found: ${account.teacherName}`);
  }

  await client.query(
    `
      INSERT INTO "User"
        ("id", "username", "displayName", "passwordHash", "role", "teacherId", "isActive", "createdAt", "updatedAt")
      VALUES
        ($1, $2, $3, $4, $5::"UserRole", $6, true, now(), now())
      ON CONFLICT ("username") DO UPDATE SET
        "displayName" = EXCLUDED."displayName",
        "role" = EXCLUDED."role",
        "teacherId" = EXCLUDED."teacherId",
        "isActive" = true,
        "updatedAt" = now()
    `,
    [
      account.id,
      account.username,
      account.displayName,
      passwordHash,
      account.role,
      teacherId,
    ],
  );
}

async function ensureResponsibility(client, responsibility) {
  const approver = await getUserByUsername(client, responsibility.approverUsername);
  const requestTypeId = await getIdByName(
    client,
    "ApprovalType",
    responsibility.requestTypeName,
  );
  const gradeId = responsibility.gradeName
    ? await getIdByName(client, "Grade", responsibility.gradeName)
    : null;
  const subjectId = responsibility.subjectName
    ? await getIdByName(client, "Subject", responsibility.subjectName)
    : null;
  const departmentId = responsibility.departmentName
    ? await getIdByName(client, "Department", responsibility.departmentName)
    : null;

  if (!approver) {
    throw new Error(`Approver account not found: ${responsibility.approverUsername}`);
  }

  if (!requestTypeId) {
    throw new Error(`Approval type not found: ${responsibility.requestTypeName}`);
  }

  if (responsibility.gradeName && !gradeId) {
    throw new Error(`Grade not found: ${responsibility.gradeName}`);
  }

  if (responsibility.subjectName && !subjectId) {
    throw new Error(`Subject not found: ${responsibility.subjectName}`);
  }

  if (responsibility.departmentName && !departmentId) {
    throw new Error(`Department not found: ${responsibility.departmentName}`);
  }

  await client.query(
    `
      INSERT INTO "ApprovalResponsibility"
        ("id", "name", "kind", "approverId", "requestTypeId", "gradeId", "subjectId", "departmentId", "isActive", "createdAt", "updatedAt")
      VALUES
        ($1, $2, $3::"ApprovalResponsibilityKind", $4, $5, $6, $7, $8, true, now(), now())
      ON CONFLICT ("id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "kind" = EXCLUDED."kind",
        "approverId" = EXCLUDED."approverId",
        "requestTypeId" = EXCLUDED."requestTypeId",
        "gradeId" = EXCLUDED."gradeId",
        "subjectId" = EXCLUDED."subjectId",
        "departmentId" = EXCLUDED."departmentId",
        "isActive" = true,
        "updatedAt" = now()
    `,
    [
      responsibility.id,
      responsibility.name,
      responsibility.kind,
      approver.id,
      requestTypeId,
      gradeId,
      subjectId,
      departmentId,
    ],
  );
}

async function getSummary(client) {
  const [users, responsibilities] = await Promise.all([
    client.query(
      `
        SELECT "username", "displayName", "role", "teacherId"
        FROM "User"
        WHERE "username" = ANY($1::text[])
        ORDER BY "username"
      `,
      [standardAccounts.map((account) => account.username)],
    ),
    client.query(
      `
        SELECT ar."name", ar."kind", u."username" AS "approverUsername",
          at."name" AS "requestType", g."name" AS "grade",
          s."name" AS "subject", d."name" AS "department"
        FROM "ApprovalResponsibility" ar
        JOIN "User" u ON u."id" = ar."approverId"
        LEFT JOIN "ApprovalType" at ON at."id" = ar."requestTypeId"
        LEFT JOIN "Grade" g ON g."id" = ar."gradeId"
        LEFT JOIN "Subject" s ON s."id" = ar."subjectId"
        LEFT JOIN "Department" d ON d."id" = ar."departmentId"
        WHERE ar."id" = ANY($1::text[])
        ORDER BY ar."kind", ar."name"
      `,
      [standardResponsibilities.map((item) => item.id)],
    ),
  ]);

  return {
    accounts: users.rows,
    responsibilities: responsibilities.rows,
  };
}

async function main() {
  if (isDryRun) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          standardPassword: defaultPassword,
          plannedAccounts: standardAccounts.map(({ teacherName, ...account }) => ({
            ...account,
            teacherBinding: teacherName ?? null,
          })),
          plannedResponsibilities: standardResponsibilities,
        },
        null,
        2,
      ),
    );
    return;
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query("BEGIN");
    const passwordHash = bcrypt.hashSync(defaultPassword, 12);

    for (const account of standardAccounts) {
      await ensureAccount(client, account, passwordHash);
    }

    for (const responsibility of standardResponsibilities) {
      await ensureResponsibility(client, responsibility);
    }

    await client.query("COMMIT");

    console.log(
      JSON.stringify(
        {
          mode: "seeded",
          standardPassword: defaultPassword,
          ...(await getSummary(client)),
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
