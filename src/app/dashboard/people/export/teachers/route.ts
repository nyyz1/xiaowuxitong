import { handleTeacherExportRequest } from "@/modules/people/routes";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleTeacherExportRequest(request);
}
