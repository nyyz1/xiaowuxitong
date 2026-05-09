import { getManagedGradeId, requireReportViewer } from "@/lib/authorization";
import { inspectionTargetTypeLabels } from "@/lib/validation/inspection";
import { recordInspectionReportExport } from "@/modules/reporting/audit";
import {
  buildInspectionReportCsv,
  buildInspectionReportWorkbookBuffer,
  csvResponse,
  spreadsheetResponse,
} from "@/modules/reporting/export";
import {
  getEffectiveReportFilters,
  getInspectionReportData,
  normalizeReportFilters,
} from "@/modules/reporting/queries";

function paramsToRecord(searchParams: URLSearchParams) {
  return Object.fromEntries(searchParams.entries());
}

function buildReportFilename(targetType: "STUDENT" | "TEACHER", extension: "xlsx" | "csv") {
  const label = inspectionTargetTypeLabels[targetType];
  return `${label}统计导出.${extension}`;
}

export async function handleInspectionXlsxExportRequest(request: Request) {
  const session = await requireReportViewer();
  const url = new URL(request.url);
  const filters = getEffectiveReportFilters(
    normalizeReportFilters(paramsToRecord(url.searchParams)),
    getManagedGradeId(session),
  );
  const data = await getInspectionReportData(filters, {
    recordTake: 50000,
    gradeScopeId: getManagedGradeId(session),
  });
  const buffer = buildInspectionReportWorkbookBuffer(data);

  await recordInspectionReportExport({
    session,
    format: "xlsx",
    summary: `导出${inspectionTargetTypeLabels[data.targetType]}统计 Excel，匹配 ${data.kpis.matchedRecords} 条记录。`,
    metadata: {
      filters,
      matchedRecords: data.kpis.matchedRecords,
      loadedRecords: data.kpis.loadedRecords,
      targetType: data.targetType,
    },
  });

  return spreadsheetResponse(buffer, buildReportFilename(data.targetType, "xlsx"));
}

export async function handleInspectionCsvExportRequest(request: Request) {
  const session = await requireReportViewer();
  const url = new URL(request.url);
  const filters = getEffectiveReportFilters(
    normalizeReportFilters(paramsToRecord(url.searchParams)),
    getManagedGradeId(session),
  );
  const data = await getInspectionReportData(filters, {
    recordTake: 50000,
    gradeScopeId: getManagedGradeId(session),
  });
  const csv = buildInspectionReportCsv(data);

  await recordInspectionReportExport({
    session,
    format: "csv",
    summary: `导出${inspectionTargetTypeLabels[data.targetType]}统计 CSV，匹配 ${data.kpis.matchedRecords} 条记录。`,
    metadata: {
      filters,
      matchedRecords: data.kpis.matchedRecords,
      loadedRecords: data.kpis.loadedRecords,
      targetType: data.targetType,
    },
  });

  return csvResponse(csv, buildReportFilename(data.targetType, "csv"));
}
