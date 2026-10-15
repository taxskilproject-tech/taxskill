import type { CompanyPageProps } from "@/features/auth/types/auth.types";
import { CompanyDetailPage } from "@/features/companies/pages/company-detail-page";

export const instant = false;

export default async function Page({ params }: CompanyPageProps) {
  const { companyId } = await params;
  return <CompanyDetailPage companyId={companyId} />;
}
