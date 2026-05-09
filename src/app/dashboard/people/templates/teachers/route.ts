import { handleTeacherTemplateRequest } from "@/modules/people/routes";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleTeacherTemplateRequest();
}
