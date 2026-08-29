-- INDIEDASH Database Schema
-- Run this in Supabase SQL Editor

-- Profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  slug text unique,
  plan text default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id text,
  created_at timestamptz default now()
);

-- Projects
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  status text default 'idea' check (status in ('idea', 'dev', 'live', 'archived')),
  color text default '#00E5FF',
  mrr integer default 0,
  users_count integer default 0,
  price integer default null,
  payment_provider text default 'manual',
  stripe_secret_key text,
  stripe_product_id text,
  launch_month text,
  created_at timestamptz default now()
);

-- Revenue History
create table revenue_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  month text not null,
  mrr integer default 0,
  unique(project_id, month)
);

-- Public Settings
create table public_settings (
  user_id uuid primary key references profiles(id) on delete cascade,
  is_public boolean default false
);

-- RLS
alter table profiles enable row level security;
alter table projects enable row level security;
alter table revenue_history enable row level security;
alter table public_settings enable row level security;

-- Profiles policies
create policy "Users read own profile" on profiles
  for select using (auth.uid() = id or exists (
    select 1 from public_settings ps where ps.user_id = id and ps.is_public = true
  ));
create policy "Users update own profile" on profiles
  for update using (auth.uid() = id);
create policy "Users insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- Projects policies
create policy "Users manage own projects" on projects
  for all using (auth.uid() = user_id);
create policy "Public can read live projects" on projects
  for select using (
    status = 'live' and exists (
      select 1 from public_settings ps where ps.user_id = user_id and ps.is_public = true
    )
  );

-- Revenue history policies
create policy "Users manage own history" on revenue_history
  for all using (
    exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid())
  );
create policy "Public can read history" on revenue_history
  for select using (
    exists (
      select 1 from projects p
      join public_settings ps on ps.user_id = p.user_id
      where p.id = project_id and ps.is_public = true and p.status = 'live'
    )
  );

-- Public settings policies
create policy "Users manage own public settings" on public_settings
  for all using (auth.uid() = user_id);
create policy "Anyone can read public settings" on public_settings
  for select using (true);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- Admin + Feedback (2026-08-29)
-- ============================================================

alter table profiles add column if not exists is_admin boolean default false;

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  message text not null,
  created_at timestamptz default now()
);

alter table feedback enable row level security;

create policy "Users insert own feedback" on feedback
  for insert with check (auth.uid() = user_id);
create policy "Users read own feedback" on feedback
  for select using (auth.uid() = user_id);
create policy "Admins read all feedback" on feedback
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- 自分のアカウントを管理者にする（メールアドレスは必要に応じて変更してください）
update profiles set is_admin = true where email = 'bpdev.nft@gmail.com';
