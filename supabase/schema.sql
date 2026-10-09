-- =============================================================================
-- CashFlow — multi-project cashflow & break-even tracker
-- Supabase / PostgreSQL schema. Run once in the Supabase SQL editor.
-- Users are managed by Supabase Auth (auth.users).
-- =============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
do $$ begin
  create type public.txn_type as enum ('INCOME', 'EXPENSE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.member_role as enum ('admin', 'editor', 'viewer');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------
create table if not exists public.projects (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null check (char_length(name) between 1 and 120),
  initial_investment numeric(18, 2) not null default 0 check (initial_investment >= 0),
  -- { "currency": "VND", "custom_metrics": [{ "key", "label", "formula", "format" }] }
  -- A simple map is also accepted: { "custom_formulas": { "tax_estimate": "TOTAL_INCOME * 0.1" } }
  settings           jsonb not null default '{}'::jsonb,
  created_by         uuid default auth.uid() references auth.users (id) on delete set null,
  created_at         timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.member_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index if not exists project_members_user_idx on public.project_members (user_id);

create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  type       public.txn_type not null,
  created_at timestamptz not null default now(),
  unique (project_id, type, name),
  -- target for the composite FK below (guarantees same project + same type)
  unique (id, project_id, type)
);

create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  amount      numeric(18, 2) not null check (amount > 0),
  type        public.txn_type not null,
  category_id uuid,
  date        date not null default current_date,
  note        text check (note is null or char_length(note) <= 500),
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  -- category must belong to the same project and have the same type (PG15+)
  foreign key (category_id, project_id, type)
    references public.categories (id, project_id, type)
    on delete set null (category_id)
);
create index if not exists transactions_project_date_idx on public.transactions (project_id, date desc);
create index if not exists transactions_category_idx on public.transactions (category_id);

-- ----------------------------------------------------------------------------
-- RLS helper functions (SECURITY DEFINER avoids recursive policy evaluation)
-- ----------------------------------------------------------------------------
create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = auth.uid()
  );
$$;

create or replace function public.has_project_role(p_project_id uuid, p_roles public.member_role[])
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = auth.uid() and role = any (p_roles)
  );
$$;

-- ----------------------------------------------------------------------------
-- Enable Row Level Security
-- ----------------------------------------------------------------------------
alter table public.projects        enable row level security;
alter table public.project_members enable row level security;
alter table public.categories      enable row level security;
alter table public.transactions    enable row level security;

-- ---------------------------- projects --------------------------------------
drop policy if exists "projects_select_members" on public.projects;
create policy "projects_select_members" on public.projects
  for select to authenticated
  using (public.is_project_member(id));

drop policy if exists "projects_insert_self" on public.projects;
create policy "projects_insert_self" on public.projects
  for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists "projects_update_editors" on public.projects;
create policy "projects_update_editors" on public.projects
  for update to authenticated
  using (public.has_project_role(id, array['admin', 'editor']::public.member_role[]))
  with check (public.has_project_role(id, array['admin', 'editor']::public.member_role[]));

drop policy if exists "projects_delete_admins" on public.projects;
create policy "projects_delete_admins" on public.projects
  for delete to authenticated
  using (public.has_project_role(id, array['admin']::public.member_role[]));

-- ------------------------- project_members ----------------------------------
drop policy if exists "members_select_same_project" on public.project_members;
create policy "members_select_same_project" on public.project_members
  for select to authenticated
  using (public.is_project_member(project_id));

drop policy if exists "members_insert_admins" on public.project_members;
create policy "members_insert_admins" on public.project_members
  for insert to authenticated
  with check (public.has_project_role(project_id, array['admin']::public.member_role[]));

drop policy if exists "members_update_admins" on public.project_members;
create policy "members_update_admins" on public.project_members
  for update to authenticated
  using (public.has_project_role(project_id, array['admin']::public.member_role[]))
  with check (public.has_project_role(project_id, array['admin']::public.member_role[]));

drop policy if exists "members_delete_admins_or_self" on public.project_members;
create policy "members_delete_admins_or_self" on public.project_members
  for delete to authenticated
  using (
    user_id = auth.uid()
    or public.has_project_role(project_id, array['admin']::public.member_role[])
  );

-- ---------------------------- categories ------------------------------------
drop policy if exists "categories_select_members" on public.categories;
create policy "categories_select_members" on public.categories
  for select to authenticated
  using (public.is_project_member(project_id));

