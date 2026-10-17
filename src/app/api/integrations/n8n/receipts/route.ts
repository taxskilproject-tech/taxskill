import { handleReceipt } from "@/features/integrations/services/receipt-route.server";

export async function POST(request: Request) {
  return handleReceipt(request);
}
