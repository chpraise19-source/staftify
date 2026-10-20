-- STAFTIFY MVP. Apply through Supabase migrations. No patient data belongs here.
begin;
create extension if not exists pgcrypto with schema extensions;
create type public.app_role as enum ('nurse','facility','admin');
create table public.facilities (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 200),
 subscription_status text not null default 'inactive', stripe_customer_id text unique, stripe_subscription_id text unique,
 stripe_event_created bigint not null default 0, created_at timestamptz not null default now()
);
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade, full_name text not null default 'New member',
 role public.app_role not null default 'nurse', facility_id uuid references public.facilities(id),
 credential text check(credential in ('RN','LPN','CNA')), verified boolean not null default false,
 created_at timestamptz not null default now(), check(role <> 'facility' or facility_id is not null)
);
create table public.shifts (
 id uuid primary key default gen_random_uuid(), facility_id uuid not null references public.facilities(id),
 title text not null check(length(title) between 3 and 120), specialty text not null check(specialty in ('RN','LPN','CNA')),
 starts_at timestamptz not null, ends_at timestamptz not null, hourly_rate numeric(8,2) not null check(hourly_rate between 15 and 500),
 urgent boolean not null default false, notes text not null default '' check(length(notes)<=2000),
 status text not null default 'open' check(status in ('open','filled','completed','cancelled')),
 assigned_nurse_id uuid references public.profiles(id), last_blast_at timestamptz,created_at timestamptz not null default now(),
 check(ends_at>starts_at and ends_at<=starts_at+interval '24 hours'),check(status not in ('filled','completed') or assigned_nurse_id is not null)
);
create table public.applications (
 id uuid primary key default gen_random_uuid(),shift_id uuid not null references public.shifts(id),nurse_id uuid not null references public.profiles(id),
 status text not null default 'pending' check(status in ('pending','accepted','declined')),created_at timestamptz not null default now(),unique(shift_id,nurse_id)
);
create table public.priority_nurses (facility_id uuid not null references public.facilities(id),nurse_id uuid not null references public.profiles(id),primary key(facility_id,nurse_id));
create table public.notifications (id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),title text not null,body text not null,read_at timestamptz,created_at timestamptz not null default now());
create table public.timesheets (id uuid primary key default gen_random_uuid(),shift_id uuid not null unique references public.shifts(id),nurse_id uuid not null references public.profiles(id),clock_in timestamptz not null,clock_out timestamptz,approved_at timestamptz,approved_by uuid references public.profiles(id),check(clock_out is null or clock_out>=clock_in));
create table public.attendance_codes (id uuid primary key default gen_random_uuid(),shift_id uuid not null references public.shifts(id),kind text not null check(kind in ('in','out')),code_hash text not null,expires_at timestamptz not null,used_at timestamptz,unique(shift_id,kind));
create table public.otp_attempts (user_id uuid primary key references public.profiles(id),attempts integer not null default 0,window_start timestamptz not null default now());
create table public.audit_events (id uuid primary key default gen_random_uuid(),actor_id uuid references public.profiles(id),action text not null,resource_id uuid,created_at timestamptz not null default now());
create table public.stripe_events (id text primary key,created_at timestamptz not null default now());
create index shifts_facility on public.shifts(facility_id,starts_at);
create index applications_nurse on public.applications(nurse_id);
create index notifications_user on public.notifications(user_id,created_at desc);
create index timesheets_nurse on public.timesheets(nurse_id);
create function public.my_role() returns public.app_role language sql stable security definer set search_path=public as $$select role from public.profiles where id=auth.uid()$$;
create function public.my_facility() returns uuid language sql stable security definer set search_path=public as $$select facility_id from public.profiles where id=auth.uid()$$;
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$begin insert into public.profiles(id,full_name) values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name','New member'),120));return new;end$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
-- No client can assign roles, verify licenses, mutate subscriptions, or write attendance directly.
alter table public.profiles enable row level security;
alter table public.facilities enable row level security;
alter table public.shifts enable row level security;
alter table public.applications enable row level security;
alter table public.priority_nurses enable row level security;
alter table public.notifications enable row level security;
alter table public.timesheets enable row level security;
alter table public.attendance_codes enable row level security;
alter table public.otp_attempts enable row level security;
alter table public.audit_events enable row level security;
alter table public.stripe_events enable row level security;
create policy profile_read on public.profiles for select to authenticated using(id=auth.uid() or public.my_role()='admin' or (public.my_role()='facility' and role='nurse'));
create policy facility_read on public.facilities for select to authenticated using(public.my_role() in ('admin','nurse') or id=public.my_facility());
create policy shift_read on public.shifts for select to authenticated using(public.my_role()='admin' or facility_id=public.my_facility() or (public.my_role()='nurse' and (status='open' or assigned_nurse_id=auth.uid() or exists(select 1 from public.applications a where a.shift_id=shifts.id and a.nurse_id=auth.uid()))));
create policy shift_insert on public.shifts for insert to authenticated with check(public.my_role()='facility' and facility_id=public.my_facility() and status='open' and assigned_nurse_id is null and last_blast_at is null and starts_at>now() and exists(select 1 from public.facilities f where f.id=facility_id and f.subscription_status in ('active','trialing')));
create policy application_read on public.applications for select to authenticated using(nurse_id=auth.uid() or public.my_role()='admin' or exists(select 1 from public.shifts s where s.id=shift_id and s.facility_id=public.my_facility()));
-- Avoid a recursive shifts/applications policy path: applications facility visibility uses a definer helper.
create function public.owns_shift(shift uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from shifts where id=shift and facility_id=public.my_facility())$$;
drop policy application_read on public.applications;
create policy application_read on public.applications for select to authenticated using(nurse_id=auth.uid() or public.my_role()='admin' or public.owns_shift(shift_id));
create policy priority_read on public.priority_nurses for select to authenticated using(facility_id=public.my_facility() or public.my_role()='admin');
create policy notification_read on public.notifications for select to authenticated using(user_id=auth.uid());
create policy timesheet_read on public.timesheets for select to authenticated using(nurse_id=auth.uid() or public.my_role()='admin' or public.owns_shift(shift_id));
create policy audit_read on public.audit_events for select to authenticated using(public.my_role()='admin');
revoke all on public.profiles,public.facilities,public.shifts,public.applications,public.priority_nurses,public.notifications,public.timesheets,public.attendance_codes,public.otp_attempts,public.audit_events,public.stripe_events from anon,authenticated;
grant select on public.profiles,public.facilities,public.shifts,public.applications,public.priority_nurses,public.notifications,public.timesheets,public.audit_events to authenticated;
grant insert(title,specialty,starts_at,ends_at,hourly_rate,urgent,notes,facility_id) on public.shifts to authenticated;
-- All sensitive transitions are transactional, role checked and audited.
create function public.staffing_action(action_name text,payload jsonb) returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare p public.profiles; s public.shifts; a public.applications; t public.timesheets; c public.attendance_codes; code text; target uuid; k text; attempts_count integer;
begin
 select * into p from profiles where id=auth.uid();if p.id is null then raise exception 'Unauthorized';end if;
 if action_name='apply' then
  select * into s from shifts where id=(payload->>'shift_id')::uuid for update;
  if p.role<>'nurse' or not p.verified or p.credential is distinct from s.specialty then raise exception 'A verified matching credential is required';end if;
  if s.id is null or s.status<>'open' or s.starts_at<=now() then raise exception 'Shift is not available';end if;
  if exists(select 1 from shifts x where x.assigned_nurse_id=p.id and x.status='filled' and tstzrange(x.starts_at,x.ends_at,'[)') && tstzrange(s.starts_at,s.ends_at,'[)')) then raise exception 'Shift overlaps an accepted shift';end if;
  insert into applications(shift_id,nurse_id) values(s.id,p.id);
  insert into notifications(user_id,title,body) select id,'New shift application',p.full_name||' applied to '||s.title from profiles where role='facility' and facility_id=s.facility_id;
  target:=s.id;
 elsif action_name='accept' then
  select * into a from applications where id=(payload->>'application_id')::uuid;
  select * into s from shifts where id=a.shift_id for update;
  if p.role<>'facility' or p.facility_id is distinct from s.facility_id then raise exception 'Forbidden';end if;
  if a.id is null or s.status<>'open' or a.status<>'pending' or s.starts_at<=now() then raise exception 'Application is unavailable';end if;
  -- Lock nurse to serialize simultaneous acceptances across facilities.
  perform 1 from profiles where id=a.nurse_id and verified and credential=s.specialty for update;
  if not found then raise exception 'Nurse credential is not verified';end if;
  if exists(select 1 from shifts x where x.assigned_nurse_id=a.nurse_id and x.status='filled' and tstzrange(x.starts_at,x.ends_at,'[)') && tstzrange(s.starts_at,s.ends_at,'[)')) then raise exception 'Nurse has an overlapping shift';end if;
  update shifts set assigned_nurse_id=a.nurse_id,status='filled' where id=s.id;
  update applications set status=case when id=a.id then 'accepted' else 'declined' end where shift_id=s.id;
  insert into notifications(user_id,title,body) values(a.nurse_id,'You are booked!',s.title||' has been confirmed. The facility pays you directly.');target:=s.id;
 elsif action_name='priority' then
  if p.role<>'facility' then raise exception 'Forbidden';end if;
  target:=(payload->>'nurse_id')::uuid;
  if not exists(select 1 from profiles where id=target and role='nurse' and verified) then raise exception 'Verified nurse required';end if;
  if (payload->>'enabled')::boolean then insert into priority_nurses values(p.facility_id,target) on conflict do nothing;else delete from priority_nurses where facility_id=p.facility_id and nurse_id=target;end if;
 elsif action_name='blast' then
  select * into s from shifts where id=(payload->>'shift_id')::uuid for update;
  if p.role<>'facility' or s.facility_id is distinct from p.facility_id then raise exception 'Forbidden';end if;
  if s.status<>'open' or s.starts_at<=now() then raise exception 'Shift is not open';end if;
  if s.last_blast_at>now()-interval '15 minutes' then raise exception 'Please wait 15 minutes before another blast';end if;
  update shifts set urgent=true,last_blast_at=now() where id=s.id;
  insert into notifications(user_id,title,body) select n.id,case when q.nurse_id is not null then 'Priority staffing request' else 'Urgent staffing request' end,s.title||' — open your shift marketplace to apply.' from profiles n left join priority_nurses q on q.nurse_id=n.id and q.facility_id=s.facility_id where n.role='nurse' and n.verified and n.credential=s.specialty and not exists(select 1 from shifts x where x.assigned_nurse_id=n.id and x.status='filled' and tstzrange(x.starts_at,x.ends_at,'[)') && tstzrange(s.starts_at,s.ends_at,'[)')) order by (q.nurse_id is not null) desc;target:=s.id;
 elsif action_name='issue_otp' then
  select * into s from shifts where id=(payload->>'shift_id')::uuid for update;k:=payload->>'kind';
  if p.role<>'facility' or s.facility_id is distinct from p.facility_id then raise exception 'Forbidden';end if;
  if s.status<>'filled' or k not in ('in','out') then raise exception 'Assigned shift required';end if;
  if now()<s.starts_at-interval '30 minutes' or now()>s.ends_at+interval '4 hours' then raise exception 'Attendance window is closed';end if;
  -- Use cryptographically random bytes rather than the SQL random source.
  code:=lpad((((get_byte(gen_random_bytes(4),0)::bigint<<24)+(get_byte(gen_random_bytes(4),0)::bigint<<16)+(get_byte(gen_random_bytes(4),0)::bigint<<8)+get_byte(gen_random_bytes(4),0))%1000000)::text,6,'0');
  insert into attendance_codes(shift_id,kind,code_hash,expires_at) values(s.id,k,crypt(code,gen_salt('bf')),now()+interval '10 minutes') on conflict(shift_id,kind) do update set code_hash=excluded.code_hash,expires_at=excluded.expires_at,used_at=null;
  insert into audit_events(actor_id,action,resource_id) values(p.id,action_name,s.id);return jsonb_build_object('code',code,'expires_in_seconds',600);
 elsif action_name='clock' then
  select * into s from shifts where id=(payload->>'shift_id')::uuid for update;k:=payload->>'kind';
  if p.role<>'nurse' or s.assigned_nurse_id is distinct from p.id or s.status<>'filled' then raise exception 'Forbidden';end if;
  if k not in ('in','out') or (payload->>'code') !~ '^[0-9]{6}$' then raise exception 'Invalid attendance input';end if;
  if now()<s.starts_at-interval '30 minutes' or now()>s.ends_at+interval '4 hours' then raise exception 'Attendance window is closed';end if;
  insert into otp_attempts(user_id,attempts,window_start) values(p.id,1,now()) on conflict(user_id) do update set attempts=case when otp_attempts.window_start<now()-interval '15 minutes' then 1 else otp_attempts.attempts+1 end,window_start=case when otp_attempts.window_start<now()-interval '15 minutes' then now() else otp_attempts.window_start end returning attempts into attempts_count;
  -- Return failures instead of raising, so failed attempts remain committed.
  if attempts_count>5 then return jsonb_build_object('error','Too many attempts. Wait 15 minutes.');end if;
  select * into c from attendance_codes where shift_id=s.id and kind=k for update;
  if c.id is null or c.used_at is not null or c.expires_at<now() or c.code_hash<>crypt(payload->>'code',c.code_hash) then return jsonb_build_object('error','Invalid or expired one-time code');end if;
  if k='in' then
   if exists(select 1 from timesheets where shift_id=s.id) then raise exception 'Already clocked in';end if;
   insert into timesheets(shift_id,nurse_id,clock_in) values(s.id,p.id,now());
  else
   select * into t from timesheets where shift_id=s.id for update;
   if t.id is null or t.clock_out is not null then raise exception 'Clock-in required or already clocked out';end if;
   update timesheets set clock_out=now() where id=t.id;update shifts set status='completed' where id=s.id;
  end if;
  update attendance_codes set used_at=now() where id=c.id;target:=s.id;
 elsif action_name='approve_timesheet' then
  select * into t from timesheets where id=(payload->>'timesheet_id')::uuid for update;
  select * into s from shifts where id=t.shift_id;
  if p.role<>'facility' or s.facility_id is distinct from p.facility_id then raise exception 'Forbidden';end if;
  if t.id is null or t.clock_out is null then raise exception 'Completed timesheet required';end if;
  update timesheets set approved_at=now(),approved_by=p.id where id=t.id and approved_at is null;target:=t.id;
 elsif action_name='read_notification' then
  target:=(payload->>'notification_id')::uuid;update notifications set read_at=now() where id=target and user_id=p.id;
 elsif action_name='create_facility' then
  if p.role<>'admin' then raise exception 'Forbidden';end if;
  insert into facilities(name) values(trim(payload->>'name')) returning id into target;
 elsif action_name='verify_nurse' then
  if p.role<>'admin' then raise exception 'Forbidden';end if;
  target:=(payload->>'user_id')::uuid;
  update profiles set credential=payload->>'credential',verified=(payload->>'verified')::boolean where id=target and role='nurse';
 elsif action_name='assign_facility' then
  if p.role<>'admin' then raise exception 'Forbidden';end if;
  target:=(payload->>'user_id')::uuid;
  update profiles set role='facility',facility_id=(payload->>'facility_id')::uuid where id=target and role<>'admin';
 else raise exception 'Unknown action';end if;
 insert into audit_events(actor_id,action,resource_id) values(p.id,action_name,target);
 return jsonb_build_object('ok',true);
end$$;
revoke all on function public.staffing_action(text,jsonb) from public,anon;
grant execute on function public.staffing_action(text,jsonb) to authenticated;
create function public.sync_subscription(event_id text,event_created bigint,facility uuid,customer text,subscription text,state text) returns void language plpgsql security definer set search_path=public as $$begin
 insert into stripe_events(id) values(event_id) on conflict do nothing;if not found then return;end if;
 update facilities set stripe_customer_id=customer,stripe_subscription_id=subscription,subscription_status=state,stripe_event_created=event_created where id=facility and stripe_event_created<=event_created;
end$$;
revoke all on function public.sync_subscription(text,bigint,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.sync_subscription(text,bigint,uuid,text,text,text) to service_role;
revoke all on function public.handle_new_user() from public,anon,authenticated;
commit;
