export const ACTIVITY_GROUPS = [
  "mine",
  "review",
  "overdue",
  "upcoming",
  "observed",
  "all",
] as const;
export const ACTIVITY_GROUP_LABELS = {
  mine: "Mis entregas",
  review: "Por revisar",
  overdue: "Vencidas",
  upcoming: "Próximas",
  observed: "Observadas",
  all: "Todas",
};
export const ACTIVITY_SORTS = [
  "urgency",
  "priority",
  "due_date",
  "received_at",
] as const;
export const ACTIVITY_QUERY_KEYS = [
  "companyId",
  "scope",
  "module",
  "class",
  "responsibleId",
  "period",
  "priority",
  "dueFrom",
  "dueTo",
  "state",
  "q",
  "group",
  "sort",
  "page",
  "pageSize",
] as const;
