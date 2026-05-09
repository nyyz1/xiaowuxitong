import { requireSystemAdmin } from "@/lib/authorization";
import { getSchoolStructureSnapshot } from "@/modules/school-structure/queries";
import { SchoolStructurePage } from "@/modules/school-structure/page";

type StructurePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readMessageValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function StructureManagementPage({
  searchParams,
}: StructurePageProps) {
  await requireSystemAdmin();

  const params = await searchParams;
  const data = await getSchoolStructureSnapshot();
  const message = readMessageValue(params.message);
  const toneValue = readMessageValue(params.tone);

  const notice = message
    ? {
        tone: toneValue === "error" ? ("error" as const) : ("success" as const),
        message,
      }
    : null;

  return <SchoolStructurePage data={data} notice={notice} />;
}
