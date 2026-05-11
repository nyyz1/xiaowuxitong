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

const defaults = [
  {
    name: "日常报修申请",
    kind: "MAINTENANCE",
    responsibilityKind: null,
    description: "教师提交教室、办公室、设备等日常报修事项。",
  },
  {
    name: "日常材料打印申请",
    kind: "PRINT",
    responsibilityKind: null,
    description: "教师提交教学用、年级行政用、学校行政用材料打印申请。",
  },
  {
    name: "其他申请",
    kind: "OTHER",
    responsibilityKind: "OTHER",
    description: "学校可临时使用的通用申请类型。",
  },
];

const client = new pg.Client({ connectionString });
await client.connect();

try {
  for (const item of defaults) {
    await client.query(
      `
        INSERT INTO "ApprovalType"
          ("id", "name", "kind", "responsibilityKind", "description", "isActive", "createdAt", "updatedAt")
        VALUES
          (concat('approval_type_', md5($1)), $1, $2::"ApprovalRequestKind", $3::"ApprovalResponsibilityKind", $4, true, now(), now())
        ON CONFLICT ("name") DO UPDATE SET
          "kind" = EXCLUDED."kind",
          "responsibilityKind" = EXCLUDED."responsibilityKind",
          "description" = EXCLUDED."description",
          "isActive" = true,
          "updatedAt" = now()
      `,
      [item.name, item.kind, item.responsibilityKind, item.description],
    );
  }
} finally {
  await client.end();
}

console.log(`Seeded ${defaults.length} approval request types.`);
