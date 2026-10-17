import { WorkerDetailPage } from "@/features/workers/pages/worker-detail-page";
import type { WorkerRouteProps } from "@/features/workers/types/worker-ui.types";

export const instant = false;

export default async function Page({ params }: WorkerRouteProps) {
  const { companyId, workerId } = await params;
  return <WorkerDetailPage companyId={companyId} workerId={workerId} />;
}
