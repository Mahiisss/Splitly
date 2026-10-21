-- =============================================================================
-- Splitly: initial database schema (Supabase / Postgres)
--
-- Run this in the Supabase SQL editor, or with the Supabase CLI:
--   supabase db push
--
-- Money rule: every amount is a BIGINT number of minor units (paise / cents).
-- Security: Row Level Security (RLS) is on for every table, so a user can only
-- ever see or change data for groups they belong to.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Tables
-- -----------------------------------------------------------------------------

-- One row per signed-up user (created automatically by a trigger below).
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 50),
  avatar_url   text,
  created_at   timestamptz not null default now()
);

create table public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 60),
  currency    char(3) not null default 'INR',
  -- Short code friends use to join ("Join group" screen / share link).
  invite_code text not null unique
              default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  created_by  uuid not null default auth.uid() references public.profiles (id),
  created_at  timestamptz not null default now()
);

create table public.group_members (
  group_id  uuid not null references public.groups (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.expenses (
  -- The client generates this id (crypto.randomUUID) so an expense created
  -- offline can be retried safely without creating duplicates.
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups (id) on delete cascade,
  description  text not null check (char_length(description) between 1 and 100),
  -- Must match EXPENSE_CATEGORIES in packages/core/src/types.ts
  category     text not null default 'other'
               check (category in ('stay', 'travel', 'food', 'groceries', 'fun', 'rent', 'bills', 'other')),
  amount_minor bigint not null check (amount_minor > 0),
  paid_by      uuid not null references public.profiles (id),
  split_type   text not null check (split_type in ('equal', 'shares', 'exact')),
  created_by   uuid not null default auth.uid() references public.profiles (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- How much of each expense every person is responsible for.
create table public.expense_splits (
  expense_id   uuid not null references public.expenses (id) on delete cascade,
  user_id      uuid not null references public.profiles (id),
  amount_minor bigint not null check (amount_minor >= 0),
  primary key (expense_id, user_id)
);

-- A real payment between two members ("Rohan paid Mahi back ₹1,000").
create table public.settlements (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups (id) on delete cascade,
  from_user    uuid not null references public.profiles (id),
  to_user      uuid not null references public.profiles (id),
  amount_minor bigint not null check (amount_minor > 0),
  created_by   uuid not null default auth.uid() references public.profiles (id),
  created_at   timestamptz not null default now(),
  check (from_user <> to_user)
);

create index group_members_user_idx   on public.group_members (user_id);
create index expenses_group_idx       on public.expenses (group_id, created_at desc);
create index expense_splits_user_idx  on public.expense_splits (user_id);
create index settlements_group_idx    on public.settlements (group_id, created_at desc);


-- -----------------------------------------------------------------------------
-- 2. Helper functions used by the security policies
--    SECURITY DEFINER lets them read group_members without triggering the
--    group_members policy again (which would cause infinite recursion).
-- -----------------------------------------------------------------------------

create function public.is_member_of(p_group_id uuid, p_user_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_user_id
  );
$$;

-- Is the signed-in user a member of this group?
create function public.is_group_member(p_group_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_member_of(p_group_id, auth.uid());
$$;

create function public.is_group_owner(p_group_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = auth.uid() and role = 'owner'
  );
$$;

-- Do the signed-in user and p_user_id share at least one group?
create function public.shares_group_with(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members me
    join public.group_members them on them.group_id = me.group_id
    where me.user_id = auth.uid() and them.user_id = p_user_id
  );
$$;


-- -----------------------------------------------------------------------------
-- 3. Triggers
-- -----------------------------------------------------------------------------

-- Create a profile whenever someone signs up.
create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      split_part(new.email, '@', 1),
      'New user'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Whoever creates a group becomes its owner.
create function public.add_group_owner()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.group_members (group_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger on_group_created
  after insert on public.groups
  for each row execute function public.add_group_owner();

create function public.touch_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger expenses_touch_updated_at
  before update on public.expenses
  for each row execute function public.touch_updated_at();


-- -----------------------------------------------------------------------------
-- 4. Row Level Security
-- -----------------------------------------------------------------------------

alter table public.profiles       enable row level security;
alter table public.groups         enable row level security;
alter table public.group_members  enable row level security;
alter table public.expenses       enable row level security;
alter table public.expense_splits enable row level security;
alter table public.settlements    enable row level security;

-- profiles: see yourself and people you share a group with; edit only yourself.
create policy "profiles: read self and group mates" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_group_with(id));

create policy "profiles: update self" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- groups: members can read. `created_by = auth.uid()` is also allowed so that
-- `insert ... returning *` works before the owner trigger has added the creator.
create policy "groups: members read" on public.groups
  for select to authenticated
  using (public.is_group_member(id) or created_by = auth.uid());

create policy "groups: anyone signed in can create" on public.groups
  for insert to authenticated
  with check (created_by = auth.uid());

create policy "groups: owner updates" on public.groups
  for update to authenticated
  using (public.is_group_owner(id)) with check (public.is_group_owner(id));

create policy "groups: owner deletes" on public.groups
  for delete to authenticated
  using (public.is_group_owner(id));

-- group_members: members see each other. Joining happens through the
-- join_group_by_code() function below, never by inserting directly.
create policy "members: members read" on public.group_members
  for select to authenticated
  using (public.is_group_member(group_id));

create policy "members: leave or owner removes" on public.group_members
  for delete to authenticated
  using (user_id = auth.uid() or public.is_group_owner(group_id));

-- expenses + splits: members read and delete. Creating goes through
-- create_expense(), which checks that the splits add up to the total.
create policy "expenses: members read" on public.expenses
  for select to authenticated
  using (public.is_group_member(group_id));

create policy "expenses: members delete" on public.expenses
  for delete to authenticated
  using (public.is_group_member(group_id));

create policy "splits: members read" on public.expense_splits
  for select to authenticated
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and public.is_group_member(e.group_id)
    )
  );

-- settlements: members read; a member can record a payment between two
-- members of the same group; only the person who recorded it can delete it.
create policy "settlements: members read" on public.settlements
  for select to authenticated
  using (public.is_group_member(group_id));

create policy "settlements: members record" on public.settlements
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.is_group_member(group_id)
    and public.is_member_of(group_id, from_user)
    and public.is_member_of(group_id, to_user)
  );

create policy "settlements: creator deletes" on public.settlements
  for delete to authenticated
  using (created_by = auth.uid());


-- -----------------------------------------------------------------------------
-- 5. Functions the app calls (supabase.rpc(...))
-- -----------------------------------------------------------------------------

-- Join a group using its invite code. Returns the group id.
create function public.join_group_by_code(p_invite_code text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You need to be signed in' using errcode = '28000';
  end if;

  select id into v_group_id from public.groups where invite_code = trim(p_invite_code);
  if v_group_id is null then
    raise exception 'No group found for that invite code' using errcode = 'P0002';
  end if;

  insert into public.group_members (group_id, user_id)
  values (v_group_id, auth.uid())
  on conflict do nothing;

  return v_group_id;
end;
$$;

-- Create an expense and its splits in one transaction.
-- p_splits looks like: [{"user_id": "...", "amount_minor": 30000}, ...]
-- Calling it twice with the same p_id is safe (the second call does nothing),
-- which is what makes offline retries safe.
create function public.create_expense(
  p_id           uuid,
  p_group_id     uuid,
  p_description  text,
  p_amount_minor bigint,
  p_paid_by      uuid,
  p_split_type   text,
  p_splits       jsonb,
  p_category     text default 'other'
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_total bigint;
begin
  if not public.is_group_member(p_group_id) then
    raise exception 'You are not a member of this group' using errcode = '42501';
  end if;

  if exists (select 1 from public.expenses where id = p_id) then
    return p_id; -- already saved (e.g. an offline retry)
  end if;

  if jsonb_typeof(p_splits) <> 'array' or jsonb_array_length(p_splits) = 0 then
    raise exception 'An expense needs at least one split' using errcode = '22023';
  end if;

  select coalesce(sum((s ->> 'amount_minor')::bigint), 0)
    into v_total
    from jsonb_array_elements(p_splits) s;

  if v_total <> p_amount_minor then
    raise exception 'Splits add up to %, but the expense total is %', v_total, p_amount_minor
      using errcode = '22023';
  end if;

  if not public.is_member_of(p_group_id, p_paid_by)
     or exists (
       select 1 from jsonb_array_elements(p_splits) s
       where not public.is_member_of(p_group_id, (s ->> 'user_id')::uuid)
     ) then
    raise exception 'The payer and everyone in the split must be in the group'
      using errcode = '22023';
  end if;

  insert into public.expenses (id, group_id, description, category, amount_minor, paid_by, split_type, created_by)
  values (p_id, p_group_id, p_description, p_category, p_amount_minor, p_paid_by, p_split_type, auth.uid());

  insert into public.expense_splits (expense_id, user_id, amount_minor)
  select p_id, (s ->> 'user_id')::uuid, (s ->> 'amount_minor')::bigint
  from jsonb_array_elements(p_splits) s;

  return p_id;
end;
$$;

-- Edit an expense: replaces its details and splits in one transaction,
-- with the same checks as create_expense(). Any group member can edit.
create function public.update_expense(
  p_id           uuid,
  p_description  text,
  p_amount_minor bigint,
  p_paid_by      uuid,
  p_split_type   text,
  p_splits       jsonb,
  p_category     text default 'other'
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_group_id uuid;
  v_total    bigint;
begin
  select group_id into v_group_id from public.expenses where id = p_id;
  if v_group_id is null or not public.is_group_member(v_group_id) then
    raise exception 'Expense not found' using errcode = 'P0002';
  end if;

  if jsonb_typeof(p_splits) <> 'array' or jsonb_array_length(p_splits) = 0 then
    raise exception 'An expense needs at least one split' using errcode = '22023';
  end if;

  select coalesce(sum((s ->> 'amount_minor')::bigint), 0)
    into v_total
    from jsonb_array_elements(p_splits) s;

  if v_total <> p_amount_minor then
    raise exception 'Splits add up to %, but the expense total is %', v_total, p_amount_minor
      using errcode = '22023';
  end if;

  if not public.is_member_of(v_group_id, p_paid_by)
     or exists (
       select 1 from jsonb_array_elements(p_splits) s
       where not public.is_member_of(v_group_id, (s ->> 'user_id')::uuid)
     ) then
    raise exception 'The payer and everyone in the split must be in the group'
      using errcode = '22023';
  end if;

  update public.expenses
     set description = p_description, category = p_category, amount_minor = p_amount_minor,
         paid_by = p_paid_by, split_type = p_split_type
   where id = p_id;

  delete from public.expense_splits where expense_id = p_id;
  insert into public.expense_splits (expense_id, user_id, amount_minor)
  select p_id, (s ->> 'user_id')::uuid, (s ->> 'amount_minor')::bigint
  from jsonb_array_elements(p_splits) s;

  return p_id;
end;
$$;

-- Only signed-in users may call the app functions. (Supabase grants new
-- functions to `anon` by default, so it has to be revoked explicitly.)
revoke execute on function public.join_group_by_code(text) from public, anon;
revoke execute on function public.create_expense(uuid, uuid, text, bigint, uuid, text, jsonb, text) from public, anon;
grant execute on function public.join_group_by_code(text) to authenticated;
grant execute on function public.create_expense(uuid, uuid, text, bigint, uuid, text, jsonb, text) to authenticated;
revoke execute on function public.update_expense(uuid, text, bigint, uuid, text, jsonb, text) from public, anon;
grant execute on function public.update_expense(uuid, text, bigint, uuid, text, jsonb, text) to authenticated;


-- -----------------------------------------------------------------------------
-- 6. Realtime: push changes to every open app instantly
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime
      add table public.expenses, public.expense_splits, public.settlements, public.group_members;
  end if;
end;
$$;
