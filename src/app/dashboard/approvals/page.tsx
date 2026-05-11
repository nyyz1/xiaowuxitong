import { requireApprovalAccess } from "@/lib/authorization";
import { ApprovalsPage } from "@/modules/approvals/page";
import { getApprovalPageData } from "@/modules/approvals/queries";

type ApprovalsRouteProps = {
  searchParams?: Promise<{
    message?: string;
    tone?: string;
  }>;
};

export default async function ApprovalsRoute({ searchParams }: ApprovalsRouteProps) {
  const session = await requireApprovalAccess();
  const params = await searchParams;
  const data = await getApprovalPageData(session);
  const notice =
    params?.message && params.tone
      ? {
          message: params.message,
          tone: params.tone === "error" ? ("error" as const) : ("success" as const),
        }
      : null;

  return <ApprovalsPage data={data} session={session} notice={notice} />;
}

