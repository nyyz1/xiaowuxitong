import "server-only";

import * as XLSX from "xlsx";
import type { ProfileFieldDefinitionLike } from "@/modules/people/helpers";

type ProfileFieldTargetType = "TEACHER" | "STUDENT";

export type SpreadsheetCell = string | number | boolean | Date | null;

export const teacherBaseTemplateHeaders = [
  "身份证号*",
  "姓名*",
  "归属部门",
  "学科",
  "任职状态",
] as const;

export const studentBaseTemplateHeaders = [
  "身份证号*",
  "姓名*",
  "年级*",
  "班级",
  "在校状态",
] as const;

export const teacherImportColumnAliases = {
  idCardNumber: ["身份证号*", "身份证号", "idCardNumber"],
  name: ["姓名*", "姓名", "name"],
  departments: ["归属部门", "部门", "department"],
  subject: ["学科", "subject"],
  employmentStatus: ["任职状态", "状态", "employmentStatus"],
} as const;

export const studentImportColumnAliases = {
  idCardNumber: ["身份证号*", "身份证号", "idCardNumber"],
  name: ["姓名*", "姓名", "name"],
  grade: ["年级*", "年级", "grade"],
  className: ["班级", "class"],
  enrollmentStatus: ["在校状态", "状态", "enrollmentStatus"],
} as const;

export function buildTemplateHeaders(
  baseHeaders: readonly string[],
  profileFields: ProfileFieldDefinitionLike[],
) {
  return [
    ...baseHeaders,
    ...profileFields.filter((field) => field.isActive).map((field) => field.name),
  ];
}

export function getReservedProfileFieldNames(targetType: ProfileFieldTargetType) {
  const aliases =
    targetType === "TEACHER"
      ? teacherImportColumnAliases
      : studentImportColumnAliases;

  return new Set(
    Object.values(aliases)
      .flat()
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

export function buildWorkbookBuffer(
  sheetName: string,
  headers: readonly string[],
  rows: SpreadsheetCell[][],
) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([[...headers], ...rows]);

  worksheet["!cols"] = headers.map((header) => ({
    wch: Math.max(12, header.length * 2 + 4),
  }));

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  return XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  }) as Buffer;
}

export function parseFirstWorksheet(fileBuffer: ArrayBuffer) {
  const workbook = XLSX.read(fileBuffer, {
    type: "array",
    cellDates: false,
  });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return [];
  }

  const worksheet = workbook.Sheets[firstSheetName];

  return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
    raw: false,
  });
}

export function getCellText(row: Record<string, unknown>, keys: readonly string[]) {
  for (const key of keys) {
    const value = row[key];

    if (value !== undefined && value !== null) {
      return String(value).trim();
    }
  }

  return "";
}

export function spreadsheetResponse(buffer: Buffer, filename: string) {
  const encodedFilename = encodeURIComponent(filename);
  const body = new Uint8Array(buffer);

  return new Response(body, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
      "Cache-Control": "no-store",
    },
  });
}
