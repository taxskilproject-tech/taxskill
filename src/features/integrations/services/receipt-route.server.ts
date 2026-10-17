import "server-only";

import {
  receiptResultSchema,
  whatsappReceiptSchema,
} from "@/domain/integrations/contracts/whatsapp.schema";
import { readReceiptBody } from "@/features/integrations/utils/read-receipt-body.server";
import { verifyReceiptSecret } from "@/features/integrations/utils/verify-receipt-secret.server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin.server";
import { asJson } from "@/lib/supabase/utils/as-json";

const HEADERS = { "Cache-Control": "no-store" };
export async function handleReceipt(request: Request) {
  if (
    !process.env.N8N_RECEIPT_TOKEN ||
    process.env.N8N_RECEIPT_TOKEN.length < 32
  )
    return Response.json(
      { error: "DEPENDENCY_UNAVAILABLE" },
      { status: 503, headers: HEADERS },
    );
  if (
    !verifyReceiptSecret(
      request.headers.get("authorization"),
      process.env.N8N_RECEIPT_TOKEN,
    )
  )
    return Response.json(
      { error: "UNAUTHENTICATED" },
      { status: 401, headers: HEADERS },
    );
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return Response.json(
      { error: "VALIDATION_ERROR" },
      { status: 415, headers: HEADERS },
    );
  try {
    const parsed = whatsappReceiptSchema.safeParse(
      await readReceiptBody(request),
    );
    if (!parsed.success)
      return Response.json(
        { error: "VALIDATION_ERROR" },
        { status: 422, headers: HEADERS },
      );
    const client = createSupabaseAdminClient();
    if (!client.ok)
      return Response.json(
        { error: "DEPENDENCY_UNAVAILABLE" },
        { status: 503, headers: HEADERS },
      );
    const response = await client.data.rpc("h06_receive_receipt", {
      p_receipt: asJson(parsed.data),
    });
    if (response.error) {
      const status =
        response.error.message === "NOT_FOUND"
          ? 404
          : response.error.message === "CONFLICT"
            ? 409
            : response.error.message === "VALIDATION_ERROR"
              ? 422
              : 503;
      return Response.json(
        {
          error:
            status === 503 ? "DEPENDENCY_UNAVAILABLE" : response.error.message,
        },
        { status, headers: HEADERS },
      );
    }
    const result = receiptResultSchema.safeParse(response.data);
    if (!result.success)
      return Response.json(
        { error: "DEPENDENCY_UNAVAILABLE" },
        { status: 503, headers: HEADERS },
      );
    return Response.json(result.data, { headers: HEADERS });
  } catch (cause) {
    const tooLarge =
      cause instanceof Error && cause.message === "FILE_TOO_LARGE";
    const invalid =
      cause instanceof SyntaxError ||
      (cause instanceof Error && cause.message === "VALIDATION_ERROR");
    return Response.json(
      {
        error: tooLarge
          ? "FILE_TOO_LARGE"
          : invalid
            ? "VALIDATION_ERROR"
            : "DEPENDENCY_UNAVAILABLE",
      },
      { status: tooLarge ? 413 : invalid ? 422 : 503, headers: HEADERS },
    );
  }
}
