import { handleInspectionXlsxExportRequest } from "@/modules/reporting/routes";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleInspectionXlsxExportRequest(request);
}
