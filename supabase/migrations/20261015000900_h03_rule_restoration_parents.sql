-- A deleted company blocks restoration without changing historical children.
create or replace function private.document_command(org uuid, actor uuid, req uuid, op text, input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare obligation public.obligations; version public.document_versions; target text; old_row jsonb; data jsonb; restoring boolean;
begin
  if op='SaveDocumentType' then
    perform private.assert_member(org,actor,true);
    return private.persist(org,actor,req,'document_types',input,array['code','name','module','category','description','suggested_formats','active']);
  end if;
  if op='ConfigureRequirement' then return private.configure_monthly(org,actor,req,input); end if;
  if op='GenerateMonthly' then return private.generate_monthly(org,actor,req,input); end if;
  if op='CreateUploadIntent' then return private.reserve_upload(org,actor,req,input); end if;
  if op in ('ApproveVersion','ObserveVersion','ReopenApproved') then return private.review_document(org,actor,req,op,input); end if;
  if op in ('DeleteDocumentEntity','RestoreDocumentEntity') then
    perform private.assert_member(org,actor,true); target := input->>'entity'; restoring := op='RestoreDocumentEntity';
    if target not in ('document_types','requirement_rules') then perform private.fail('VALIDATION_ERROR'); end if;
    execute format('select to_jsonb(t) from public.%I t where organization_id=$1 and id=$2 for update',target) into old_row using org,(input->>'id')::uuid;
    if old_row is null then perform private.fail('NOT_FOUND'); end if;
    if not restoring and coalesce(btrim(input->>'reason'),'')='' then perform private.fail('VALIDATION_ERROR'); end if;
    data := input||jsonb_build_object('deleted_at',case when restoring then null else now() end,'deleted_by',case when restoring then null else actor end,'deletion_reason',case when restoring then null else btrim(input->>'reason') end);
    if target='requirement_rules' then
      if restoring and (not exists(select 1 from public.document_types where organization_id=org and id=(old_row->>'document_type_id')::uuid and deleted_at is null) or not exists(select 1 from public.companies where organization_id=org and id=(old_row->>'company_id')::uuid and deleted_at is null)) then perform private.fail('FORBIDDEN'); end if;
      data := data||jsonb_build_object('operation_pauses',private.pause_intervals(old_row->'operation_pauses',not restoring or not (old_row->>'active')::boolean,'soft_delete',coalesce(input->>'reason','Restauración'),actor));
    end if;
    return private.persist(org,actor,req,target,data,array['deleted_at','deleted_by','deletion_reason','operation_pauses']);
  end if;
  if op='RequestDownload' then
    select * into version from public.document_versions where organization_id=org and id=(input->>'version_id')::uuid;
    obligation := private.document_access(org,(select obligation_id from public.deliverables where organization_id=org and id=version.deliverable_id),actor,'download');
    perform private.audit(org,actor,req,op,'document_versions',version.id,null,null);
    return jsonb_build_object('schema_version',1,'resource_id',version.id,'version_id',version.id,'revision',0,'status','authorized');
  end if;
  if op in ('SetNotApplicable','CancelObligation') then
    obligation := private.document_access(org,(input->>'obligation_id')::uuid,actor,case when op='SetNotApplicable' then 'waive' else 'view' end);
    if op='CancelObligation' then perform private.assert_member(org,actor,true); end if;
    if (input->>'expected_revision')::integer is distinct from obligation.revision then perform private.fail('CONFLICT'); end if;
    if obligation.disposition<>'active' or coalesce(btrim(input->>'reason'),'')='' then perform private.fail('VALIDATION_ERROR'); end if;
    update public.obligations set disposition=case when op='SetNotApplicable' then 'no_aplica' else 'cancelled' end,disposition_reason=btrim(input->>'reason'),revision=revision+1,updated_at=now(),updated_by=actor where id=obligation.id;
    update public.submission_cycles c set state='cancelled',closed_at=now(),revision=revision+1,updated_at=now(),updated_by=actor where c.organization_id=org and c.state in ('open','submitted') and c.deliverable_id in (select id from public.deliverables where organization_id=org and obligation_id=obligation.id);
    perform private.audit(org,actor,req,op,'obligations',obligation.id,to_jsonb(obligation),(select to_jsonb(o) from public.obligations o where id=obligation.id));
    return jsonb_build_object('schema_version',1,'resource_id',obligation.id,'revision',obligation.revision+1,'status','completed');
  end if;
  perform private.fail('VALIDATION_ERROR'); return null;
end $$;

