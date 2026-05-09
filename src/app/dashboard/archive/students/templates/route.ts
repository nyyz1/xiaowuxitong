import { handleArchiveStudentTemplateRequest } from "@/modules/alumni-archive/routes";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleArchiveStudentTemplateRequest();
}
