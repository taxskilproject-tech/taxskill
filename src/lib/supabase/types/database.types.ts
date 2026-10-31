// Generado con yarn db:types. No editar manualmente.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {

  "public": {
          Tables: {
            "access_grants": {
                  Row: {
                    "active": boolean,"company_id": string | null,"created_at": string,"created_by": string | null,"deleted_at": string | null,"deleted_by": string | null,"deletion_reason": string | null,"id": string,"member_id": string,"module": string,"organization_id": string,"revision": number,"role_id": string,"scope": string,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "active"?: boolean,"company_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"deletion_reason"?: string | null,"id"?: string,"member_id": string,"module": string,"organization_id": string,"revision"?: number,"role_id": string,"scope": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"company_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"deletion_reason"?: string | null,"id"?: string,"member_id"?: string,"module"?: string,"organization_id"?: string,"revision"?: number,"role_id"?: string,"scope"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "access_grants_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "access_grants_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "access_grants_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "access_grants_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "access_grants_organization_id_company_id_fkey"
      columns: ["organization_id","company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "access_grants_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "access_grants_organization_id_member_id_fkey"
      columns: ["organization_id","member_id"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["organization_id","member_id"]
    },{
      foreignKeyName: "access_grants_organization_id_member_id_fkey"
      columns: ["organization_id","member_id"]
isOneToOne: false
      referencedRelation: "organization_members"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "access_grants_organization_id_role_id_fkey"
      columns: ["organization_id","role_id"]
isOneToOne: false
      referencedRelation: "roles"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "access_grants_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "access_grants_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"app_sessions": {
                  Row: {
                    "authentication_method": string | null,"authentication_verified_at": string | null,"created_at": string,"created_by": string | null,"id": string,"last_seen_at": string | null,"organization_id": string,"registered_at": string,"revision": number,"revocation_reason": string | null,"revoked_at": string | null,"session_id": string,"updated_at": string,"updated_by": string | null,"user_id": string
                  }
                  Insert: {
                    "authentication_method"?: string | null,"authentication_verified_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"last_seen_at"?: string | null,"organization_id": string,"registered_at"?: string,"revision"?: number,"revocation_reason"?: string | null,"revoked_at"?: string | null,"session_id": string,"updated_at"?: string,"updated_by"?: string | null,"user_id": string
                  }
                  Update: {
                    "authentication_method"?: string | null,"authentication_verified_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"last_seen_at"?: string | null,"organization_id"?: string,"registered_at"?: string,"revision"?: number,"revocation_reason"?: string | null,"revoked_at"?: string | null,"session_id"?: string,"updated_at"?: string,"updated_by"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "app_sessions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "app_sessions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "app_sessions_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "app_sessions_organization_id_user_id_fkey"
      columns: ["organization_id","user_id"]
isOneToOne: false
      referencedRelation: "organization_members"
      referencedColumns: ["organization_id","user_id"]
    },{
      foreignKeyName: "app_sessions_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "app_sessions_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "app_sessions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "app_sessions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"audit_events": {
                  Row: {
                    "action": string,"actor_kind": string,"actor_user_id": string | null,"after_values": Json | null,"before_values": Json | null,"company_id": string | null,"created_at": string,"created_by": string | null,"id": string,"metadata": NonNullable<Json>,"module": string | null,"organization_id": string,"request_id": string,"resource_id": string,"resource_table": string,"system_actor": string | null
                  }
                  Insert: {
                    "action": string,"actor_kind": string,"actor_user_id"?: string | null,"after_values"?: Json | null,"before_values"?: Json | null,"company_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"module"?: string | null,"organization_id": string,"request_id": string,"resource_id": string,"resource_table": string,"system_actor"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_kind"?: string,"actor_user_id"?: string | null,"after_values"?: Json | null,"before_values"?: Json | null,"company_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"module"?: string | null,"organization_id"?: string,"request_id"?: string,"resource_id"?: string,"resource_table"?: string,"system_actor"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_events_actor_user_id_fkey"
      columns: ["actor_user_id"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "audit_events_actor_user_id_fkey"
      columns: ["actor_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "audit_events_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "audit_events_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "audit_events_organization_id_company_id_fkey"
      columns: ["organization_id","company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "audit_events_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"companies": {
                  Row: {
                    "accountant_id": string | null,"address": string | null,"contact_email": string | null,"contact_phone": string | null,"control_start_date": string,"created_at": string,"created_by": string | null,"deleted_at": string | null,"deleted_by": string | null,"deletion_reason": string | null,"document_template_version_id": string | null,"documentary_profile": Json | null,"id": string,"legal_name": string,"legal_representative": string | null,"operation_pauses": NonNullable<Json>,"organization_id": string,"revision": number,"ruc": string,"status": string,"supervisor_id": string | null,"tax_regime": string | null,"tax_regime_code": string | null,"trade_name": string | null,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "accountant_id"?: string | null,"address"?: string | null,"contact_email"?: string | null,"contact_phone"?: string | null,"control_start_date": string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"deletion_reason"?: string | null,"document_template_version_id"?: string | null,"documentary_profile"?: Json | null,"id"?: string,"legal_name": string,"legal_representative"?: string | null,"operation_pauses"?: NonNullable<Json>,"organization_id": string,"revision"?: number,"ruc": string,"status"?: string,"supervisor_id"?: string | null,"tax_regime"?: string | null,"tax_regime_code"?: string | null,"trade_name"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "accountant_id"?: string | null,"address"?: string | null,"contact_email"?: string | null,"contact_phone"?: string | null,"control_start_date"?: string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"deletion_reason"?: string | null,"document_template_version_id"?: string | null,"documentary_profile"?: Json | null,"id"?: string,"legal_name"?: string,"legal_representative"?: string | null,"operation_pauses"?: NonNullable<Json>,"organization_id"?: string,"revision"?: number,"ruc"?: string,"status"?: string,"supervisor_id"?: string | null,"tax_regime"?: string | null,"tax_regime_code"?: string | null,"trade_name"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "companies_accountant_id_fkey"
      columns: ["accountant_id"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "companies_accountant_id_fkey"
      columns: ["accountant_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "companies_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "companies_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "companies_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "companies_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "companies_organization_id_accountant_id_fkey"
      columns: ["organization_id","accountant_id"]
isOneToOne: false
      referencedRelation: "organization_members"
      referencedColumns: ["organization_id","user_id"]
    },{
      foreignKeyName: "companies_organization_id_document_template_version_id_fkey"
      columns: ["organization_id","document_template_version_id"]
isOneToOne: false
      referencedRelation: "deliverable_template_versions"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "companies_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "companies_organization_id_supervisor_id_fkey"
      columns: ["organization_id","supervisor_id"]
isOneToOne: false
      referencedRelation: "organization_members"
      referencedColumns: ["organization_id","user_id"]
    },{
      foreignKeyName: "companies_supervisor_id_fkey"
      columns: ["supervisor_id"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "companies_supervisor_id_fkey"
      columns: ["supervisor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "companies_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "companies_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"company_module_settings": {
                  Row: {
                    "company_id": string,"created_at": string,"created_by": string | null,"deleted_at": string | null,"deleted_by": string | null,"deletion_reason": string | null,"delivery_responsible_id": string,"id": string,"module": string,"organization_id": string,"revision": number,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "company_id": string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"deletion_reason"?: string | null,"delivery_responsible_id": string,"id"?: string,"module": string,"organization_id": string,"revision"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"deletion_reason"?: string | null,"delivery_responsible_id"?: string,"id"?: string,"module"?: string,"organization_id"?: string,"revision"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_module_settings_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "company_module_settings_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "company_module_settings_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "company_module_settings_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "company_module_settings_delivery_responsible_id_fkey"
      columns: ["delivery_responsible_id"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "company_module_settings_delivery_responsible_id_fkey"
      columns: ["delivery_responsible_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "company_module_settings_organization_id_company_id_fkey"
      columns: ["organization_id","company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "company_module_settings_organization_id_delivery_responsib_fkey"
      columns: ["organization_id","delivery_responsible_id"]
isOneToOne: false
      referencedRelation: "organization_members"
      referencedColumns: ["organization_id","user_id"]
    },{
      foreignKeyName: "company_module_settings_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_module_settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "company_module_settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"deliverable_template_versions": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"items": NonNullable<Json>,"organization_id": string,"published_at": string | null,"revision": number,"template_id": string,"updated_at": string,"updated_by": string | null,"version_number": number
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"items"?: NonNullable<Json>,"organization_id": string,"published_at"?: string | null,"revision"?: number,"template_id": string,"updated_at"?: string,"updated_by"?: string | null,"version_number": number
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"items"?: NonNullable<Json>,"organization_id"?: string,"published_at"?: string | null,"revision"?: number,"template_id"?: string,"updated_at"?: string,"updated_by"?: string | null,"version_number"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "deliverable_template_versions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "deliverable_template_versions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "deliverable_template_versions_organization_id_template_id_fkey"
      columns: ["organization_id","template_id"]
isOneToOne: false
      referencedRelation: "deliverable_templates"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "deliverable_template_versions_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "deliverable_template_versions_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"deliverable_templates": {
                  Row: {
                    "created_at": string,"created_by": string | null,"deleted_at": string | null,"deleted_by": string | null,"deletion_reason": string | null,"id": string,"organization_id": string,"published_version_id": string | null,"regime_code": string,"revision": number,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"deletion_reason"?: string | null,"id"?: string,"organization_id": string,"published_version_id"?: string | null,"regime_code": string,"revision"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"deletion_reason"?: string | null,"id"?: string,"organization_id"?: string,"published_version_id"?: string | null,"regime_code"?: string,"revision"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "deliverable_templates_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "deliverable_templates_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "deliverable_templates_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "deliverable_templates_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "deliverable_templates_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deliverable_templates_organization_id_id_published_version_fkey"
      columns: ["organization_id","id","published_version_id"]
isOneToOne: false
      referencedRelation: "deliverable_template_versions"
      referencedColumns: ["organization_id","template_id","id"]
    },{
      foreignKeyName: "deliverable_templates_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "deliverable_templates_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"deliverables": {
                  Row: {
                    "created_at": string,"created_by": string | null,"current_version_id": string | null,"display_order": number,"id": string,"label": string,"obligation_id": string,"organization_id": string,"position_code": string,"review_state": string,"revision": number,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"current_version_id"?: string | null,"display_order": number,"id"?: string,"label": string,"obligation_id": string,"organization_id": string,"position_code": string,"review_state"?: string,"revision"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"current_version_id"?: string | null,"display_order"?: number,"id"?: string,"label"?: string,"obligation_id"?: string,"organization_id"?: string,"position_code"?: string,"review_state"?: string,"revision"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "deliverables_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "deliverables_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "deliverables_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deliverables_organization_id_id_current_version_id_fkey"
      columns: ["organization_id","id","current_version_id"]
isOneToOne: false
      referencedRelation: "document_versions"
      referencedColumns: ["organization_id","deliverable_id","id"]
    },{
      foreignKeyName: "deliverables_organization_id_obligation_id_fkey"
      columns: ["organization_id","obligation_id"]
isOneToOne: false
      referencedRelation: "h03_obligation_summary"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "deliverables_organization_id_obligation_id_fkey"
      columns: ["organization_id","obligation_id"]
isOneToOne: false
      referencedRelation: "obligations"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "deliverables_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "deliverables_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"document_types": {
                  Row: {
                    "active": boolean,"category": string | null,"code": string,"created_at": string,"created_by": string | null,"deleted_at": string | null,"deleted_by": string | null,"deletion_reason": string | null,"description": string | null,"id": string,"module": string,"name": string,"organization_id": string,"revision": number,"suggested_formats": (string)[],"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "active"?: boolean,"category"?: string | null,"code": string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"deletion_reason"?: string | null,"description"?: string | null,"id"?: string,"module": string,"name": string,"organization_id": string,"revision"?: number,"suggested_formats"?: (string)[],"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"category"?: string | null,"code"?: string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"deletion_reason"?: string | null,"description"?: string | null,"id"?: string,"module"?: string,"name"?: string,"organization_id"?: string,"revision"?: number,"suggested_formats"?: (string)[],"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "document_types_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "document_types_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "document_types_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "document_types_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "document_types_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "document_types_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "document_types_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"document_versions": {
                  Row: {
                    "comment": string | null,"created_at": string,"created_by": string | null,"cycle_id": string,"deliverable_id": string,"extension": string,"finalized_at": string,"id": string,"organization_id": string,"original_name": string,"sha256": string,"storage_bucket": string,"storage_path": string,"upload_intent_id": string,"uploaded_by": string,"validated_bytes": number,"validated_mime": string,"version_number": number
                  }
                  Insert: {
                    "comment"?: string | null,"created_at"?: string,"created_by"?: string | null,"cycle_id": string,"deliverable_id": string,"extension": string,"finalized_at": string,"id": string,"organization_id": string,"original_name": string,"sha256": string,"storage_bucket"?: string,"storage_path": string,"upload_intent_id": string,"uploaded_by": string,"validated_bytes": number,"validated_mime": string,"version_number": number
                  }
                  Update: {
                    "comment"?: string | null,"created_at"?: string,"created_by"?: string | null,"cycle_id"?: string,"deliverable_id"?: string,"extension"?: string,"finalized_at"?: string,"id"?: string,"organization_id"?: string,"original_name"?: string,"sha256"?: string,"storage_bucket"?: string,"storage_path"?: string,"upload_intent_id"?: string,"uploaded_by"?: string,"validated_bytes"?: number,"validated_mime"?: string,"version_number"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "document_versions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "document_versions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "document_versions_organization_id_deliverable_id_cycle_id_fkey"
      columns: ["organization_id","deliverable_id","cycle_id"]
isOneToOne: false
      referencedRelation: "submission_cycles"
      referencedColumns: ["organization_id","deliverable_id","id"]
    },{
      foreignKeyName: "document_versions_organization_id_deliverable_id_upload_in_fkey"
      columns: ["organization_id","deliverable_id","upload_intent_id"]
isOneToOne: false
      referencedRelation: "upload_intents"
      referencedColumns: ["organization_id","deliverable_id","id"]
    },{
      foreignKeyName: "document_versions_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "document_versions_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "document_versions_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"employment_periods": {
                  Row: {
                    "company_id": string,"contract_type": string | null,"created_at": string,"created_by": string | null,"currency": string,"department": string | null,"document_generation": NonNullable<Json>,"end_date": string | null,"id": string,"organization_id": string,"position": string | null,"reference_salary": number | null,"revision": number,"sequence_number": number,"start_date": string,"termination_notes": string | null,"termination_reason": string | null,"updated_at": string,"updated_by": string | null,"worker_id": string
                  }
                  Insert: {
                    "company_id": string,"contract_type"?: string | null,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"department"?: string | null,"document_generation"?: NonNullable<Json>,"end_date"?: string | null,"id"?: string,"organization_id": string,"position"?: string | null,"reference_salary"?: number | null,"revision"?: number,"sequence_number": number,"start_date": string,"termination_notes"?: string | null,"termination_reason"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"worker_id": string
                  }
                  Update: {
                    "company_id"?: string,"contract_type"?: string | null,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"department"?: string | null,"document_generation"?: NonNullable<Json>,"end_date"?: string | null,"id"?: string,"organization_id"?: string,"position"?: string | null,"reference_salary"?: number | null,"revision"?: number,"sequence_number"?: number,"start_date"?: string,"termination_notes"?: string | null,"termination_reason"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"worker_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "employment_periods_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "employment_periods_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "employment_periods_organization_id_company_id_worker_id_fkey"
      columns: ["organization_id","company_id","worker_id"]
isOneToOne: false
      referencedRelation: "workers"
      referencedColumns: ["organization_id","company_id","id"]
    },{
      foreignKeyName: "employment_periods_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "employment_periods_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "employment_periods_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"grant_permission_overrides": {
                  Row: {
                    "allowed": boolean,"created_at": string,"created_by": string | null,"deleted_at": string | null,"deleted_by": string | null,"deletion_reason": string | null,"grant_id": string,"id": string,"organization_id": string,"permission_id": string,"revision": number,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "allowed": boolean,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"deletion_reason"?: string | null,"grant_id": string,"id"?: string,"organization_id": string,"permission_id": string,"revision"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "allowed"?: boolean,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"deletion_reason"?: string | null,"grant_id"?: string,"id"?: string,"organization_id"?: string,"permission_id"?: string,"revision"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "grant_permission_overrides_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "grant_permission_overrides_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "grant_permission_overrides_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "grant_permission_overrides_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "grant_permission_overrides_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "grant_permission_overrides_organization_id_grant_id_fkey"
      columns: ["organization_id","grant_id"]
isOneToOne: false
      referencedRelation: "access_grants"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "grant_permission_overrides_organization_id_permission_id_fkey"
      columns: ["organization_id","permission_id"]
isOneToOne: false
      referencedRelation: "permissions"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "grant_permission_overrides_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "grant_permission_overrides_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"integration_attempts": {
                  Row: {
                    "attempt_number": number,"batch_id": string | null,"created_at": string,"created_by": string | null,"digest_id": string,"direction": string,"duration_ms": number | null,"error_code": string | null,"error_message": string | null,"http_status": number | null,"id": string,"occurred_at": string | null,"organization_id": string,"provider_message_id": string | null,"provider_status": string | null,"receipt_id": string | null,"result": NonNullable<Json>
                  }
                  Insert: {
                    "attempt_number": number,"batch_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"digest_id": string,"direction": string,"duration_ms"?: number | null,"error_code"?: string | null,"error_message"?: string | null,"http_status"?: number | null,"id"?: string,"occurred_at"?: string | null,"organization_id": string,"provider_message_id"?: string | null,"provider_status"?: string | null,"receipt_id"?: string | null,"result"?: NonNullable<Json>
                  }
                  Update: {
                    "attempt_number"?: number,"batch_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"digest_id"?: string,"direction"?: string,"duration_ms"?: number | null,"error_code"?: string | null,"error_message"?: string | null,"http_status"?: number | null,"id"?: string,"occurred_at"?: string | null,"organization_id"?: string,"provider_message_id"?: string | null,"provider_status"?: string | null,"receipt_id"?: string | null,"result"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "integration_attempts_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "integration_attempts_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "integration_attempts_organization_id_digest_id_fkey"
      columns: ["organization_id","digest_id"]
isOneToOne: false
      referencedRelation: "whatsapp_digests"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "integration_attempts_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"notification_events": {
                  Row: {
                    "company_id": string | null,"created_at": string,"created_by": string | null,"cycle_id": string | null,"event_key": string,"event_type": string,"id": string,"module": string | null,"obligation_id": string | null,"organization_id": string,"payload": NonNullable<Json>,"review_event_id": string | null,"threshold_days": number | null
                  }
                  Insert: {
                    "company_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"cycle_id"?: string | null,"event_key": string,"event_type": string,"id"?: string,"module"?: string | null,"obligation_id"?: string | null,"organization_id": string,"payload": NonNullable<Json>,"review_event_id"?: string | null,"threshold_days"?: number | null
                  }
                  Update: {
                    "company_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"cycle_id"?: string | null,"event_key"?: string,"event_type"?: string,"id"?: string,"module"?: string | null,"obligation_id"?: string | null,"organization_id"?: string,"payload"?: NonNullable<Json>,"review_event_id"?: string | null,"threshold_days"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_events_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "notification_events_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "notification_events_organization_id_company_id_fkey"
      columns: ["organization_id","company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "notification_events_organization_id_cycle_id_fkey"
      columns: ["organization_id","cycle_id"]
isOneToOne: false
      referencedRelation: "submission_cycles"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "notification_events_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notification_events_organization_id_obligation_id_fkey"
      columns: ["organization_id","obligation_id"]
isOneToOne: false
      referencedRelation: "h03_obligation_summary"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "notification_events_organization_id_obligation_id_fkey"
      columns: ["organization_id","obligation_id"]
isOneToOne: false
      referencedRelation: "obligations"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "notification_events_organization_id_review_event_id_fkey"
      columns: ["organization_id","review_event_id"]
isOneToOne: false
      referencedRelation: "review_events"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string,"created_at": string,"created_by": string | null,"event_id": string,"id": string,"organization_id": string,"read_at": string | null,"recipient_id": string,"revision": number,"target_path": string,"title": string,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "body": string,"created_at"?: string,"created_by"?: string | null,"event_id": string,"id"?: string,"organization_id": string,"read_at"?: string | null,"recipient_id": string,"revision"?: number,"target_path": string,"title": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"created_by"?: string | null,"event_id"?: string,"id"?: string,"organization_id"?: string,"read_at"?: string | null,"recipient_id"?: string,"revision"?: number,"target_path"?: string,"title"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "notifications_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "notifications_organization_id_event_id_fkey"
      columns: ["organization_id","event_id"]
isOneToOne: false
      referencedRelation: "notification_events"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "notifications_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_organization_id_recipient_id_fkey"
      columns: ["organization_id","recipient_id"]
isOneToOne: false
      referencedRelation: "organization_members"
      referencedColumns: ["organization_id","user_id"]
    },{
      foreignKeyName: "notifications_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "notifications_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "notifications_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "notifications_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"obligations": {
                  Row: {
                    "assignment_issue": boolean,"class": string,"company_id": string | null,"created_at": string,"created_by": string | null,"delivery_responsible_id": string | null,"description": string | null,"destination_key": string,"disposition": string,"disposition_reason": string | null,"document_type_id": string | null,"employment_period_id": string | null,"id": string,"initial_due_date": string,"is_required": boolean,"manual_request_id": string | null,"module": string,"occurrence_key": string,"organization_id": string,"period_id": string,"priority": string,"revision": number,"rule_id": string | null,"rule_version_id": string | null,"snapshot": NonNullable<Json>,"title": string,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "assignment_issue"?: boolean,"class": string,"company_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"delivery_responsible_id"?: string | null,"description"?: string | null,"destination_key": string,"disposition"?: string,"disposition_reason"?: string | null,"document_type_id"?: string | null,"employment_period_id"?: string | null,"id"?: string,"initial_due_date": string,"is_required"?: boolean,"manual_request_id"?: string | null,"module": string,"occurrence_key": string,"organization_id": string,"period_id": string,"priority"?: string,"revision"?: number,"rule_id"?: string | null,"rule_version_id"?: string | null,"snapshot": NonNullable<Json>,"title": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "assignment_issue"?: boolean,"class"?: string,"company_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"delivery_responsible_id"?: string | null,"description"?: string | null,"destination_key"?: string,"disposition"?: string,"disposition_reason"?: string | null,"document_type_id"?: string | null,"employment_period_id"?: string | null,"id"?: string,"initial_due_date"?: string,"is_required"?: boolean,"manual_request_id"?: string | null,"module"?: string,"occurrence_key"?: string,"organization_id"?: string,"period_id"?: string,"priority"?: string,"revision"?: number,"rule_id"?: string | null,"rule_version_id"?: string | null,"snapshot"?: NonNullable<Json>,"title"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "obligations_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "obligations_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "obligations_delivery_responsible_id_fkey"
      columns: ["delivery_responsible_id"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "obligations_delivery_responsible_id_fkey"
      columns: ["delivery_responsible_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "obligations_organization_id_company_id_employment_period_i_fkey"
      columns: ["organization_id","company_id","employment_period_id"]
isOneToOne: false
      referencedRelation: "employment_periods"
      referencedColumns: ["organization_id","company_id","id"]
    },{
      foreignKeyName: "obligations_organization_id_company_id_fkey"
      columns: ["organization_id","company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "obligations_organization_id_delivery_responsible_id_fkey"
      columns: ["organization_id","delivery_responsible_id"]
isOneToOne: false
      referencedRelation: "organization_members"
      referencedColumns: ["organization_id","user_id"]
    },{
      foreignKeyName: "obligations_organization_id_document_type_id_module_fkey"
      columns: ["organization_id","document_type_id","module"]
isOneToOne: false
      referencedRelation: "document_types"
      referencedColumns: ["organization_id","id","module"]
    },{
      foreignKeyName: "obligations_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "obligations_organization_id_period_id_fkey"
      columns: ["organization_id","period_id"]
isOneToOne: false
      referencedRelation: "periods"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "obligations_organization_id_rule_id_rule_version_id_fkey"
      columns: ["organization_id","rule_id","rule_version_id"]
isOneToOne: false
      referencedRelation: "rule_versions"
      referencedColumns: ["organization_id","rule_id","id"]
    },{
      foreignKeyName: "obligations_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "obligations_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"operation_requests": {
                  Row: {
                    "actor_key": string,"actor_user_id": string | null,"completed_at": string | null,"created_at": string,"created_by": string | null,"error_code": string | null,"external_identity_id": string | null,"id": string,"input_hash": string,"operation": string,"organization_id": string,"request_id": string,"resource_id": string | null,"resource_table": string | null,"result": Json | null,"revision": number,"status": string,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "actor_key": string,"actor_user_id"?: string | null,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"error_code"?: string | null,"external_identity_id"?: string | null,"id"?: string,"input_hash": string,"operation": string,"organization_id": string,"request_id": string,"resource_id"?: string | null,"resource_table"?: string | null,"result"?: Json | null,"revision"?: number,"status"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "actor_key"?: string,"actor_user_id"?: string | null,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"error_code"?: string | null,"external_identity_id"?: string | null,"id"?: string,"input_hash"?: string,"operation"?: string,"organization_id"?: string,"request_id"?: string,"resource_id"?: string | null,"resource_table"?: string | null,"result"?: Json | null,"revision"?: number,"status"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "operation_requests_actor_user_id_fkey"
      columns: ["actor_user_id"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "operation_requests_actor_user_id_fkey"
      columns: ["actor_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "operation_requests_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "operation_requests_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "operation_requests_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "operation_requests_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "operation_requests_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"organization_members": {
                  Row: {
                    "active": boolean,"created_at": string,"created_by": string | null,"deleted_at": string | null,"deleted_by": string | null,"deletion_reason": string | null,"id": string,"is_admin": boolean,"member_type": string,"organization_id": string,"revision": number,"updated_at": string,"updated_by": string | null,"user_id": string
                  }
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"deletion_reason"?: string | null,"id"?: string,"is_admin"?: boolean,"member_type": string,"organization_id": string,"revision"?: number,"updated_at"?: string,"updated_by"?: string | null,"user_id": string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"deletion_reason"?: string | null,"id"?: string,"is_admin"?: boolean,"member_type"?: string,"organization_id"?: string,"revision"?: number,"updated_at"?: string,"updated_by"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "organization_members_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "organization_members_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "organization_members_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "organization_members_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "organization_members_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "organization_members_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "organization_members_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "organization_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "organization_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"organizations": {
                  Row: {
                    "country_code": string,"created_at": string,"created_by": string | null,"deleted_at": string | null,"deleted_by": string | null,"deletion_reason": string | null,"id": string,"name": string,"operation_pauses": NonNullable<Json>,"revision": number,"settings": NonNullable<Json>,"status": string,"timezone": string,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "country_code"?: string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"deletion_reason"?: string | null,"id"?: string,"name": string,"operation_pauses"?: NonNullable<Json>,"revision"?: number,"settings"?: NonNullable<Json>,"status"?: string,"timezone"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "country_code"?: string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"deletion_reason"?: string | null,"id"?: string,"name"?: string,"operation_pauses"?: NonNullable<Json>,"revision"?: number,"settings"?: NonNullable<Json>,"status"?: string,"timezone"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "organizations_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "organizations_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "organizations_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "organizations_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "organizations_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "organizations_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"periods": {
                  Row: {
                    "created_at": string,"created_by": string | null,"end_date": string,"id": string,"kind": string,"organization_id": string,"period_key": string,"reference_date": string | null,"start_date": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"end_date": string,"id"?: string,"kind": string,"organization_id": string,"period_key": string,"reference_date"?: string | null,"start_date": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"end_date"?: string,"id"?: string,"kind"?: string,"organization_id"?: string,"period_key"?: string,"reference_date"?: string | null,"start_date"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "periods_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "periods_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "periods_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"permissions": {
                  Row: {
                    "action": string,"created_at": string,"created_by": string | null,"description": string,"id": string,"module": string,"organization_id": string
                  }
                  Insert: {
                    "action": string,"created_at"?: string,"created_by"?: string | null,"description": string,"id"?: string,"module": string,"organization_id": string
                  }
                  Update: {
                    "action"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string,"id"?: string,"module"?: string,"organization_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "permissions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "permissions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "permissions_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"created_by": string | null,"deleted_at": string | null,"deleted_by": string | null,"deletion_reason": string | null,"email": string,"enabled": boolean,"full_name": string,"provisioning_status": string,"revision": number,"updated_at": string,"updated_by": string | null,"user_id": string,"whatsapp_phone": string | null
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"deletion_reason"?: string | null,"email": string,"enabled"?: boolean,"full_name": string,"provisioning_status"?: string,"revision"?: number,"updated_at"?: string,"updated_by"?: string | null,"user_id": string,"whatsapp_phone"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"deletion_reason"?: string | null,"email"?: string,"enabled"?: boolean,"full_name"?: string,"provisioning_status"?: string,"revision"?: number,"updated_at"?: string,"updated_by"?: string | null,"user_id"?: string,"whatsapp_phone"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "profiles_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "profiles_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "profiles_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "profiles_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "profiles_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"requirement_rules": {
                  Row: {
                    "active": boolean,"applicability_key": string,"class": string,"company_id": string | null,"control_start_date": string,"created_at": string,"created_by": string | null,"current_version_id": string | null,"deleted_at": string | null,"deleted_by": string | null,"deletion_reason": string | null,"delivery_responsible_id": string | null,"description": string | null,"document_type_id": string | null,"employment_period_id": string | null,"generation_cursor": NonNullable<Json>,"id": string,"inherit_responsible": boolean,"module": string,"operation_pauses": NonNullable<Json>,"organization_id": string,"preparation_pending": boolean,"presentation_order": number | null,"revision": number,"target_scope": string,"template_version_id": string | null,"title": string,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "active"?: boolean,"applicability_key"?: string,"class"?: string,"company_id"?: string | null,"control_start_date": string,"created_at"?: string,"created_by"?: string | null,"current_version_id"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"deletion_reason"?: string | null,"delivery_responsible_id"?: string | null,"description"?: string | null,"document_type_id"?: string | null,"employment_period_id"?: string | null,"generation_cursor"?: NonNullable<Json>,"id"?: string,"inherit_responsible"?: boolean,"module": string,"operation_pauses"?: NonNullable<Json>,"organization_id": string,"preparation_pending"?: boolean,"presentation_order"?: number | null,"revision"?: number,"target_scope": string,"template_version_id"?: string | null,"title": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"applicability_key"?: string,"class"?: string,"company_id"?: string | null,"control_start_date"?: string,"created_at"?: string,"created_by"?: string | null,"current_version_id"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"deletion_reason"?: string | null,"delivery_responsible_id"?: string | null,"description"?: string | null,"document_type_id"?: string | null,"employment_period_id"?: string | null,"generation_cursor"?: NonNullable<Json>,"id"?: string,"inherit_responsible"?: boolean,"module"?: string,"operation_pauses"?: NonNullable<Json>,"organization_id"?: string,"preparation_pending"?: boolean,"presentation_order"?: number | null,"revision"?: number,"target_scope"?: string,"template_version_id"?: string | null,"title"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "requirement_rules_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "requirement_rules_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "requirement_rules_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "requirement_rules_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "requirement_rules_delivery_responsible_id_fkey"
      columns: ["delivery_responsible_id"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "requirement_rules_delivery_responsible_id_fkey"
      columns: ["delivery_responsible_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "requirement_rules_organization_id_company_id_employment_pe_fkey"
      columns: ["organization_id","company_id","employment_period_id"]
isOneToOne: false
      referencedRelation: "employment_periods"
      referencedColumns: ["organization_id","company_id","id"]
    },{
      foreignKeyName: "requirement_rules_organization_id_company_id_fkey"
      columns: ["organization_id","company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "requirement_rules_organization_id_delivery_responsible_id_fkey"
      columns: ["organization_id","delivery_responsible_id"]
isOneToOne: false
      referencedRelation: "organization_members"
      referencedColumns: ["organization_id","user_id"]
    },{
      foreignKeyName: "requirement_rules_organization_id_document_type_id_module_fkey"
      columns: ["organization_id","document_type_id","module"]
isOneToOne: false
      referencedRelation: "document_types"
      referencedColumns: ["organization_id","id","module"]
    },{
      foreignKeyName: "requirement_rules_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "requirement_rules_organization_id_id_current_version_id_fkey"
      columns: ["organization_id","id","current_version_id"]
isOneToOne: false
      referencedRelation: "rule_versions"
      referencedColumns: ["organization_id","rule_id","id"]
    },{
      foreignKeyName: "requirement_rules_organization_id_template_version_id_fkey"
      columns: ["organization_id","template_version_id"]
isOneToOne: false
      referencedRelation: "deliverable_template_versions"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "requirement_rules_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "requirement_rules_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"review_events": {
                  Row: {
                    "after_state": string,"before_state": string,"comment": string | null,"created_at": string,"created_by": string | null,"decision": string,"deliverable_id": string,"expected_revision": number,"id": string,"new_due_date": string | null,"organization_id": string,"request_id": string,"resulting_revision": number,"reviewer_id": string,"version_id": string
                  }
                  Insert: {
                    "after_state": string,"before_state": string,"comment"?: string | null,"created_at"?: string,"created_by"?: string | null,"decision": string,"deliverable_id": string,"expected_revision": number,"id"?: string,"new_due_date"?: string | null,"organization_id": string,"request_id": string,"resulting_revision": number,"reviewer_id": string,"version_id": string
                  }
                  Update: {
                    "after_state"?: string,"before_state"?: string,"comment"?: string | null,"created_at"?: string,"created_by"?: string | null,"decision"?: string,"deliverable_id"?: string,"expected_revision"?: number,"id"?: string,"new_due_date"?: string | null,"organization_id"?: string,"request_id"?: string,"resulting_revision"?: number,"reviewer_id"?: string,"version_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "review_events_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "review_events_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "review_events_organization_id_deliverable_id_version_id_fkey"
      columns: ["organization_id","deliverable_id","version_id"]
isOneToOne: false
      referencedRelation: "document_versions"
      referencedColumns: ["organization_id","deliverable_id","id"]
    },{
      foreignKeyName: "review_events_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "review_events_reviewer_id_fkey"
      columns: ["reviewer_id"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "review_events_reviewer_id_fkey"
      columns: ["reviewer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"role_permissions": {
                  Row: {
                    "created_at": string,"created_by": string | null,"deleted_at": string | null,"deleted_by": string | null,"deletion_reason": string | null,"id": string,"organization_id": string,"permission_id": string,"revision": number,"role_id": string,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"deletion_reason"?: string | null,"id"?: string,"organization_id": string,"permission_id": string,"revision"?: number,"role_id": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"deletion_reason"?: string | null,"id"?: string,"organization_id"?: string,"permission_id"?: string,"revision"?: number,"role_id"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "role_permissions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "role_permissions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "role_permissions_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "role_permissions_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "role_permissions_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "role_permissions_organization_id_permission_id_fkey"
      columns: ["organization_id","permission_id"]
isOneToOne: false
      referencedRelation: "permissions"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "role_permissions_organization_id_role_id_fkey"
      columns: ["organization_id","role_id"]
isOneToOne: false
      referencedRelation: "roles"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "role_permissions_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "role_permissions_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"roles": {
                  Row: {
                    "active": boolean,"audience": string,"code": string,"created_at": string,"created_by": string | null,"deleted_at": string | null,"deleted_by": string | null,"deletion_reason": string | null,"description": string | null,"id": string,"name": string,"organization_id": string,"revision": number,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "active"?: boolean,"audience": string,"code": string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"deletion_reason"?: string | null,"description"?: string | null,"id"?: string,"name": string,"organization_id": string,"revision"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"audience"?: string,"code"?: string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"deletion_reason"?: string | null,"description"?: string | null,"id"?: string,"name"?: string,"organization_id"?: string,"revision"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "roles_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "roles_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "roles_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "roles_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "roles_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "roles_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "roles_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"rule_versions": {
                  Row: {
                    "allowed_formats": (string)[],"anchor_date": string | null,"applicability_conditions": NonNullable<Json>,"configuration_snapshot": NonNullable<Json>,"created_at": string,"created_by": string | null,"deadline_offset_days": number,"deliverable_specs": NonNullable<Json>,"effective_from": string,"frequency": string,"id": string,"interval_count": number | null,"interval_unit": string | null,"is_required": boolean,"max_file_bytes": number,"organization_id": string,"priority": string,"rule_id": string,"version_number": number
                  }
                  Insert: {
                    "allowed_formats"?: (string)[],"anchor_date"?: string | null,"applicability_conditions"?: NonNullable<Json>,"configuration_snapshot": NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"deadline_offset_days": number,"deliverable_specs": NonNullable<Json>,"effective_from": string,"frequency": string,"id"?: string,"interval_count"?: number | null,"interval_unit"?: string | null,"is_required"?: boolean,"max_file_bytes"?: number,"organization_id": string,"priority"?: string,"rule_id": string,"version_number": number
                  }
                  Update: {
                    "allowed_formats"?: (string)[],"anchor_date"?: string | null,"applicability_conditions"?: NonNullable<Json>,"configuration_snapshot"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"deadline_offset_days"?: number,"deliverable_specs"?: NonNullable<Json>,"effective_from"?: string,"frequency"?: string,"id"?: string,"interval_count"?: number | null,"interval_unit"?: string | null,"is_required"?: boolean,"max_file_bytes"?: number,"organization_id"?: string,"priority"?: string,"rule_id"?: string,"version_number"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "rule_versions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "rule_versions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "rule_versions_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rule_versions_organization_id_rule_id_fkey"
      columns: ["organization_id","rule_id"]
isOneToOne: false
      referencedRelation: "requirement_rules"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"submission_cycles": {
                  Row: {
                    "closed_at": string | null,"created_at": string,"created_by": string | null,"cycle_number": number,"deliverable_id": string,"due_date": string,"first_submitted_at": string | null,"id": string,"organization_id": string,"reason": string,"revision": number,"state": string,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "closed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"cycle_number": number,"deliverable_id": string,"due_date": string,"first_submitted_at"?: string | null,"id"?: string,"organization_id": string,"reason": string,"revision"?: number,"state"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "closed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"cycle_number"?: number,"deliverable_id"?: string,"due_date"?: string,"first_submitted_at"?: string | null,"id"?: string,"organization_id"?: string,"reason"?: string,"revision"?: number,"state"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "submission_cycles_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "submission_cycles_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "submission_cycles_organization_id_deliverable_id_fkey"
      columns: ["organization_id","deliverable_id"]
isOneToOne: false
      referencedRelation: "deliverables"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "submission_cycles_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submission_cycles_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "submission_cycles_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"sunat_access_grants": {
                  Row: {
                    "active": boolean,"company_id": string,"created_at": string,"created_by": string | null,"deleted_at": string | null,"deleted_by": string | null,"deletion_reason": string | null,"id": string,"member_id": string,"organization_id": string,"revision": number,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "active"?: boolean,"company_id": string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"deletion_reason"?: string | null,"id"?: string,"member_id": string,"organization_id": string,"revision"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"company_id"?: string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"deletion_reason"?: string | null,"id"?: string,"member_id"?: string,"organization_id"?: string,"revision"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "sunat_access_grants_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "sunat_access_grants_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "sunat_access_grants_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "sunat_access_grants_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "sunat_access_grants_organization_id_company_id_fkey"
      columns: ["organization_id","company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "sunat_access_grants_organization_id_member_id_fkey"
      columns: ["organization_id","member_id"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["organization_id","member_id"]
    },{
      foreignKeyName: "sunat_access_grants_organization_id_member_id_fkey"
      columns: ["organization_id","member_id"]
isOneToOne: false
      referencedRelation: "organization_members"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "sunat_access_grants_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "sunat_access_grants_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"sunat_attachments": {
                  Row: {
                    "byte_size": number | null,"cached_at": string | null,"company_id": string,"created_at": string,"error_code": string | null,"filename": string,"id": string,"message_id": string,"mime_type": string | null,"object_name": string | null,"organization_id": string,"sha256": string | null,"source_key": string,"state": string
                  }
                  Insert: {
                    "byte_size"?: number | null,"cached_at"?: string | null,"company_id": string,"created_at"?: string,"error_code"?: string | null,"filename": string,"id"?: string,"message_id": string,"mime_type"?: string | null,"object_name"?: string | null,"organization_id": string,"sha256"?: string | null,"source_key": string,"state"?: string
                  }
                  Update: {
                    "byte_size"?: number | null,"cached_at"?: string | null,"company_id"?: string,"created_at"?: string,"error_code"?: string | null,"filename"?: string,"id"?: string,"message_id"?: string,"mime_type"?: string | null,"object_name"?: string | null,"organization_id"?: string,"sha256"?: string | null,"source_key"?: string,"state"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sunat_attachments_organization_id_company_id_message_id_fkey"
      columns: ["organization_id","company_id","message_id"]
isOneToOne: false
      referencedRelation: "sunat_messages"
      referencedColumns: ["organization_id","company_id","id"]
    }
                  ]
                },"sunat_connections": {
                  Row: {
                    "company_id": string,"consent_version": number,"consented_at": string,"consented_by": string,"created_at": string,"created_by": string | null,"credential_version": number,"daily_baseline_at": string | null,"daily_enabled": boolean,"daily_time": string,"deleted_at": string | null,"deleted_by": string | null,"deletion_reason": string | null,"error_code": string | null,"id": string,"last_daily_success_at": string | null,"last_error_at": string | null,"last_success_at": string | null,"last_verified_at": string | null,"organization_id": string,"revision": number,"state": string,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "company_id": string,"consent_version": number,"consented_at": string,"consented_by": string,"created_at"?: string,"created_by"?: string | null,"credential_version"?: number,"daily_baseline_at"?: string | null,"daily_enabled"?: boolean,"daily_time"?: string,"deleted_at"?: string | null,"deleted_by"?: string | null,"deletion_reason"?: string | null,"error_code"?: string | null,"id"?: string,"last_daily_success_at"?: string | null,"last_error_at"?: string | null,"last_success_at"?: string | null,"last_verified_at"?: string | null,"organization_id": string,"revision"?: number,"state"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "company_id"?: string,"consent_version"?: number,"consented_at"?: string,"consented_by"?: string,"created_at"?: string,"created_by"?: string | null,"credential_version"?: number,"daily_baseline_at"?: string | null,"daily_enabled"?: boolean,"daily_time"?: string,"deleted_at"?: string | null,"deleted_by"?: string | null,"deletion_reason"?: string | null,"error_code"?: string | null,"id"?: string,"last_daily_success_at"?: string | null,"last_error_at"?: string | null,"last_success_at"?: string | null,"last_verified_at"?: string | null,"organization_id"?: string,"revision"?: number,"state"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "sunat_connections_consented_by_fkey"
      columns: ["consented_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "sunat_connections_consented_by_fkey"
      columns: ["consented_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "sunat_connections_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "sunat_connections_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "sunat_connections_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "sunat_connections_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "sunat_connections_organization_id_company_id_fkey"
      columns: ["organization_id","company_id"]
isOneToOne: true
      referencedRelation: "companies"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "sunat_connections_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sunat_connections_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "sunat_connections_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"sunat_jobs": {
                  Row: {
                    "attachment_id": string | null,"attempts": number,"checkpoint": NonNullable<Json>,"company_id": string,"connection_id": string,"created_at": string,"credential_version": number,"daily_date": string | null,"error_code": string | null,"finished_at": string | null,"from_date": string | null,"id": string,"kind": string,"lease_expires_at": string | null,"lease_token": string | null,"message_id": string | null,"organization_id": string,"progress": NonNullable<Json>,"request_key": string,"requester_id": string | null,"requester_session": string | null,"started_at": string | null,"state": string,"through_date": string | null,"worker_id": string | null
                  }
                  Insert: {
                    "attachment_id"?: string | null,"attempts"?: number,"checkpoint"?: NonNullable<Json>,"company_id": string,"connection_id": string,"created_at"?: string,"credential_version": number,"daily_date"?: string | null,"error_code"?: string | null,"finished_at"?: string | null,"from_date"?: string | null,"id"?: string,"kind": string,"lease_expires_at"?: string | null,"lease_token"?: string | null,"message_id"?: string | null,"organization_id": string,"progress"?: NonNullable<Json>,"request_key": string,"requester_id"?: string | null,"requester_session"?: string | null,"started_at"?: string | null,"state"?: string,"through_date"?: string | null,"worker_id"?: string | null
                  }
                  Update: {
                    "attachment_id"?: string | null,"attempts"?: number,"checkpoint"?: NonNullable<Json>,"company_id"?: string,"connection_id"?: string,"created_at"?: string,"credential_version"?: number,"daily_date"?: string | null,"error_code"?: string | null,"finished_at"?: string | null,"from_date"?: string | null,"id"?: string,"kind"?: string,"lease_expires_at"?: string | null,"lease_token"?: string | null,"message_id"?: string | null,"organization_id"?: string,"progress"?: NonNullable<Json>,"request_key"?: string,"requester_id"?: string | null,"requester_session"?: string | null,"started_at"?: string | null,"state"?: string,"through_date"?: string | null,"worker_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "sunat_jobs_organization_id_company_id_attachment_id_fkey"
      columns: ["organization_id","company_id","attachment_id"]
isOneToOne: false
      referencedRelation: "sunat_attachments"
      referencedColumns: ["organization_id","company_id","id"]
    },{
      foreignKeyName: "sunat_jobs_organization_id_company_id_connection_id_fkey"
      columns: ["organization_id","company_id","connection_id"]
isOneToOne: false
      referencedRelation: "sunat_connections"
      referencedColumns: ["organization_id","company_id","id"]
    },{
      foreignKeyName: "sunat_jobs_organization_id_company_id_message_id_fkey"
      columns: ["organization_id","company_id","message_id"]
isOneToOne: false
      referencedRelation: "sunat_messages"
      referencedColumns: ["organization_id","company_id","id"]
    },{
      foreignKeyName: "sunat_jobs_requester_id_fkey"
      columns: ["requester_id"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "sunat_jobs_requester_id_fkey"
      columns: ["requester_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"sunat_messages": {
                  Row: {
                    "company_id": string,"connection_id": string,"content_text": string | null,"details_loaded_at": string | null,"first_seen_at": string,"has_attachments": boolean,"id": string,"last_seen_at": string,"mailbox": string,"organization_id": string,"published_at": string | null,"published_on": string,"source_id": string,"source_read": boolean,"subject": string
                  }
                  Insert: {
                    "company_id": string,"connection_id": string,"content_text"?: string | null,"details_loaded_at"?: string | null,"first_seen_at"?: string,"has_attachments"?: boolean,"id"?: string,"last_seen_at"?: string,"mailbox": string,"organization_id": string,"published_at"?: string | null,"published_on": string,"source_id": string,"source_read"?: boolean,"subject": string
                  }
                  Update: {
                    "company_id"?: string,"connection_id"?: string,"content_text"?: string | null,"details_loaded_at"?: string | null,"first_seen_at"?: string,"has_attachments"?: boolean,"id"?: string,"last_seen_at"?: string,"mailbox"?: string,"organization_id"?: string,"published_at"?: string | null,"published_on"?: string,"source_id"?: string,"source_read"?: boolean,"subject"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sunat_messages_organization_id_company_id_connection_id_fkey"
      columns: ["organization_id","company_id","connection_id"]
isOneToOne: false
      referencedRelation: "sunat_connections"
      referencedColumns: ["organization_id","company_id","id"]
    }
                  ]
                },"sunat_month_queries": {
                  Row: {
                    "company_id": string,"connection_id": string,"error_code": string | null,"id": string,"job_id": string,"last_attempt_at": string,"last_success_at": string | null,"mailbox": string,"message_count": number | null,"month": number,"organization_id": string,"state": string,"year": number
                  }
                  Insert: {
                    "company_id": string,"connection_id": string,"error_code"?: string | null,"id"?: string,"job_id": string,"last_attempt_at"?: string,"last_success_at"?: string | null,"mailbox": string,"message_count"?: number | null,"month": number,"organization_id": string,"state": string,"year": number
                  }
                  Update: {
                    "company_id"?: string,"connection_id"?: string,"error_code"?: string | null,"id"?: string,"job_id"?: string,"last_attempt_at"?: string,"last_success_at"?: string | null,"mailbox"?: string,"message_count"?: number | null,"month"?: number,"organization_id"?: string,"state"?: string,"year"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "sunat_month_queries_organization_id_company_id_connection__fkey"
      columns: ["organization_id","company_id","connection_id"]
isOneToOne: false
      referencedRelation: "sunat_connections"
      referencedColumns: ["organization_id","company_id","id"]
    },{
      foreignKeyName: "sunat_month_queries_organization_id_job_id_fkey"
      columns: ["organization_id","job_id"]
isOneToOne: false
      referencedRelation: "sunat_jobs"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"sunat_notifications": {
                  Row: {
                    "body": string,"company_id": string,"connection_id": string,"created_at": string,"event_key": string,"id": string,"message_id": string | null,"organization_id": string,"published_on": string | null,"read_at": string | null,"recipient_id": string,"title": string
                  }
                  Insert: {
                    "body": string,"company_id": string,"connection_id": string,"created_at"?: string,"event_key": string,"id"?: string,"message_id"?: string | null,"organization_id": string,"published_on"?: string | null,"read_at"?: string | null,"recipient_id": string,"title": string
                  }
                  Update: {
                    "body"?: string,"company_id"?: string,"connection_id"?: string,"created_at"?: string,"event_key"?: string,"id"?: string,"message_id"?: string | null,"organization_id"?: string,"published_on"?: string | null,"read_at"?: string | null,"recipient_id"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sunat_notifications_organization_id_company_id_connection__fkey"
      columns: ["organization_id","company_id","connection_id"]
isOneToOne: false
      referencedRelation: "sunat_connections"
      referencedColumns: ["organization_id","company_id","id"]
    },{
      foreignKeyName: "sunat_notifications_organization_id_company_id_message_id_fkey"
      columns: ["organization_id","company_id","message_id"]
isOneToOne: false
      referencedRelation: "sunat_messages"
      referencedColumns: ["organization_id","company_id","id"]
    },{
      foreignKeyName: "sunat_notifications_organization_id_recipient_id_fkey"
      columns: ["organization_id","recipient_id"]
isOneToOne: false
      referencedRelation: "organization_members"
      referencedColumns: ["organization_id","user_id"]
    },{
      foreignKeyName: "sunat_notifications_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "sunat_notifications_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"upload_intents": {
                  Row: {
                    "confirmed_version_id": string | null,"created_at": string,"created_by": string | null,"cycle_id": string,"declared_bytes": number,"declared_mime": string,"deliverable_id": string,"error_code": string | null,"expected_deliverable_revision": number,"expires_at": string,"final_bucket": string,"final_path": string,"id": string,"organization_id": string,"original_name": string,"request_id": string,"reserved_version_id": string,"revision": number,"staging_bucket": string,"staging_cleaned_at": string | null,"staging_path": string,"state": string,"updated_at": string,"updated_by": string | null,"user_id": string,"validation_lease_until": string | null,"validation_result": Json | null,"validation_token": string | null
                  }
                  Insert: {
                    "confirmed_version_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"cycle_id": string,"declared_bytes": number,"declared_mime": string,"deliverable_id": string,"error_code"?: string | null,"expected_deliverable_revision": number,"expires_at"?: string,"final_bucket"?: string,"final_path": string,"id"?: string,"organization_id": string,"original_name": string,"request_id": string,"reserved_version_id": string,"revision"?: number,"staging_bucket"?: string,"staging_cleaned_at"?: string | null,"staging_path": string,"state"?: string,"updated_at"?: string,"updated_by"?: string | null,"user_id": string,"validation_lease_until"?: string | null,"validation_result"?: Json | null,"validation_token"?: string | null
                  }
                  Update: {
                    "confirmed_version_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"cycle_id"?: string,"declared_bytes"?: number,"declared_mime"?: string,"deliverable_id"?: string,"error_code"?: string | null,"expected_deliverable_revision"?: number,"expires_at"?: string,"final_bucket"?: string,"final_path"?: string,"id"?: string,"organization_id"?: string,"original_name"?: string,"request_id"?: string,"reserved_version_id"?: string,"revision"?: number,"staging_bucket"?: string,"staging_cleaned_at"?: string | null,"staging_path"?: string,"state"?: string,"updated_at"?: string,"updated_by"?: string | null,"user_id"?: string,"validation_lease_until"?: string | null,"validation_result"?: Json | null,"validation_token"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "upload_intents_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "upload_intents_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "upload_intents_organization_id_deliverable_id_confirmed_ve_fkey"
      columns: ["organization_id","deliverable_id","confirmed_version_id","id"]
isOneToOne: false
      referencedRelation: "document_versions"
      referencedColumns: ["organization_id","deliverable_id","id","upload_intent_id"]
    },{
      foreignKeyName: "upload_intents_organization_id_deliverable_id_cycle_id_fkey"
      columns: ["organization_id","deliverable_id","cycle_id"]
isOneToOne: false
      referencedRelation: "submission_cycles"
      referencedColumns: ["organization_id","deliverable_id","id"]
    },{
      foreignKeyName: "upload_intents_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "upload_intents_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "upload_intents_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "upload_intents_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "upload_intents_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"whatsapp_digests": {
                  Row: {
                    "accepted_at": string | null,"created_at": string,"created_by": string | null,"delivered_at": string | null,"delivery_id": string,"expired_at": string | null,"gateway_state": NonNullable<Json>,"http_attempt_count": number,"id": string,"last_attempt_at": string | null,"last_error_code": string | null,"last_receipt_id": string | null,"local_date": string,"organization_id": string,"outbound_state": NonNullable<Json>,"payload": NonNullable<Json>,"provider_message_id": string | null,"recipient_id": string,"revision": number,"sent_at": string | null,"status": string,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "accepted_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"delivered_at"?: string | null,"delivery_id"?: string,"expired_at"?: string | null,"gateway_state"?: NonNullable<Json>,"http_attempt_count"?: number,"id"?: string,"last_attempt_at"?: string | null,"last_error_code"?: string | null,"last_receipt_id"?: string | null,"local_date": string,"organization_id": string,"outbound_state"?: NonNullable<Json>,"payload": NonNullable<Json>,"provider_message_id"?: string | null,"recipient_id": string,"revision"?: number,"sent_at"?: string | null,"status"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "accepted_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"delivered_at"?: string | null,"delivery_id"?: string,"expired_at"?: string | null,"gateway_state"?: NonNullable<Json>,"http_attempt_count"?: number,"id"?: string,"last_attempt_at"?: string | null,"last_error_code"?: string | null,"last_receipt_id"?: string | null,"local_date"?: string,"organization_id"?: string,"outbound_state"?: NonNullable<Json>,"payload"?: NonNullable<Json>,"provider_message_id"?: string | null,"recipient_id"?: string,"revision"?: number,"sent_at"?: string | null,"status"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "whatsapp_digests_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "whatsapp_digests_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "whatsapp_digests_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "whatsapp_digests_organization_id_recipient_id_fkey"
      columns: ["organization_id","recipient_id"]
isOneToOne: false
      referencedRelation: "organization_members"
      referencedColumns: ["organization_id","user_id"]
    },{
      foreignKeyName: "whatsapp_digests_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "whatsapp_digests_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "whatsapp_digests_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "whatsapp_digests_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"workers": {
                  Row: {
                    "address": string | null,"birth_date": string | null,"company_id": string,"created_at": string,"created_by": string | null,"deleted_at": string | null,"deleted_by": string | null,"deletion_reason": string | null,"email": string | null,"first_names": string,"id": string,"identity_number": string,"identity_type": string,"last_names": string,"notes": string | null,"operation_pauses": NonNullable<Json>,"organization_id": string,"phone": string | null,"revision": number,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "address"?: string | null,"birth_date"?: string | null,"company_id": string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"deletion_reason"?: string | null,"email"?: string | null,"first_names": string,"id"?: string,"identity_number": string,"identity_type": string,"last_names": string,"notes"?: string | null,"operation_pauses"?: NonNullable<Json>,"organization_id": string,"phone"?: string | null,"revision"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"birth_date"?: string | null,"company_id"?: string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"deletion_reason"?: string | null,"email"?: string | null,"first_names"?: string,"id"?: string,"identity_number"?: string,"identity_type"?: string,"last_names"?: string,"notes"?: string | null,"operation_pauses"?: NonNullable<Json>,"organization_id"?: string,"phone"?: string | null,"revision"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "workers_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "workers_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "workers_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "workers_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "workers_organization_id_company_id_fkey"
      columns: ["organization_id","company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "workers_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workers_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "workers_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                }
          }
          Views: {
            "h02_users": {
                  Row: {
                    "deleted": boolean | null,"email": string | null,"full_name": string | null,"member": Json | null,"member_id": string | null,"organization_id": string | null,"profile": Json | null,"user_id": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "organization_members_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"h03_obligation_summary": {
                  Row: {
                    "aggregate_state": string | null,"approved_count": number | null,"assignment_issue": boolean | null,"class": string | null,"company_id": string | null,"company_name": string | null,"created_at": string | null,"delivery_responsible_id": string | null,"description": string | null,"disposition": string | null,"disposition_reason": string | null,"employment_period_id": string | null,"employment_sequence": number | null,"employment_stage": string | null,"id": string | null,"initial_due_date": string | null,"is_required": boolean | null,"module": string | null,"observed_count": number | null,"occurrence_key": string | null,"operational_due_date": string | null,"organization_id": string | null,"overdue": boolean | null,"pending_count": number | null,"period_id": string | null,"priority": string | null,"revision": number | null,"title": string | null,"total_count": number | null,"worker_id": string | null,"worker_name": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "obligations_delivery_responsible_id_fkey"
      columns: ["delivery_responsible_id"]
isOneToOne: false
      referencedRelation: "h02_users"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "obligations_delivery_responsible_id_fkey"
      columns: ["delivery_responsible_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "obligations_organization_id_company_id_employment_period_i_fkey"
      columns: ["organization_id","company_id","employment_period_id"]
isOneToOne: false
      referencedRelation: "employment_periods"
      referencedColumns: ["organization_id","company_id","id"]
    },{
      foreignKeyName: "obligations_organization_id_company_id_fkey"
      columns: ["organization_id","company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "obligations_organization_id_delivery_responsible_id_fkey"
      columns: ["organization_id","delivery_responsible_id"]
isOneToOne: false
      referencedRelation: "organization_members"
      referencedColumns: ["organization_id","user_id"]
    },{
      foreignKeyName: "obligations_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "obligations_organization_id_period_id_fkey"
      columns: ["organization_id","period_id"]
isOneToOne: false
      referencedRelation: "periods"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                }
          }
          Functions: {
            "h02_admin_fail":
{ Args: { "p_operation_id": string }; Returns: undefined
                           },
"h02_admin_finish":
{ Args: { "p_input": Json,"p_operation_id": string }; Returns: Json
                           },
"h02_admin_prepare":
{ Args: { "p_actor_id": string,"p_input_hash": string,"p_operation": string,"p_organization_id": string,"p_request_id": string,"p_target_id"?: string }; Returns: Json
                           },
"h02_admin_stage":
{ Args: { "p_input": Json,"p_operation_id": string }; Returns: undefined
                           },
"h02_bootstrap":
{ Args: { "p_name": string,"p_user_id": string }; Returns: string
                           },
"h02_command":
{ Args: { "p_input": Json,"p_operation": string,"p_organization_id": string,"p_request_id": string }; Returns: Json
                           },
"h02_context":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"h02_operation_status":
{ Args: { "p_organization_id": string }; Returns: Json
                           },
"h03_claim_upload":
{ Args: { "p_actor_id": string,"p_intent_id": string,"p_session_id": string }; Returns: Json
                           },
"h03_command":
{ Args: { "p_input": Json,"p_operation": string,"p_organization_id": string,"p_request_id": string }; Returns: Json
                           },
"h03_confirm_upload":
{ Args: { "p_actor_id": string,"p_intent_id": string,"p_session_id": string,"p_token": string,"p_validation": Json }; Returns: Json
                           },
"h03_expire_uploads":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"h03_mark_staging_cleaned":
{ Args: { "p_intent_ids": (string)[] }; Returns: undefined
                           },
"h03_query":
{ Args: { "p_input"?: Json,"p_organization_id": string,"p_resource": string }; Returns: Json
                           },
"h03_release_upload":
{ Args: { "p_error_code": string,"p_intent_id": string,"p_rejected"?: boolean,"p_token": string }; Returns: undefined
                           },
"h03_schedule_cleanup":
{ Args: { "p_base_url": string,"p_cleanup_secret": string }; Returns: undefined
                           },
"h03_upload_context":
{ Args: { "p_intent_id": string }; Returns: Json
                           },
"h04_preview":
{ Args: { "p_input": Json,"p_organization_id": string }; Returns: Json
                           },
"h04_run_generation":
{ Args: { "p_batch_size"?: number,"p_rule_id"?: string }; Returns: Json
                           },
"h04_schedule_generation":
{ Args: { "p_enabled"?: boolean }; Returns: undefined
                           },
"h05_query":
{ Args: { "p_input"?: Json,"p_organization_id": string,"p_resource": string }; Returns: Json
                           },
"h05_run_generation":
{ Args: { "p_batch_size"?: number,"p_employment_period_id"?: string }; Returns: Json
                           },
"h05_schedule_generation":
{ Args: { "p_enabled"?: boolean }; Returns: undefined
                           },
"h06_begin_dispatch":
{ Args: { "p_batch_id": string,"p_lease_id": string }; Returns: Json
                           },
"h06_claim_batch":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"h06_finish_dispatch":
{ Args: { "p_accepted"?: boolean,"p_attempt_id": string,"p_duration_ms"?: number,"p_http_status"?: number,"p_outcome"?: string }; Returns: Json
                           },
"h06_gateway_claim":
{ Args: { "p_delivery_id": string,"p_digest": Json }; Returns: Json
                           },
"h06_gateway_complete":
{ Args: { "p_claim_id": string,"p_delivery_id": string,"p_receipt": Json }; Returns: Json
                           },
"h06_prepare_digests":
{ Args: { "p_base_url": string,"p_batch_size"?: number,"p_now"?: string,"p_organization_id"?: string,"p_today"?: string }; Returns: Json
                           },
"h06_query":
{ Args: { "p_input"?: Json,"p_organization_id": string,"p_resource": string }; Returns: Json
                           },
"h06_receive_receipt":
{ Args: { "p_receipt": Json }; Returns: Json
                           },
"h06_run_deadlines":
{ Args: { "p_batch_size"?: number,"p_organization_id"?: string,"p_today"?: string }; Returns: Json
                           },
"h06_schedule":
{ Args: { "p_enabled"?: boolean,"p_function_url": string,"p_secret": string }; Returns: undefined
                           },
"h07_export":
{ Args: { "p_input": Json,"p_organization_id": string,"p_request_id": string,"p_stage": string }; Returns: Json
                           },
"h07_query":
{ Args: { "p_input"?: Json,"p_organization_id": string,"p_resource": string }; Returns: Json
                           },
"h08_access_token_hook":
{ Args: { "event": Json }; Returns: Json
                           },
"h08_block_auth_email":
{ Args: { "event": Json }; Returns: Json
                           },
"h08_consume_rate_limit":
{ Args: { "p_bucket": string,"p_key_hash": string,"p_limit": number,"p_seconds": number }; Returns: boolean
                           },
"h08_generation_tick":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"h08_health":
{ Args: { "p_organization_id": string }; Returns: Json
                           },
"h08_record_recovery":
{ Args: { "p_error_code"?: string,"p_id": string,"p_kind": string,"p_manifest_sha256"?: string,"p_object_count"?: number,"p_status": string,"p_verified_bytes"?: number }; Returns: undefined
                           },
"h08_schedule_generation":
{ Args: { "p_enabled"?: boolean }; Returns: undefined
                           },
"h10_command":
{ Args: { "p_input": Json,"p_operation": string,"p_organization_id": string,"p_request_id": string }; Returns: Json
                           },
"h10_dispatch_authorize":
{ Args: { "p_job_id": string,"p_organization_id": string }; Returns: boolean
                           },
"h10_dispatch_claim":
{ Args: { "p_run_daily"?: boolean }; Returns: Json
                           },
"h10_dispatch_configure":
{ Args: { "p_enabled"?: boolean,"p_endpoint": string,"p_secret": string }; Returns: boolean
                           },
"h10_dispatch_consume_nonce":
{ Args: { "p_issued_at": number,"p_nonce": string }; Returns: boolean
                           },
"h10_dispatch_finish":
{ Args: { "p_error_code"?: string,"p_run_id": string,"p_stopped"?: boolean }; Returns: boolean
                           },
"h10_download_authorize":
{ Args: { "p_actor_id": string,"p_attachment_id": string,"p_organization_id": string,"p_request_id": string,"p_session_id": string }; Returns: Json
                           },
"h10_query":
{ Args: { "p_input"?: Json,"p_organization_id": string,"p_resource": string }; Returns: Json
                           },
"h10_store_credentials":
{ Args: { "p_input": Json }; Returns: Json
                           },
"h10_worker_abandon":
{ Args: { "p_error_code": string,"p_job_id": string,"p_lease_token": string }; Returns: boolean
                           },
"h10_worker_attachment":
{ Args: { "p_input": Json,"p_job_id": string,"p_lease_token": string }; Returns: boolean
                           },
"h10_worker_batch":
{ Args: { "p_checkpoint": Json,"p_job_id": string,"p_lease_token": string,"p_mailbox": string,"p_progress": Json,"p_records": Json }; Returns: boolean
                           },
"h10_worker_details":
{ Args: { "p_attachments": Json,"p_job_id": string,"p_lease_token": string,"p_text": string }; Returns: boolean
                           },
"h10_worker_finish":
{ Args: { "p_error_code": string,"p_job_id": string,"p_lease_token": string,"p_metrics": Json,"p_results": Json,"p_state": string }; Returns: boolean
                           },
"h10_worker_heartbeat":
{ Args: { "p_job_id": string,"p_lease_token": string }; Returns: boolean
                           },
"h10_worker_tick":
{ Args: { "p_mode": string,"p_now"?: string,"p_run_daily"?: boolean,"p_worker_id": string }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {

          }
        }
} as const
