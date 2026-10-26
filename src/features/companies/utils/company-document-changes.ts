import type { ChecklistSelection } from "@/domain/company-profile/types/profile.types";
import {
  appliesToProfile,
  parseChecklist,
} from "@/domain/company-profile/utils/profile";
import type {
  CompanyPreparation,
  TemplateItem,
} from "@/domain/documents/types/template.types";
import { applicableTemplateItems } from "@/features/deliverable-templates/utils/template-presentation";

export function companyDocumentChanges(
  current: CompanyPreparation["rows"],
  items: TemplateItem[],
  selection: ChecklistSelection,
) {
  const profile = parseChecklist(selection);
  const applicable = profile.success
    ? applicableTemplateItems(items, profile.data)
    : [];
  const additions = applicable.filter(
    (item) => !current.some((row) => row.code === item.code),
  );
  const removed = current.filter(
    (row) =>
      profile.success &&
      (!appliesToProfile(profile.data, row.module, row.condition) ||
        (row.from_template &&
          !applicable.some((item) => item.code === row.code))),
  );
  const kept = current.filter(
    (row) => !removed.some((item) => item.id === row.id),
  );
  return { additions, removed, kept };
}