drop policy if exists "categories_write_editors" on public.categories;
create policy "categories_write_editors" on public.categories
  for all to authenticated
  using (public.has_project_role(project_id, array['admin', 'editor']::public.member_role[]))
  with check (public.has_project_role(project_id, array['admin', 'editor']::public.member_role[]));

-- --------------------------- transactions -----------------------------------
drop policy if exists "transactions_select_members" on public.transactions;
create policy "transactions_select_members" on public.transactions
  for select to authenticated
  using (public.is_project_member(project_id));

drop policy if exists "transactions_insert_editors" on public.transactions;
create policy "transactions_insert_editors" on public.transactions
  for insert to authenticated
  with check (public.has_project_role(project_id, array['admin', 'editor']::public.member_role[]));

drop policy if exists "transactions_update_editors" on public.transactions;
create policy "transactions_update_editors" on public.transactions
  for update to authenticated
  using (public.has_project_role(project_id, array['admin', 'editor']::public.member_role[]))
  with check (public.has_project_role(project_id, array['admin', 'editor']::public.member_role[]));

drop policy if exists "transactions_delete_editors" on public.transactions;
create policy "transactions_delete_editors" on public.transactions
  for delete to authenticated
  using (public.has_project_role(project_id, array['admin', 'editor']::public.member_role[]));

-- ----------------------------------------------------------------------------
-- Triggers
-- ----------------------------------------------------------------------------

-- Creator automatically becomes admin of a new project.
create or replace function public.handle_new_project()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.created_by is not null then
    insert into public.project_members (project_id, user_id, role)
    values (new.id, new.created_by, 'admin')
    on conflict (project_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_project_created on public.projects;
create trigger on_project_created
  after insert on public.projects
  for each row execute function public.handle_new_project();

-- A project must always keep at least one admin.
create or replace function public.ensure_admin_remains()
returns trigger
language plpgsql security definer set search_path = public, auth
as $$
begin
  if (tg_op = 'DELETE' and old.role = 'admin')
     or (tg_op = 'UPDATE' and old.role = 'admin' and new.role <> 'admin') then
    if not exists (
      select 1 from public.project_members
      where project_id = old.project_id and role = 'admin' and user_id <> old.user_id
    )
    -- allow cascades when the project or the user itself is being deleted
    and exists (select 1 from public.projects where id = old.project_id)
    and exists (select 1 from auth.users where id = old.user_id) then
      raise exception 'LAST_ADMIN: a project must keep at least one admin' using errcode = 'P0001';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists ensure_admin_remains on public.project_members;
create trigger ensure_admin_remains
  before update or delete on public.project_members
  for each row execute function public.ensure_admin_remains();

-- ----------------------------------------------------------------------------
-- RPCs (member management needs access to auth.users e-mails)
-- ----------------------------------------------------------------------------
create or replace function public.add_project_member(
  p_project_id uuid,
  p_email text,
  p_role public.member_role default 'viewer'
)
returns void
language plpgsql security definer set search_path = public, auth
as $$
declare
  v_user uuid;
begin
  if not public.has_project_role(p_project_id, array['admin']::public.member_role[]) then
    raise exception 'permission denied' using errcode = '42501';
  end if;

  select id into v_user from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_user is null then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (p_project_id, v_user, p_role)
  on conflict (project_id, user_id) do update set role = excluded.role;
end;
$$;

create or replace function public.get_project_members(p_project_id uuid)
returns table (user_id uuid, email text, role public.member_role, created_at timestamptz)
language sql stable security definer set search_path = public, auth
as $$
  select m.user_id, u.email::text, m.role, m.created_at
  from public.project_members m
  join auth.users u on u.id = m.user_id
  where m.project_id = p_project_id
    and public.is_project_member(p_project_id)
  order by m.created_at;
$$;

revoke execute on function public.add_project_member(uuid, text, public.member_role) from public, anon;
revoke execute on function public.get_project_members(uuid) from public, anon;
grant execute on function public.add_project_member(uuid, text, public.member_role) to authenticated;
grant execute on function public.get_project_members(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Aggregated view (RLS of the underlying table applies: security_invoker)
-- Keeps dashboards light: one row per project / month / type / category.
-- ----------------------------------------------------------------------------
create or replace view public.transaction_monthly_summary
with (security_invoker = true) as
select
  project_id,
  date_trunc('month', date)::date as month,
  type,
  category_id,
  sum(amount)::numeric(18, 2) as total,
  count(*)::int as txn_count
from public.transactions
group by project_id, date_trunc('month', date), type, category_id;

grant select on public.transaction_monthly_summary to authenticated;
