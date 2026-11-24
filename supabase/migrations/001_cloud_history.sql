-- Run once in your Supabase project's SQL Editor.
create table if not exists public.practice_accounts (
  user_id text primary key,
  email text not null,
  name text not null,
  records jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.practice_accounts enable row level security;
revoke all on public.practice_accounts from anon, authenticated;
grant select, insert, update, delete on public.practice_accounts to service_role;

-- Compare-and-swap prevents an older device overwriting newer history.
create or replace function public.save_practice_account(
  p_user_id text, p_email text, p_name text, p_records jsonb,
  p_preferences jsonb, p_version integer
) returns setof public.practice_accounts
language plpgsql set search_path = public as $$
begin
  if p_version = 0 then
    return query insert into public.practice_accounts(user_id,email,name,records,preferences)
      values(p_user_id,p_email,p_name,p_records,p_preferences)
      on conflict (user_id) do nothing returning *;
  else
    return query update public.practice_accounts
      set email=p_email, name=p_name, records=p_records, preferences=p_preferences,
          version=version+1, updated_at=now()
      where user_id=p_user_id and version=p_version returning *;
  end if;
end $$;
revoke all on function public.save_practice_account(text,text,text,jsonb,jsonb,integer) from public, anon, authenticated;
grant execute on function public.save_practice_account(text,text,text,jsonb,jsonb,integer) to service_role;

-- Shared login throttling works across Vercel instances.
create table if not exists public.admin_login_attempts (
  bucket text primary key, attempts integer not null, expires_at timestamptz not null
);
alter table public.admin_login_attempts enable row level security;
revoke all on public.admin_login_attempts from anon, authenticated;
grant all on public.admin_login_attempts to service_role;
create or replace function public.allow_admin_login(p_bucket text) returns boolean
language plpgsql set search_path=public as $$
declare attempt_count integer;
begin
  delete from public.admin_login_attempts where expires_at < now();
  insert into public.admin_login_attempts values(p_bucket,1,now()+interval '15 minutes')
    on conflict(bucket) do update set attempts=admin_login_attempts.attempts+1
    returning attempts into attempt_count;
  return attempt_count <= 10;
end $$;
revoke all on function public.allow_admin_login(text) from public, anon, authenticated;
grant execute on function public.allow_admin_login(text) to service_role;
