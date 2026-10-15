import type { UserRouteContext } from "@/features/auth/types/auth.types";
import { handleAdminRoute } from "@/features/users/services/admin-route.server";

export async function PATCH(request: Request, context: UserRouteContext) {
  const { userId } = await context.params;
  return handleAdminRoute({ request, operation: "SetUserEnabled", userId });
}
