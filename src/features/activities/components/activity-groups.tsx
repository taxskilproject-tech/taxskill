import { Button } from "@/components/atoms/button";
import { SelectField } from "@/components/molecules/select-field";
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
    <div className="space-y-1">
      <div className="sm:hidden">
        <SelectField
          id="activity-group"
          label="Grupo de actividades"
          value={filters.group}
          onChange={(event) => {
            const group = ACTIVITY_GROUPS.find(
              (item) => item === event.target.value,
            );
            if (group) onGroup(group);
          }}
        >
          {ACTIVITY_GROUPS.map((group) => (
            <option key={group} value={group}>
              {ACTIVITY_GROUP_LABELS[group]} · {counts[group]}
            </option>
          ))}
        </SelectField>
      </div>
      <nav
        aria-label="Grupos de actividades"
        className="hidden flex-wrap gap-1 sm:flex"
      >
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
        Los grupos pueden coincidir; sus contadores no se suman.
      </p>
    </div>
  );
}
