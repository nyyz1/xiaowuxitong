import { handleArchiveStudentExportRequest } from "@/modules/alumni-archive/routes";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleArchiveStudentExportRequest(request);
}
