create or replace function private.h09_template_command(org uuid,actor uuid,req uuid,op text,input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare hdr public.deliverable_templates; ver public.deliverable_template_versions; result_id uuid; rev int; draft_items jsonb;
begin
 perform private.assert_member(org,actor,true); perform private.admit_session(org);
 if op='InitializeDeliverableTemplates' then
  if input ? 'templates' then perform private.document_command(org,actor,req,'ImportDocumentCatalog',input); end if;
  perform private.h09_initialize(org,actor,req);
  return jsonb_build_object('schema_version',1,'resource_id',org,'revision',0,'status','completed');
 end if;
 select * into hdr from public.deliverable_templates where organization_id=org and id=(input->>'template_id')::uuid and deleted_at is null for update;
 if hdr.id is null then perform private.fail('NOT_FOUND'); end if;
 select * into ver from public.deliverable_template_versions where template_id=hdr.id order by version_number desc limit 1 for update;
 if ver.revision is distinct from (input->>'expected_revision')::int or ver.id is distinct from (input->>'version_id')::uuid then perform private.fail('CONFLICT'); end if;
 if op='SaveDeliverableTemplate' then
  draft_items:=input->'items';
  if jsonb_typeof(draft_items) is distinct from 'array' or jsonb_array_length(draft_items) not between 1 and 200 then perform private.fail('VALIDATION_ERROR'); end if;
  -- Drafts may lack required business values; structural metadata must remain trusted.
  if exists(select 1 from jsonb_array_elements(draft_items) i left join public.document_types t on t.organization_id=org and t.id=(i->>'document_type_id')::uuid
    where t.id is null or i->>'code' is distinct from t.code or i->>'module' is distinct from t.module or i->>'condition' is distinct from private.h09_condition(t.code,t.module)
     or i->>'stage' is distinct from (case when t.module='laboral_trabajador' then t.category else 'any' end)
     or jsonb_typeof(i->'included') is distinct from 'boolean' or (i->>'position')::int not between 1 and 1000000)
    or (select count(*) from jsonb_array_elements(draft_items))<>(select count(distinct i->>'code') from jsonb_array_elements(draft_items) i) then perform private.fail('VALIDATION_ERROR'); end if;
  if ver.published_at is not null then
   insert into public.deliverable_template_versions(organization_id,template_id,version_number,items,created_by,updated_by)
    values(org,hdr.id,ver.version_number+1,draft_items,actor,actor) returning id,revision into result_id,rev;
  else
   update public.deliverable_template_versions set items=draft_items,revision=revision+1,updated_at=now(),updated_by=actor where id=ver.id returning id,revision into result_id,rev;
  end if;
 elsif op='PublishDeliverableTemplate' then
  if ver.published_at is not null or jsonb_array_length(private.h09_template_issues(org,ver.items))>0 then perform private.fail('VALIDATION_ERROR'); end if;
  update public.deliverable_template_versions set published_at=now(),revision=revision+1,updated_at=now(),updated_by=actor where id=ver.id returning id,revision into result_id,rev;
  update public.deliverable_templates set published_version_id=ver.id,revision=revision+1,updated_at=now(),updated_by=actor where id=hdr.id;
 else perform private.fail('VALIDATION_ERROR'); end if;
 perform private.h04_audit(org,actor,req,op,'deliverable_template_versions',result_id,null,jsonb_build_object('template_id',hdr.id,'version_id',result_id,'revision',rev));
 return jsonb_build_object('schema_version',1,'resource_id',result_id,'revision',rev,'status','completed');
end $$;

