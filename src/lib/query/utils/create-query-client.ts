import { QueryClient } from "@tanstack/react-query";

import {
  QUERY_RETRY_COUNT,
  QUERY_STALE_TIME_MS,
} from "@/lib/query/constants/query";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: {
        refetchOnWindowFocus: false,
        retry: QUERY_RETRY_COUNT,
        staleTime: QUERY_STALE_TIME_MS,
      },
    },
  });
}
