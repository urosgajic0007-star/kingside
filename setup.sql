-- Kingside: run this once in Supabase → SQL Editor → New query → Run
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  rating int default 800,
  puzzle_rating int default 1200,
  style jsonb default '{}'::jsonb,
  last_seen timestamptz default now(),
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select using (true);
drop policy if exists "profiles insert" on public.profiles;
create policy "profiles insert" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles update" on public.profiles;
create policy "profiles update" on public.profiles for update using (auth.uid() = id);

create table if not exists public.user_data (
  id uuid primary key references auth.users on delete cascade,
  data jsonb,
  updated_at timestamptz default now()
);
alter table public.user_data enable row level security;
drop policy if exists "own data" on public.user_data;
create policy "own data" on public.user_data for all using (auth.uid() = id) with check (auth.uid() = id);

create table if not exists public.friendships (
  id bigint generated always as identity primary key,
  requester uuid not null references public.profiles(id) on delete cascade,
  addressee uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz default now(),
  unique (requester, addressee)
);
alter table public.friendships enable row level security;
drop policy if exists "friend read" on public.friendships;
create policy "friend read" on public.friendships for select using (auth.uid() in (requester, addressee));
drop policy if exists "friend insert" on public.friendships;
create policy "friend insert" on public.friendships for insert with check (auth.uid() = requester);
drop policy if exists "friend update" on public.friendships;
create policy "friend update" on public.friendships for update using (auth.uid() = addressee);
drop policy if exists "friend delete" on public.friendships;
create policy "friend delete" on public.friendships for delete using (auth.uid() in (requester, addressee));

create table if not exists public.online_games (
  id uuid primary key default gen_random_uuid(),
  white uuid not null references public.profiles(id) on delete cascade,
  black uuid not null references public.profiles(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'invited' check (status in ('invited','active','finished','declined','cancelled')),
  start_fen text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  moves text[] not null default '{}',
  base_ms int, inc_ms int, white_ms int, black_ms int,
  white_style jsonb, black_style jsonb,
  result text, reason text, draw_offer uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.online_games enable row level security;
drop policy if exists "game read" on public.online_games;
create policy "game read" on public.online_games for select using (auth.uid() in (white, black));
drop policy if exists "game insert" on public.online_games;
create policy "game insert" on public.online_games for insert with check (auth.uid() = created_by and auth.uid() in (white, black));
drop policy if exists "game update" on public.online_games;
create policy "game update" on public.online_games for update using (auth.uid() in (white, black));

do $$ begin
  alter publication supabase_realtime add table public.online_games;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.friendships;
exception when others then null; end $$;
