import type {
  ChecklistSelection,
  DocumentaryProfile,
} from "@/domain/company-profile/types/profile.types";
import type { CatalogRow } from "@/domain/documents/types/document.types";
import type {
  DeliverableTemplate,
  TemplateItem,
  TemplateVersion,
} from "@/domain/documents/types/template.types";

export interface CompanyChecklistProps {
  value: ChecklistSelection;
  onChange: (value: ChecklistSelection) => void;
  disabled?: boolean;
}
export interface TemplateItemsProps {
  items: TemplateItem[];
  issues: TemplateVersion["issues"];
  onEdit: (item: TemplateItem) => void;
}
export interface TemplateEditorProps {
  item: TemplateItem;
  busy: boolean;
  error: string | null;
  onSave: (item: TemplateItem) => Promise<boolean>;
  onCancel: () => void;
}
export interface TemplateWorkspaceProps {
  template: DeliverableTemplate;
  onChanged: () => void;
}
export interface TemplatePreviewProps {
  items: TemplateItem[];
  profile: DocumentaryProfile;
}
export interface TemplateAddProps {
  items: TemplateItem[];
  busy: boolean;
  error: string | null;
  onAdd: (item: CatalogRow) => void;
}
export interface CatalogUsageProps {
  id: string;
}
