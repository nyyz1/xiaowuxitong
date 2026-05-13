import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import bcrypt from "bcryptjs";
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

function normalizeUsername(idCardNumber) {
  return String(idCardNumber ?? "").trim().toUpperCase();
}

function initialPassword(idCardNumber) {
  return normalizeUsername(idCardNumber).slice(-8);
}

function isApplyMode() {
  return process.argv.includes("--apply");
}

function isUsableIdentity(idCardNumber) {
  return normalizeUsername(idCardNumber).length >= 8;
}

function maskIdentity(idCardNumber) {
  const normalized = normalizeUsername(idCardNumber);

  if (normalized.length <= 7) {
    return "***";
  }

  return `${normalized.slice(0, 3)}***${normalized.slice(-4)}`;
}

async function loadTeacherCandidates(client) {
  const { rows } = await client.query(`
    SELECT
      t."id",
      t."name",
      t."idCardNumber",
      u."id" AS "boundUserId"
    FROM "Teacher" t
    LEFT JOIN "User" u ON u."teacherId" = t."id"
    ORDER BY t."createdAt" ASC
  `);

  return rows.filter((row) => !row.boundUserId);
}

async function loadStudentCandidates(client) {
  const { rows } = await client.query(`
    SELECT
      s."id",
      s."name",
      s."idCardNumber",
      s."isArchived",
      u."id" AS "boundUserId"
    FROM "Student" s
    LEFT JOIN "User" u ON u."studentId" = s."id"
    ORDER BY s."createdAt" ASC
  `);

  return rows.filter((row) => !row.boundUserId);
}

async function findUserByUsername(client, username) {
  const { rows } = await client.query(
    `
      SELECT "id", "teacherId", "studentId"
      FROM "User"
      WHERE "username" = $1
      LIMIT 1
    `,
    [username],
  );

  return rows[0] ?? null;
}

async function syncTeacherCompatibilityRole(client, teacherId) {
  const { rows } = await client.query(
    `
      SELECT
        COALESCE(dp."identityType", tda."identityType") AS "identityType",
        COALESCE(dp."isActive", true) AS "isActive"
      FROM "TeacherDepartmentAssignment" tda
      LEFT JOIN "DepartmentPosition" dp ON dp."id" = tda."positionId"
      WHERE tda."teacherId" = $1
    `,
    [teacherId],
  );
  const identities = rows
    .filter((row) => row.isActive)
    .map((row) => row.identityType);
  const priority = [
    ["DEPARTMENT_LEADER", "DEPARTMENT_LEADER"],
    ["GRADE_MANAGER", "GRADE_MANAGER"],
    ["STUDENT_AFFAIRS_STAFF", "STUDENT_AFFAIRS_STAFF"],
    ["ACADEMIC_AFFAIRS_STAFF", "ACADEMIC_AFFAIRS_STAFF"],
    ["LOGISTICS_STAFF", "LOGISTICS_STAFF"],
  ];
  let role = "TEACHER";

  for (const [identityType, userRole] of priority) {
    if (identities.includes(identityType)) {
      role = userRole;
      break;
    }
  }

  await client.query(
    `
      UPDATE "User"
      SET "role" = $1, "updatedAt" = NOW()
      WHERE "teacherId" = $2 AND "isSuperAdmin" = false
    `,
    [role, teacherId],
  );
}

