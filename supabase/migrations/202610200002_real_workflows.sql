begin;
alter table public.profiles add column onboarding_completed boolean not null default false, add column suspended boolean not null default false;
update public.profiles set onboarding_completed=true where role in ('facility','admin');
alter table public.facilities add column city text not null default '',add column state text not null default '',add column address text not null default '',add column verification_status text not null default 'pending' check(verification_status in ('pending','verified','rejected')),add column active boolean not null default true;
alter table public.shifts drop constraint shifts_status_check;
alter table public.shifts add constraint shifts_status_check check(status in ('draft','open','filled','completed','cancelled'));
alter table public.shifts alter column status set default 'draft';
alter table public.shifts add column department text not null default '',add column updated_at timestamptz not null default clock_timestamp();
alter table public.applications drop constraint applications_status_check;
alter table public.applications add constraint applications_status_check check(status in ('pending','accepted','declined','withdrawn'));
create table public.nurse_details(id uuid primary key references public.profiles(id),specialty text not null,city text not null,state text not null,experience_years integer not null check(experience_years between 0 and 60),bio text not null default '' check(length(bio)<=2000));
create table public.nurse_credentials(nurse_id uuid primary key references public.profiles(id),license_number text not null,license_state text not null check(length(license_state)=2),license_expires date not null);
alter table public.nurse_details enable row level security;
alter table public.nurse_credentials enable row level security;
create policy nurse_details_read on public.nurse_details for select to authenticated using(id=auth.uid() or public.my_role() in ('facility','admin'));
create policy credentials_read on public.nurse_credentials for select to authenticated using(nurse_id=auth.uid() or public.my_role()='admin');
revoke all on public.nurse_details,public.nurse_credentials from anon,authenticated;
grant select on public.nurse_details,public.nurse_credentials to authenticated;
create or replace function public.my_role() returns public.app_role language sql stable security definer set search_path=public as $$select role from profiles where id=auth.uid() and not suspended$$;
create or replace function public.my_facility() returns uuid language sql stable security definer set search_path=public as $$select facility_id from profiles where id=auth.uid() and not suspended$$;
create function public.account_active() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from profiles where id=auth.uid() and not suspended)$$;
-- Apply suspension at the database boundary, including direct PostgREST access.
do $$declare t text;begin foreach t in array array['profiles','facilities','shifts','applications','priority_nurses','notifications','timesheets','audit_events','nurse_details','nurse_credentials'] loop execute format('create policy active_account on public.%I as restrictive for all to authenticated using(public.account_active()) with check(public.account_active())',t);end loop;end$$;
drop policy shift_read on public.shifts;
create policy shift_read on public.shifts for select to authenticated using(public.my_role()='admin' or facility_id=public.my_facility() or (public.my_role()='nurse' and ((status='open' and exists(select 1 from facilities f where f.id=facility_id and f.active and f.verification_status='verified')) or assigned_nurse_id=auth.uid() or exists(select 1 from applications a where a.shift_id=shifts.id and a.nurse_id=auth.uid()))));
revoke insert on public.shifts from authenticated;
revoke insert(title,specialty,starts_at,ends_at,hourly_rate,urgent,notes,facility_id) on public.shifts from authenticated;
drop policy shift_insert on public.shifts;
create function public.complete_onboarding(details jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare p profiles;fid uuid;kind text:=details->>'account_type';
begin
 select * into p from profiles where id=auth.uid() for update;
 if p.id is null or p.suspended then raise exception 'Account unavailable';end if;
 if not exists(select 1 from auth.users where id=p.id and email_confirmed_at is not null) then raise exception 'Confirm your email before completing registration';end if;
 if p.onboarding_completed then return jsonb_build_object('ok',true);end if;
 if length(trim(details->>'full_name')) not between 2 and 120 then raise exception 'Your full name is required';end if;
 if kind='facility' then
  if p.role<>'nurse' or exists(select 1 from applications where nurse_id=p.id) or exists(select 1 from shifts where assigned_nurse_id=p.id) then raise exception 'This account cannot register a new facility';end if;
  if length(trim(details->>'facility_name')) not between 2 and 200 or length(trim(details->>'city')) not between 2 and 120 or length(details->>'state')<>2 or length(trim(details->>'address')) not between 5 and 300 or details->>'facility_name' is null or details->>'city' is null or details->>'state' is null or details->>'address' is null then raise exception 'Complete the facility details';end if;
  insert into facilities(name,city,state,address) values(trim(details->>'facility_name'),trim(details->>'city'),upper(details->>'state'),trim(details->>'address')) returning id into fid;
  update profiles set full_name=trim(details->>'full_name'),role='facility',facility_id=fid,onboarding_completed=true where id=p.id;
 elsif kind='nurse' then
  if p.role<>'nurse' then raise exception 'Invalid account type';end if;
  update profiles set full_name=trim(details->>'full_name'),onboarding_completed=true where id=p.id;
 else raise exception 'Choose a facility or nurse account';end if;
 insert into audit_events(actor_id,action,resource_id) values(p.id,'complete_onboarding',coalesce(fid,p.id));return jsonb_build_object('ok',true);
end$$;
create function public.save_professional_profile(details jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare p profiles;old nurse_credentials;changed boolean;
begin
 select * into p from profiles where id=auth.uid() for update;
 if p.id is null or p.role<>'nurse' or p.suspended or not p.onboarding_completed then raise exception 'Nurse account required';end if;
 if details->>'credential' not in ('RN','LPN','CNA') or details->>'credential' is null or coalesce(length(trim(details->>'full_name')),0) not between 2 and 120 or coalesce(length(trim(details->>'license_number')),0) not between 3 and 100 or coalesce(length(details->>'license_state'),0)<>2 or coalesce((details->>'license_expires')::date,current_date-1)<current_date or coalesce(length(trim(details->>'specialty')),0) not between 2 and 120 or coalesce(length(trim(details->>'city')),0) not between 2 and 120 or coalesce(length(details->>'state'),0)<>2 or coalesce((details->>'experience_years')::integer,-1) not between 0 and 60 or length(coalesce(details->>'bio',''))>2000 then raise exception 'A complete professional profile and current license are required';end if;
 select * into old from nurse_credentials where nurse_id=p.id;
 changed:=old.nurse_id is null or old.license_number is distinct from trim(details->>'license_number') or old.license_state is distinct from upper(details->>'license_state') or old.license_expires is distinct from (details->>'license_expires')::date or p.credential is distinct from details->>'credential';
 update profiles set full_name=trim(details->>'full_name'),credential=details->>'credential',verified=case when changed then false else verified end where id=p.id;
 insert into nurse_details(id,specialty,city,state,experience_years,bio) values(p.id,trim(details->>'specialty'),trim(details->>'city'),upper(details->>'state'),(details->>'experience_years')::integer,coalesce(details->>'bio','')) on conflict(id) do update set specialty=excluded.specialty,city=excluded.city,state=excluded.state,experience_years=excluded.experience_years,bio=excluded.bio;
 insert into nurse_credentials(nurse_id,license_number,license_state,license_expires) values(p.id,trim(details->>'license_number'),upper(details->>'license_state'),(details->>'license_expires')::date) on conflict(nurse_id) do update set license_number=excluded.license_number,license_state=excluded.license_state,license_expires=excluded.license_expires;
 insert into audit_events(actor_id,action,resource_id) values(p.id,'update_professional_profile',p.id);return jsonb_build_object('ok',true,'requires_verification',changed);
end$$;
create function public.manage_shift(operation text,shift_id uuid,details jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare p profiles;f facilities;s shifts;
begin
 select * into p from profiles where id=auth.uid();if p.id is null or p.role<>'facility' or p.suspended or not p.onboarding_completed then raise exception 'Facility account required';end if;
 select * into f from facilities where id=p.facility_id;if not f.active then raise exception 'This facility is paused';end if;
 if operation<>'create' then
  select * into s from shifts where id=shift_id for update;
  if s.id is null or s.facility_id is distinct from p.facility_id then raise exception 'Shift not found';end if;
  if (details->>'updated_at')::timestamptz is distinct from s.updated_at then raise exception 'This shift changed. Refresh before trying again';end if;
 end if;
 if operation in ('create','edit') then
  if operation='edit' and s.status not in ('draft','open') then raise exception 'Only draft or open shifts can be edited';end if;
  if operation='edit' and exists(select 1 from applications a where a.shift_id=s.id and a.status='pending') then raise exception 'This shift has applications. Cancel it and post a new shift to change its terms';end if;
  if coalesce(length(trim(details->>'title')),0) not between 3 and 120 or details->>'specialty' not in ('RN','LPN','CNA') or details->>'specialty' is null or coalesce(length(trim(details->>'department')),0) not between 2 and 120 or coalesce(length(details->>'notes'),0)>2000 or coalesce((details->>'hourly_rate')::numeric,0) not between 15 and 500 or coalesce((details->>'starts_at')::timestamptz,now())<=now() or coalesce((details->>'ends_at')::timestamptz,now())<=(details->>'starts_at')::timestamptz or (details->>'ends_at')::timestamptz>(details->>'starts_at')::timestamptz+interval '24 hours' then raise exception 'Provide valid shift details and future start/end times';end if;
  if operation='create' then
   insert into shifts(facility_id,title,specialty,department,starts_at,ends_at,hourly_rate,urgent,notes,status) values(p.facility_id,trim(details->>'title'),details->>'specialty',trim(details->>'department'),(details->>'starts_at')::timestamptz,(details->>'ends_at')::timestamptz,(details->>'hourly_rate')::numeric,coalesce((details->>'urgent')::boolean,false),coalesce(details->>'notes',''),'draft') returning * into s;
  else
   update shifts set title=trim(details->>'title'),specialty=details->>'specialty',department=trim(details->>'department'),starts_at=(details->>'starts_at')::timestamptz,ends_at=(details->>'ends_at')::timestamptz,hourly_rate=(details->>'hourly_rate')::numeric,urgent=coalesce((details->>'urgent')::boolean,false),notes=coalesce(details->>'notes',''),updated_at=clock_timestamp() where id=s.id returning * into s;
  end if;
 elsif operation='publish' then
  if s.status<>'draft' or s.starts_at<=now() then raise exception 'Only a future draft can be published';end if;
  if f.verification_status<>'verified' then raise exception 'Your facility must be verified before publishing shifts';end if;
  if f.subscription_status not in ('active','trialing') then raise exception 'An active facility subscription is required to publish shifts';end if;
  update shifts set status='open',updated_at=clock_timestamp() where id=s.id returning * into s;
 elsif operation='cancel' then
  if s.status not in ('draft','open','filled') then raise exception 'This shift cannot be cancelled';end if;
  if exists(select 1 from timesheets t where t.shift_id=s.id) then raise exception 'A shift with attendance cannot be cancelled. Contact support';end if;
  insert into notifications(user_id,title,body) select a.nurse_id,'Shift cancelled',s.title||' has been cancelled by the facility.' from applications a where a.shift_id=s.id and a.status in ('pending','accepted');
  update applications a set status='declined' where a.shift_id=s.id and a.status in ('pending','accepted');
  update shifts set status='cancelled',updated_at=clock_timestamp() where id=s.id returning * into s;
 else raise exception 'Unknown shift operation';end if;
 insert into audit_events(actor_id,action,resource_id) values(p.id,'shift_'||operation,s.id);return to_jsonb(s);
end$$;
-- Keep previously tested atomic booking and attendance internals behind a hardened wrapper.
alter function public.staffing_action(text,jsonb) rename to staffing_action_v1;
revoke all on function public.staffing_action_v1(text,jsonb) from public,anon,authenticated;
create function public.staffing_action(action_name text,payload jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare p profiles;a applications;s shifts;n profiles;fid uuid;
begin
 select * into p from profiles where id=auth.uid();if p.id is null or p.suspended or (not p.onboarding_completed and p.role<>'admin') then raise exception 'Active registered account required';end if;
 if action_name in ('apply','accept','blast') then
  if action_name='accept' then select * into a from applications where id=(payload->>'application_id')::uuid;select * into s from shifts where id=a.shift_id for update;select * into a from applications where id=(payload->>'application_id')::uuid for update;else select * into s from shifts where id=(payload->>'shift_id')::uuid;end if;
  if not exists(select 1 from facilities where id=s.facility_id and active and verification_status='verified') then raise exception 'This facility is unavailable';end if;
  if action_name in ('apply','accept') then
   select * into n from profiles where id=case when action_name='apply' then p.id else a.nurse_id end;
   if n.id is null or n.suspended or not n.verified or not exists(select 1 from nurse_credentials where nurse_id=n.id and license_expires>=current_date) then raise exception 'A verified current nursing license is required';end if;
  end if;
 end if;
 if action_name in ('withdraw','decline') then
  select * into a from applications where id=(payload->>'application_id')::uuid;
  select * into s from shifts where id=a.shift_id for update;
  select * into a from applications where id=(payload->>'application_id')::uuid for update;
  if a.id is null or a.status<>'pending' then raise exception 'Pending application required';end if;
  if action_name='withdraw' and (p.role<>'nurse' or a.nurse_id<>p.id) then raise exception 'Forbidden';end if;
  if action_name='decline' and (p.role<>'facility' or s.facility_id is distinct from p.facility_id) then raise exception 'Forbidden';end if;
  update applications set status=case when action_name='withdraw' then 'withdrawn' else 'declined' end where id=a.id;
  insert into notifications(user_id,title,body) select id,'Application update',s.title||': application '||case when action_name='withdraw' then 'withdrawn' else 'declined' end from profiles where case when action_name='withdraw' then facility_id=s.facility_id and role='facility' else id=a.nurse_id end;
  insert into audit_events(actor_id,action,resource_id) values(p.id,action_name,a.id);return jsonb_build_object('ok',true);
 elsif action_name='verify_facility' then
  if p.role<>'admin' then raise exception 'Forbidden';end if;
  if payload->>'status' not in ('pending','verified','rejected') or payload->>'status' is null then raise exception 'Invalid verification status';end if;
  fid:=(payload->>'facility_id')::uuid;update facilities set verification_status=payload->>'status' where id=fid;
  insert into audit_events(actor_id,action,resource_id) values(p.id,action_name,fid);return jsonb_build_object('ok',true);
 elsif action_name='suspend_user' then
  if p.role<>'admin' then raise exception 'Forbidden';end if;
  if not exists(select 1 from profiles where id=(payload->>'user_id')::uuid and role<>'admin') then raise exception 'Only non-administrator accounts can be suspended';end if;
  update profiles set suspended=(payload->>'suspended')::boolean where id=(payload->>'user_id')::uuid;
  insert into audit_events(actor_id,action,resource_id) values(p.id,action_name,(payload->>'user_id')::uuid);return jsonb_build_object('ok',true);
 elsif action_name='verify_nurse' then
  if p.role<>'admin' then raise exception 'Forbidden';end if;
  if (payload->>'verified')::boolean and not exists(select 1 from nurse_credentials c join profiles pr on pr.id=c.nurse_id where c.nurse_id=(payload->>'user_id')::uuid and c.license_expires>=current_date and pr.credential=payload->>'credential') then raise exception 'Review a current license matching the nurse profile before verification';end if;
 end if;
 return public.staffing_action_v1(action_name,payload);
end$$;
-- New facilities.state column must not shadow the existing RPC parameter.
create or replace function public.sync_subscription(event_id text,event_created bigint,facility uuid,customer text,subscription text,state text) returns void language plpgsql security definer set search_path=public as $$begin
 insert into stripe_events(id) values($1) on conflict do nothing;if not found then return;end if;
 update facilities set stripe_customer_id=$4,stripe_subscription_id=$5,subscription_status=$6,stripe_event_created=$2 where id=$3 and stripe_event_created<=$2;
end$$;
-- Keep edited-version checks valid after booking/attendance actions, too.
create function public.touch_shift() returns trigger language plpgsql set search_path=public as $$begin new.updated_at:=clock_timestamp();return new;end$$;
create trigger shift_updated before update on public.shifts for each row execute function public.touch_shift();
revoke all on function public.complete_onboarding(jsonb),public.save_professional_profile(jsonb),public.manage_shift(text,uuid,jsonb),public.staffing_action(text,jsonb) from public,anon;
grant execute on function public.complete_onboarding(jsonb),public.save_professional_profile(jsonb),public.manage_shift(text,uuid,jsonb),public.staffing_action(text,jsonb) to authenticated;
commit;
