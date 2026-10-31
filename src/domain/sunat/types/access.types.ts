export interface SunatAccessContext {
  member: { is_admin: boolean; member_type: string };
  mailbox_company_ids?: string[];
}
