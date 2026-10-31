import "server-only";
import { z } from "zod";

import { SUNAT_BUCKET } from "@/domain/sunat/constants/sunat";
import { sunatDownloadSchema } from "@/domain/sunat/contracts/sunat.schema";
import {
  authorizeSunatRoute,
  readSunatRequest,
  sunatRouteError,
  sunatRouteSuccess,
} from "@/features/sunat-mailbox/services/route-security.server";
import { decodeRpc } from "@/lib/supabase/utils/decode-rpc";

const fileSchema = z.object({ object_name: z.string(), filename: z.string() });

export async function downloadSunatRoute(request: Request): Promise<Response> {
  try {
    const input = sunatDownloadSchema.safeParse(
      await readSunatRequest(request),
    );
    if (!input.success) throw { code: "VALIDATION_ERROR" };
    const { context, admin } = await authorizeSunatRoute(
      input.data.organization_id,
      false,
    );
    const response = await admin.rpc("h10_download_authorize", {
      p_organization_id: context.organization.id,
      p_actor_id: context.profile.user_id,
      p_session_id: context.session_id,
      p_attachment_id: input.data.attachment_id,
      p_request_id: input.data.request_id,
    });
    const file = decodeRpc(response.data, response.error, fileSchema);
    if (!file.ok) throw file.error;
    const signed = await admin.storage
      .from(SUNAT_BUCKET)
      .createSignedUrl(file.data.object_name, 60, {
        download: file.data.filename,
      });
    if (signed.error || !signed.data) throw { code: "DEPENDENCY_UNAVAILABLE" };
    return sunatRouteSuccess({
      url: signed.data.signedUrl,
      filename: file.data.filename,
    });
  } catch (error) {
    return sunatRouteError(error);
  }
}
