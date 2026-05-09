import "server-only";

import * as XLSX from "xlsx";
import { inspectionTargetTypeLabels } from "@/lib/validation/inspection";
import type {
  ReportFilters,
  SummaryRow,
  getInspectionReportData,
} from "@/modules/reporting/queries";

type InspectionReportData = Awaited<ReturnType<typeof getInspectionReportData>>;
type SpreadsheetCell = string | number | boolean | Date | null;

const summaryHeaders = [
  "统计维度",
  "名称",
  "补充说明",
  "记录数",
  "总值",
  "平均值",
  "最小值",
  "最大值",
] as const;

const studentDetailHeaders = [
  "记录日期",
  "检查项目",
  "年级",
  "班级",
  "结果数值",
  "备注内容",
] as const;

const teacherDetailHeaders = [
  "记录日期",
  "检查项目",
  "教师姓名",
  "结果数值",
  "备注内容",
] as const;

function numberValue(value: number) {
  return Number(value.toFixed(2));
}

function formatDay(value: Date) {
  return value.toISOString().slice(0, 10);
}

function buildInspectionItemLabel(record: InspectionReportData["records"][number]) {
  return `${record.inspectionItem.category.name} / ${record.inspectionItem.name}`;
}

function filterText(filters: ReportFilters) {
  return [
    `量化类型：${inspectionTargetTypeLabels[filters.targetType]}`,
    filters.dateFrom ? `开始日期：${filters.dateFrom}` : "开始日期：不限",
    filters.dateTo ? `结束日期：${filters.dateTo}` : "结束日期：不限",
    filters.categoryId ? `分类ID：${filters.categoryId}` : "分类：全部",
    filters.itemId ? `项目ID：${filters.itemId}` : "项目：全部",
    filters.targetType === "TEACHER"
      ? filters.teacherId
        ? `教师ID：${filters.teacherId}`
        : "教师：全部"
      : filters.gradeId
        ? `年级ID：${filters.gradeId}`
        : "年级：全部",
    filters.targetType === "TEACHER"
      ? "班级：不适用"
      : filters.classId
        ? `班级ID：${filters.classId}`
        : "班级：全部",
  ].join("；");
}

function summaryRows(dimension: string, rows: SummaryRow[]) {
  return rows.map((row) => [
    dimension,
    row.label,
    row.subLabel,
    row.recordCount,
    numberValue(row.totalValue),
    numberValue(row.averageValue),
    numberValue(row.minValue),
    numberValue(row.maxValue),
  ]);
}

function buildDetailHeaders(targetType: InspectionReportData["targetType"]) {
  return targetType === "TEACHER" ? teacherDetailHeaders : studentDetailHeaders;
}

function buildDetailRows(data: InspectionReportData) {
  if (data.targetType === "TEACHER") {
    return data.records.map((record) => [
      formatDay(record.inspectionDate),
      buildInspectionItemLabel(record),
      record.teacher?.name ?? "未关联教师",
      numberValue(record.value),
      record.remarks ?? "",
    ]);
  }

  return data.records.map((record) => [
    formatDay(record.inspectionDate),
    buildInspectionItemLabel(record),
    record.grade?.name ?? "未关联年级",
    record.class?.name ?? "全年级",
    numberValue(record.value),
    record.remarks ?? "",
  ]);
}

function appendSheet(
  workbook: XLSX.WorkBook,
  sheetName: string,
  headers: readonly string[],
  rows: SpreadsheetCell[][],
) {
  const worksheet = XLSX.utils.aoa_to_sheet([[...headers], ...rows]);

  worksheet["!cols"] = headers.map((header, index) => ({
    wch: Math.max(12, index <= 2 ? 26 : header.length * 2 + 4),
  }));

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
}

export function buildInspectionReportWorkbookBuffer(data: InspectionReportData) {
  const workbook = XLSX.utils.book_new();
  const scopeDimensionLabel = data.targetType === "TEACHER" ? "教师" : "年级/班级";
  const scopeSheetName = data.targetType === "TEACHER" ? "按教师" : "按年级班级";

  appendSheet(
    workbook,
    "统计概览",
    ["指标", "数值"],
    [
      ["量化类型", inspectionTargetTypeLabels[data.targetType]],
      ["筛选条件", filterText(data.filters)],
      ["匹配记录数", data.kpis.matchedRecords],
      ["本次统计记录数", data.kpis.loadedRecords],
      ["是否超过统计上限", data.kpis.isTruncated ? "是" : "否"],
      ["统计上限", data.recordLimit],
      ["总值", numberValue(data.kpis.totalValue)],
      ["平均值", numberValue(data.kpis.averageValue)],
      ["最小值", numberValue(data.kpis.minValue)],
      ["最大值", numberValue(data.kpis.maxValue)],
    ],
  );
  appendSheet(workbook, "检查明细", buildDetailHeaders(data.targetType), buildDetailRows(data));
  appendSheet(workbook, "按检查项目", summaryHeaders, summaryRows("检查项目", data.byItem));
  appendSheet(workbook, scopeSheetName, summaryHeaders, summaryRows(scopeDimensionLabel, data.byScope));
  appendSheet(workbook, "按日期", summaryHeaders, summaryRows("日期", data.byDate));
  appendSheet(workbook, "按结果类型", summaryHeaders, summaryRows("结果类型", data.byValueType));

  return XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  }) as Buffer;
}

function escapeCsvCell(value: SpreadsheetCell) {
  const text =
    value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? "");

  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

export function buildInspectionReportCsv(data: InspectionReportData) {
  const rows: SpreadsheetCell[][] = [
    [...buildDetailHeaders(data.targetType)],
    ...buildDetailRows(data),
  ];

  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
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

export function csvResponse(content: string, filename: string) {
  const encodedFilename = encodeURIComponent(filename);
  const body = new TextEncoder().encode(`\uFEFF${content}`);

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
      "Cache-Control": "no-store",
    },
  });
}
