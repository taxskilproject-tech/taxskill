import { ACTIVITY_QUERY_KEYS } from "@/domain/activities/constants/activities";
import { activityFiltersSchema } from "@/domain/activities/contracts/activity.schema";
import type { ActivityFilters } from "@/domain/activities/types/activity.types";

export function parseActivityFilters(parameters: URLSearchParams) {
  return activityFiltersSchema.parse(
    Object.fromEntries(
      ACTIVITY_QUERY_KEYS.map((key) => [key, parameters.get(key) || undefined]),
    ),
  );
}
export function activityQueryInput(filters: ActivityFilters) {
  return {
    group: filters.group,
    sort: filters.sort,
    page: filters.page,
    pageSize: filters.pageSize,
    scope: filters.scope,
    company_id: filters.companyId,
    module: filters.module,
    class: filters.class,
    responsible_id: filters.responsibleId,
    period: filters.period,
    priority: filters.priority,
    due_from: filters.dueFrom,
    due_to: filters.dueTo,
    state: filters.state,
    q: filters.q,
  };
}
export function serializeActivityFilters(filters: ActivityFilters) {
  const parameters = new URLSearchParams();
  for (const [key, value] of Object.entries(filters))
    if (value !== undefined && value !== "") parameters.set(key, String(value));
  return parameters.toString();
}
