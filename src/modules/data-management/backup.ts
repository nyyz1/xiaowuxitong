import "server-only";

import { execFile } from "node:child_process";
import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function timestampForFile(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "_",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function resolvePgDumpPath() {
  const configuredPath = process.env.PG_DUMP_PATH?.trim();

  if (configuredPath) {
    return configuredPath;
  }

  return "D:\\PostgreSQL\\17\\bin\\pg_dump.exe";
}

async function resolveExistingPgDumpPath() {
  const configuredPath = process.env.PG_DUMP_PATH?.trim();
  const candidatePaths = [
    configuredPath,
    "D:\\PostgreSQL\\17\\bin\\pg_dump.exe",
    "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe",
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidatePath of candidatePaths) {
    try {
      await access(candidatePath);
      return candidatePath;
    } catch {
      // Try the next common Windows PostgreSQL install location.
    }
  }

  return resolvePgDumpPath();
}

function resolveBackupDir() {
  return (
    process.env.DATA_BACKUP_DIR?.trim() ||
    path.join(process.cwd(), "artifacts", "data-management-backups")
  );
}

function resolveDatabaseName(connectionString: string) {
  try {
    const parsed = new URL(connectionString);
    const databaseName = parsed.pathname.replace(/^\//, "");
    return databaseName || "school_affairs";
  } catch {
    return "school_affairs";
  }
}

function normalizePgDumpConnectionString(connectionString: string) {
  try {
    const parsed = new URL(connectionString);
    parsed.searchParams.delete("schema");
    return parsed.toString();
  } catch {
    return connectionString;
  }
}

export type DataManagementBackupResult = {
  filePath: string;
  pgDumpPath: string;
};

export async function createDataManagementBackup() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL 未配置，不能在删除前创建数据库备份。");
  }

  const pgDumpPath = await resolveExistingPgDumpPath();
  const backupDir = resolveBackupDir();
  await mkdir(backupDir, { recursive: true });

  const databaseName = resolveDatabaseName(connectionString);
  const filePath = path.join(backupDir, `${databaseName}_${timestampForFile()}.dump`);
  const pgDumpConnectionString = normalizePgDumpConnectionString(connectionString);

  try {
    await execFileAsync(pgDumpPath, [
      "--format=custom",
      "--file",
      filePath,
      pgDumpConnectionString,
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `删除前数据库备份失败，已取消删除。请检查 pg_dump 路径和数据库连接。${message}`,
    );
  }

  return {
    filePath,
    pgDumpPath,
  } satisfies DataManagementBackupResult;
}
