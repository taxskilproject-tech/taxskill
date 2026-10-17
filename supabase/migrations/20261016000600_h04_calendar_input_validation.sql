-- Explicit null validation and timezone-independent timestamp calendar carriers.
create or replace function private.h04_calendar(frequency text, on_date date, anchor date default null,
  interval_count integer default null, interval_unit text default null, stable_id text default null) returns jsonb
language plpgsql immutable set search_path='' as $$
declare first_day date; last_day date; kind text; occurrence text; n integer; width integer;
begin
  if on_date is null then raise exception 'VALIDATION_ERROR'; end if;
  case frequency
    when 'diaria' then first_day:=on_date; last_day:=on_date; kind:='daily'; occurrence:=on_date::text;
    when 'semanal' then first_day:=date_trunc('week',on_date::timestamp)::date; last_day:=first_day+6; kind:='weekly'; occurrence:=to_char(on_date,'IYYY-"W"IW');
    when 'quincenal' then
      first_day:=date_trunc('month',on_date::timestamp)::date+case when extract(day from on_date)>15 then 15 else 0 end;
      last_day:=case when extract(day from on_date)>15 then (date_trunc('month',on_date::timestamp)+interval '1 month - 1 day')::date else first_day+14 end;
      kind:='fortnightly'; occurrence:=to_char(on_date,'YYYY-MM')||case when extract(day from on_date)>15 then '-Q2' else '-Q1' end;
    when 'mensual' then first_day:=date_trunc('month',on_date::timestamp)::date; last_day:=(first_day+interval '1 month - 1 day')::date; kind:='monthly'; occurrence:=to_char(on_date,'YYYY-MM');
    when 'trimestral' then first_day:=date_trunc('quarter',on_date::timestamp)::date; last_day:=(first_day+interval '3 months - 1 day')::date; kind:='quarterly'; occurrence:=to_char(on_date,'YYYY')||'-T'||extract(quarter from on_date)::integer;
    when 'semestral' then first_day:=make_date(extract(year from on_date)::integer,case when extract(month from on_date)<=6 then 1 else 7 end,1); last_day:=(first_day+interval '6 months - 1 day')::date; kind:='semiannual'; occurrence:=to_char(on_date,'YYYY')||case when extract(month from on_date)<=6 then '-S1' else '-S2' end;
    when 'anual' then first_day:=date_trunc('year',on_date::timestamp)::date; last_day:=(first_day+interval '1 year - 1 day')::date; kind:='annual'; occurrence:=to_char(on_date,'YYYY');
    when 'unica' then
      if anchor is null then raise exception 'VALIDATION_ERROR'; end if;
      first_day:=anchor; last_day:=anchor; kind:='unique'; occurrence:='unique:'||coalesce(stable_id,anchor::text);
    when 'eventual' then
      if nullif(stable_id,'') is null then raise exception 'VALIDATION_ERROR'; end if;
      first_day:=on_date; last_day:=on_date; kind:='event'; occurrence:='event:'||stable_id;
    when 'personalizada' then
      if anchor is null or interval_count is null or interval_count not between 1 and 1200 or interval_unit is null or interval_unit not in ('days','weeks','months') then raise exception 'VALIDATION_ERROR'; end if;
      if interval_unit in ('days','weeks') then
        width:=interval_count*case when interval_unit='weeks' then 7 else 1 end;
        n:=floor((on_date-anchor)::numeric/width)::integer;
        first_day:=anchor+n*width; last_day:=first_day+width-1;
      else
        n:=floor(((extract(year from on_date)::integer-extract(year from anchor)::integer)*12+extract(month from on_date)::integer-extract(month from anchor)::integer)::numeric/interval_count)::integer;
        if private.h04_anchor_month(anchor,n*interval_count)>on_date then n:=n-1; end if;
        first_day:=private.h04_anchor_month(anchor,n*interval_count);
        last_day:=private.h04_anchor_month(anchor,(n+1)*interval_count)-1;
      end if;
      kind:='interval'; occurrence:='interval:'||anchor||':'||interval_count||':'||interval_unit||':'||n;
    else raise exception 'VALIDATION_ERROR';
  end case;
  return jsonb_build_object('kind',kind,'key',occurrence,'start_date',first_day,'end_date',last_day,
    'reference_date',case when kind in ('unique','event') then first_day else null end);
end $$;
