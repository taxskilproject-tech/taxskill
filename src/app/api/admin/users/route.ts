import { handleAdminRoute } from "@/features/users/services/admin-route.server";

export async function POST(request: Request) {
  return handleAdminRoute({ request, operation: "CreateUser" });
}
