import { requireSystemAdmin } from "@/lib/authorization";
import { DataManagementPage } from "@/modules/data-management/page";
import { getDataManagementPageData } from "@/modules/data-management/queries";

type DataManagementRouteProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readSearchValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function DataManagementRoute({
  searchParams,
}: DataManagementRouteProps) {
  await requireSystemAdmin();

  const params = await searchParams;
  const data = await getDataManagementPageData({
    table: readSearchValue(params.table),
    q: readSearchValue(params.q),
    page: readSearchValue(params.page),
  });
  const message = readSearchValue(params.message);
  const tone = readSearchValue(params.tone) === "error" ? "error" : "success";

  return (
    <DataManagementPage
      data={data}
      notice={message ? { tone, message } : null}
    />
  );
}
