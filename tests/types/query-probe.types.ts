import type { QueryClient, QueryFunction } from "@tanstack/react-query";

export interface QueryProbeProps {
  queryFn: QueryFunction<string>;
  onClient: (client: QueryClient) => void;
}
