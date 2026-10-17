import { ObligationDetailPage } from "@/features/documents/pages/obligation-detail-page";
import type { ObligationRouteProps } from "@/features/documents/types/document-ui.types";
export const instant = false;
export default async function Page({ params }: ObligationRouteProps) {
  const { obligationId } = await params;
  return <ObligationDetailPage obligationId={obligationId} />;
}
