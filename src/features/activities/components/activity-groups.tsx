import { Button } from "@/components/atoms/button";
import {
  ACTIVITY_GROUP_LABELS,
  ACTIVITY_GROUPS,
} from "@/domain/activities/constants/activities";
import type { ActivityGroupsProps } from "@/features/activities/types/activity-ui.types";

export function ActivityGroups({
  filters,
  counts,
  onGroup,
}: ActivityGroupsProps) {
  return (
    <div className="space-y-2">
      <nav aria-label="Grupos de actividades" className="flex flex-wrap gap-2">
        {ACTIVITY_GROUPS.map((group) => (
          <Button
            aria-pressed={filters.group === group}
            key={group}
            onClick={() => onGroup(group)}
            variant={filters.group === group ? "primary" : "secondary"}
          >
            {ACTIVITY_GROUP_LABELS[group]} · {counts[group]}
          </Button>
        ))}
      </nav>
      <p className="text-xs text-zinc-500">
        Una actividad puede estar en varios grupos. Los contadores no se suman.
      </p>
    </div>
  );
}
