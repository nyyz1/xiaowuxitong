import { requireSystemAdmin } from "@/lib/authorization";
import { getUserManagementData } from "@/modules/users/queries";
import { UsersPage } from "@/modules/users/page";

type UserManagementPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readMessageValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function UserManagementPage({
  searchParams,
}: UserManagementPageProps) {
  await requireSystemAdmin();

  const params = await searchParams;
  const data = await getUserManagementData();
  const message = readMessageValue(params.message);
  const toneValue = readMessageValue(params.tone);
  const notice = message
    ? {
        tone: toneValue === "error" ? ("error" as const) : ("success" as const),
        message,
      }
    : null;

  return <UsersPage data={data} notice={notice} />;
}