async function ensureTeacherAccount(client, teacher) {
  const username = normalizeUsername(teacher.idCardNumber);
  const existing = await findUserByUsername(client, username);

  if (existing) {
    if (existing.teacherId === teacher.id) {
      return { action: "already_bound" };
    }

    if (existing.teacherId || existing.studentId) {
      return { action: "conflict", userId: existing.id };
    }

    await client.query(
      `
        UPDATE "User"
        SET
          "displayName" = $1,
          "accountType" = 'TEACHER',
          "teacherId" = $2,
          "updatedAt" = NOW()
        WHERE "id" = $3
      `,
      [teacher.name, teacher.id, existing.id],
    );
    await syncTeacherCompatibilityRole(client, teacher.id);

    return { action: "bound_existing", userId: existing.id };
  }

  const passwordHash = await bcrypt.hash(initialPassword(username), 12);
  const userId = `repair_user_${randomUUID()}`;

  await client.query(
    `
      INSERT INTO "User"
        ("id", "username", "displayName", "passwordHash", "accountType", "isSuperAdmin", "role", "teacherId", "isActive", "createdAt", "updatedAt")
      VALUES
        ($1, $2, $3, $4, 'TEACHER', false, 'TEACHER', $5, true, NOW(), NOW())
    `,
    [userId, username, teacher.name, passwordHash, teacher.id],
  );
  await syncTeacherCompatibilityRole(client, teacher.id);

  return { action: "created", userId };
}

async function planTeacherAccountRepair(client, teacher, duplicateUsernames) {
  const username = normalizeUsername(teacher.idCardNumber);
  const existing = await findUserByUsername(client, username);

  if (duplicateUsernames.has(username)) {
    return { action: "conflict_duplicate_identity" };
  }

  if (existing) {
    if (existing.teacherId === teacher.id) {
      return { action: "already_bound" };
    }

    if (existing.teacherId || existing.studentId) {
      return { action: "conflict_existing_bound", userId: existing.id };
    }

    return { action: "would_bind_existing", userId: existing.id };
  }

  return { action: "would_create" };
}

async function ensureStudentAccount(client, student) {
  const username = normalizeUsername(student.idCardNumber);
  const existing = await findUserByUsername(client, username);

  if (existing) {
    if (existing.studentId === student.id) {
      return { action: "already_bound" };
    }

    if (existing.teacherId || existing.studentId) {
      return { action: "conflict", userId: existing.id };
    }

    await client.query(
      `
        UPDATE "User"
        SET
          "displayName" = $1,
          "accountType" = 'STUDENT',
          "studentId" = $2,
          "updatedAt" = NOW()
        WHERE "id" = $3
      `,
      [student.name, student.id, existing.id],
    );

    return { action: "bound_existing", userId: existing.id };
  }

  const passwordHash = await bcrypt.hash(initialPassword(username), 12);
  const userId = `repair_user_${randomUUID()}`;

  await client.query(
    `
      INSERT INTO "User"
        ("id", "username", "displayName", "passwordHash", "accountType", "isSuperAdmin", "role", "studentId", "isActive", "createdAt", "updatedAt")
      VALUES
        ($1, $2, $3, $4, 'STUDENT', false, 'TEACHER', $5, true, NOW(), NOW())
    `,
    [userId, username, student.name, passwordHash, student.id],
  );

  return { action: "created", userId };
}

async function planStudentAccountRepair(client, student, duplicateUsernames) {
  const username = normalizeUsername(student.idCardNumber);
  const existing = await findUserByUsername(client, username);

  if (duplicateUsernames.has(username)) {
    return { action: "conflict_duplicate_identity" };
  }

  if (existing) {
    if (existing.studentId === student.id) {
      return { action: "already_bound" };
    }

    if (existing.teacherId || existing.studentId) {
      return { action: "conflict_existing_bound", userId: existing.id };
    }

    return { action: "would_bind_existing", userId: existing.id };
  }

  return { action: "would_create" };
}

function findDuplicateCandidateUsernames(teachers, students) {
  const counts = new Map();

  for (const teacher of teachers) {
    if (!isUsableIdentity(teacher.idCardNumber)) {
      continue;
    }

    const username = normalizeUsername(teacher.idCardNumber);
    counts.set(username, (counts.get(username) ?? 0) + 1);
  }

  for (const student of students) {
    if (student.isArchived || !isUsableIdentity(student.idCardNumber)) {
      continue;
    }

    const username = normalizeUsername(student.idCardNumber);
    counts.set(username, (counts.get(username) ?? 0) + 1);
  }

  return new Set(
    [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([username]) => username),
  );
}

