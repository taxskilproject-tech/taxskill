-- Cese only closes the stage. Changes to its conditions require a reasoned correction.
alter function private.h05_worker_command(uuid,uuid,uuid,text,jsonb) rename to h05_worker_command_v7;
create function private.h05_worker_command(p_org uuid,p_actor uuid,p_request uuid,p_operation text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if p_operation='EndEmployment' and exists(
    select 1 from jsonb_object_keys(p_input) k
    where k not in ('company_id','worker_id','employment_period_id','expected_revision','end_date','termination_reason','termination_notes')
  ) then perform private.fail('VALIDATION_ERROR'); end if;
  return private.h05_worker_command_v7(p_org,p_actor,p_request,p_operation,p_input);
end $$;
revoke all on function private.h05_worker_command(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
