import { handleInspectionCsvExportRequest } from "@/modules/reporting/routes";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleInspectionCsvExportRequest(request);
}
