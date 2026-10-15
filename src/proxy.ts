import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getPublicEnvironment } from "@/config/env/public-env";
import type { Database } from "@/lib/supabase/types/database.types";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  const environment = getPublicEnvironment();
  if (!environment.ok) return response;
  const hasCookie = request.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"),
    );
  if (!hasCookie) return response;
  const client = createServerClient<Database>(
    environment.data.supabaseUrl,
    environment.data.publishableKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (entries, headers) => {
          entries.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          entries.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([name, value]) =>
            response.headers.set(name, value),
          );
          response.headers.set("Cache-Control", "private, no-store");
        },
      },
    },
  );
  const { error } = await client.auth.getClaims();
  if (error) response.headers.set("X-Auth-Refresh", "required");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
