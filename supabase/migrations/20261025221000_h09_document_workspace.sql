alter function private.document_workspace_query(uuid,jsonb) rename to h09_workspace_legacy;
create function private.document_workspace_query(org uuid,input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; groups jsonb; c public.companies; mod text:=input->>'module'; stage text:=coalesce(input->>'employment_stage','');
begin
 result:=private.h09_workspace_legacy(org,input);
 if result->>'ok'<>'true' then return result; end if;
 select * into c from public.companies where organization_id=org and id=(input->>'company_id')::uuid;
 if not private.h09_applies(c.documentary_profile,mod,'always') then perform private.fail('FORBIDDEN'); end if;
 with configured as (
  select t.code,t.name,min(coalesce(r.presentation_order,100000)) position,min(r.created_at) first_used,
   bool_or(r.active) active,bool_or(r.preparation_pending) pending,min(r.control_start_date) starts_on
  from public.requirement_rules r join public.document_types t on t.organization_id=r.organization_id and t.id=r.document_type_id
   join public.rule_versions v on v.organization_id=r.organization_id and v.id=r.current_version_id
  where r.organization_id=org and r.company_id=c.id and r.module=mod and r.class='documentary' and r.deleted_at is null
   and (stage='' or v.applicability_conditions->>'employment_stage' in ('any',stage))
   and (r.employment_period_id is null or r.employment_period_id=(input->>'employment_period_id')::uuid)
  group by t.code,t.name
 ), combined as (
  select coalesce(a.code,b->>'code') code,coalesce(a.name,b->>'name') name,a.position,a.first_used,a.active,a.pending,a.starts_on,
   coalesce((b->>'count')::int,0) count,coalesce((b->>'total_files')::int,0) total_files,coalesce((b->>'approved_files')::int,0) approved_files
  from configured a full join jsonb_array_elements(result->'data'->'groups') b on b->>'code'=a.code
 ) select coalesce(jsonb_agg(jsonb_build_object('code',code,'name',name,'count',count,'total_files',total_files,'approved_files',approved_files,
    'setup_state',case when pending then 'pending_responsible' when starts_on>(now() at time zone 'America/Lima')::date then 'scheduled' when active=false then 'paused' else 'active' end,
    'starts_on',starts_on) order by position nulls last,first_used nulls last,name,code),'[]') into groups from combined;
 return jsonb_set(result,'{data,groups}',groups);
end $$;

create function private.h09_usage(org uuid,dtype uuid,history boolean,page_number int) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform private.assert_member(org,auth.uid(),true); perform private.admit_session(org);
 if page_number not between 1 and 1000000 then perform private.fail('VALIDATION_ERROR'); end if;
 if not exists(select 1 from public.document_types where organization_id=org and id=dtype) then perform private.fail('NOT_FOUND'); end if;
 with usage_rows as (
  select c.id company_id,c.legal_name company_name,c.ruc,c.deleted_at,
   count(r.id) filter(where r.active and not r.preparation_pending and r.deleted_at is null) active_count,
   count(r.id) filter(where r.preparation_pending and r.deleted_at is null) pending_count,
   count(r.id) filter(where not r.active and not r.preparation_pending and r.deleted_at is null) paused_count
  from public.companies c left join public.requirement_rules r on r.organization_id=org and r.company_id=c.id and r.document_type_id=dtype
  where c.organization_id=org and (history or c.deleted_at is null)
    and (exists(select 1 from public.requirement_rules x where x.organization_id=org and x.company_id=c.id and x.document_type_id=dtype and (history or x.deleted_at is null))
      or (history and exists(select 1 from public.obligations o where o.organization_id=org and o.company_id=c.id and o.document_type_id=dtype)))
  group by c.id
 ) select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(x)) from (select * from usage_rows order by company_name,company_id offset (page_number-1)*25 limit 25) x),'[]'::jsonb),
  'count',(select count(*) from usage_rows),'active_companies',(select count(*) from usage_rows where active_count>0),
  'pending_companies',(select count(*) from usage_rows where pending_count>0),'paused_companies',(select count(*) from usage_rows where paused_count>0)) into result;
 return result;
end $$;

create function private.h09_company_setup_query(org uuid,input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.companies;
begin
 perform private.assert_member(org,auth.uid(),true); perform private.admit_session(org);
 select * into c from public.companies where organization_id=org and id=(input->>'company_id')::uuid and deleted_at is null;
 if c.id is null then perform private.fail('NOT_FOUND'); end if;
 return jsonb_build_object('ok',true,'data',jsonb_build_object('company',to_jsonb(c),'rows',coalesce((select jsonb_agg(jsonb_build_object(
  'id',r.id,'code',t.code,'name',t.name,'module',r.module,'condition',r.applicability_key,'active',r.active,'pending',r.preparation_pending,
  'from_template',r.template_version_id is not null,'starts_on',r.control_start_date) order by r.presentation_order,r.created_at,r.id)
  from public.requirement_rules r join public.document_types t on t.id=r.document_type_id and t.organization_id=org
  where r.organization_id=org and r.company_id=c.id and r.class='documentary' and r.deleted_at is null),'[]'::jsonb)));
end $$;

alter function private.h08_document_query(uuid,text,jsonb) rename to h09_document_query_legacy;
create function private.h08_document_query(p_organization_id uuid,p_resource text,p_input jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; rows jsonb;
begin
 if p_resource='deliverable_templates' then return private.h09_templates_query(p_organization_id); end if;
 if p_resource='catalog_usage' then return jsonb_build_object('ok',true,'data',private.h09_usage(p_organization_id,(p_input->>'id')::uuid,coalesce((p_input->>'include_history')::boolean,false),coalesce((p_input->>'page')::int,1))); end if;
 if p_resource='company_preparation' then return private.h09_company_setup_query(p_organization_id,p_input); end if;
 result:=private.h09_document_query_legacy(p_organization_id,p_resource,p_input);
 if p_resource='catalog' and result->>'ok'='true' then
  select coalesce(jsonb_agg(v||jsonb_build_object('usage',private.h09_usage(p_organization_id,(v->>'id')::uuid,false,1))),'[]') into rows from jsonb_array_elements(result->'data'->'rows') v;
  result:=jsonb_set(result,'{data,rows}',rows);
 end if;
 return result;
end $$;

-- Context carries explicit module availability while keeping legacy companies readable.
alter function public.h02_context() rename to h09_context_legacy;
alter function public.h09_context_legacy() set schema private;
create function public.h02_context() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; companies jsonb; org uuid;
begin
 result:=private.h09_context_legacy();
 if result->>'ok'<>'true' then return result; end if;
 org:=(result->'data'->'organization'->>'id')::uuid;
 select coalesce(jsonb_agg(v||jsonb_build_object('documentary_profile',c.documentary_profile,'tax_regime_code',c.tax_regime_code)),'[]') into companies
  from jsonb_array_elements(result->'data'->'companies') v join public.companies c on c.organization_id=org and c.id=(v->>'id')::uuid;
 return jsonb_set(result,'{data,companies}',companies);
end $$;
grant execute on function public.h02_context() to authenticated;
revoke all on function public.h02_context() from public,anon;
revoke all on function private.h09_workspace_legacy(uuid,jsonb),private.document_workspace_query(uuid,jsonb),private.h09_usage(uuid,uuid,boolean,int),
 private.h09_company_setup_query(uuid,jsonb),private.h09_document_query_legacy(uuid,text,jsonb),private.h08_document_query(uuid,text,jsonb),private.h09_context_legacy() from public,anon,authenticated;
notify pgrst,'reload schema';