function printSummary(summary) {
  console.log(JSON.stringify(summary, null, 2));
}

loadLocalEnv();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const apply = isApplyMode();
const pool = new pg.Pool({ connectionString });
const summary = {
  mode: apply ? "apply" : "dry-run",
  teachers: {
    candidates: 0,
    createOrBind: 0,
    created: 0,
    boundExisting: 0,
    skippedInvalidIdentity: 0,
    conflicts: 0,
  },
  students: {
    candidates: 0,
    createOrBind: 0,
    created: 0,
    boundExisting: 0,
    skippedArchived: 0,
    skippedInvalidIdentity: 0,
    conflicts: 0,
  },
  details: [],
};

try {
  const client = await pool.connect();

  try {
    const teachers = await loadTeacherCandidates(client);
    const students = await loadStudentCandidates(client);
    const duplicateUsernames = findDuplicateCandidateUsernames(teachers, students);
    summary.teachers.candidates = teachers.length;
    summary.students.candidates = students.length;

    await client.query("BEGIN");

    for (const teacher of teachers) {
      if (!isUsableIdentity(teacher.idCardNumber)) {
        summary.teachers.skippedInvalidIdentity += 1;
        summary.details.push({
          type: "teacher",
          id: teacher.id,
          name: teacher.name,
          idCardNumber: maskIdentity(teacher.idCardNumber),
          action: "skipped_invalid_identity",
        });
        continue;
      }

      const plan = await planTeacherAccountRepair(client, teacher, duplicateUsernames);
      const result = apply && !plan.action.startsWith("conflict")
        ? await ensureTeacherAccount(client, teacher)
        : plan;

      if (result.action === "created") {
        summary.teachers.created += 1;
      } else if (result.action === "bound_existing") {
        summary.teachers.boundExisting += 1;
      } else if (result.action.startsWith("conflict")) {
        summary.teachers.conflicts += 1;
      } else {
        summary.teachers.createOrBind += 1;
      }

      summary.details.push({
        type: "teacher",
        id: teacher.id,
        name: teacher.name,
        idCardNumber: maskIdentity(teacher.idCardNumber),
        action: result.action,
      });
    }

    for (const student of students) {
      if (student.isArchived) {
        summary.students.skippedArchived += 1;
        continue;
      }

      if (!isUsableIdentity(student.idCardNumber)) {
        summary.students.skippedInvalidIdentity += 1;
        summary.details.push({
          type: "student",
          id: student.id,
          name: student.name,
          idCardNumber: maskIdentity(student.idCardNumber),
          action: "skipped_invalid_identity",
        });
        continue;
      }

      const plan = await planStudentAccountRepair(client, student, duplicateUsernames);
      const result = apply && !plan.action.startsWith("conflict")
        ? await ensureStudentAccount(client, student)
        : plan;

      if (result.action === "created") {
        summary.students.created += 1;
      } else if (result.action === "bound_existing") {
        summary.students.boundExisting += 1;
      } else if (result.action.startsWith("conflict")) {
        summary.students.conflicts += 1;
      } else {
        summary.students.createOrBind += 1;
      }

      summary.details.push({
        type: "student",
        id: student.id,
        name: student.name,
        idCardNumber: maskIdentity(student.idCardNumber),
        action: result.action,
      });
    }

    if (apply) {
      if (summary.teachers.conflicts > 0 || summary.students.conflicts > 0) {
        await client.query("ROLLBACK");
        printSummary(summary);
        throw new Error("Conflicting identity accounts found. No changes were committed.");
      }

      await client.query("COMMIT");
    } else {
      await client.query("ROLLBACK");
    }
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Ignore rollback errors after the transaction has already been closed.
    }
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}

printSummary(summary);

if (!apply) {
  console.log("Dry run only. Re-run with --apply to create or bind missing accounts.");
}
