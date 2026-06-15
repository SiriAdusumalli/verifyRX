-- Smart Medicine Assistant — Vite + Edge Functions stack
create extension if not exists "pgcrypto";

-- Profiles (auth.users extension)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz default now() not null
);

-- Cached / canonical medicines (OpenFDA + OpenAI structured)
create table if not exists public.medicines (
  id uuid primary key default gen_random_uuid(),
  barcode text unique,
  image_hash text unique,
  name text not null,
  composition text not null default '',
  usage text[] not null default '{}',
  side_effects text[] not null default '{}',
  warnings text[] not null default '{}',
  risk_level text not null default 'low' check (risk_level in ('low', 'medium', 'high')),
  dosage_guidance text not null default '',
  disclaimer text not null default 'Consult a doctor before use.',
  openfda_raw jsonb default '{}'::jsonb,
  scrape_raw text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_medicines_name_lower on public.medicines (lower(name));
create index if not exists idx_medicines_barcode on public.medicines (barcode) where barcode is not null;

create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  medicine_id uuid not null references public.medicines (id) on delete cascade,
  barcode text,
  image_hash text,
  duplicate_count int default 0,
  created_at timestamptz default now() not null
);

create index if not exists idx_scans_user on public.scans (user_id, created_at desc);
create index if not exists idx_scans_medicine on public.scans (medicine_id);
create index if not exists idx_scans_barcode_recent on public.scans (barcode, created_at desc);

create table if not exists public.risk_reports (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.scans (id) on delete cascade,
  risk_level text not null check (risk_level in ('low', 'medium', 'high')),
  reasons jsonb default '[]'::jsonb,
  created_at timestamptz default now() not null
);

create table if not exists public.comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  med1 text not null,
  med2 text not null,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz default now() not null
);

create index if not exists idx_comparisons_user on public.comparisons (user_id, created_at desc);

create table if not exists public.user_saved_medicines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  medicine_id uuid not null references public.medicines (id) on delete cascade,
  bookmarked boolean default false,
  notes text,
  created_at timestamptz default now() not null,
  unique (user_id, medicine_id)
);

-- Rate limit: 10 scans / minute / bucket (user id or IP fingerprint)
create table if not exists public.scan_rate_limits (
  id bigserial primary key,
  bucket text not null,
  window_minute timestamptz not null,
  count int not null default 0,
  unique (bucket, window_minute)
);

create index if not exists idx_scan_rl_bucket on public.scan_rate_limits (bucket, window_minute desc);

alter table public.profiles enable row level security;
alter table public.medicines enable row level security;
alter table public.scans enable row level security;
alter table public.risk_reports enable row level security;
alter table public.comparisons enable row level security;
alter table public.user_saved_medicines enable row level security;
alter table public.scan_rate_limits enable row level security;

drop policy if exists "profiles_own" on public.profiles;
create policy "profiles_own" on public.profiles for all using (auth.uid() = id);

drop policy if exists "medicines_read_auth" on public.medicines;
create policy "medicines_read_auth" on public.medicines for select to authenticated using (true);

drop policy if exists "scans_own" on public.scans;
create policy "scans_own" on public.scans for select using (auth.uid() = user_id);

drop policy if exists "risk_via_scan" on public.risk_reports;
create policy "risk_via_scan" on public.risk_reports for select using (
  exists (select 1 from public.scans s where s.id = risk_reports.scan_id and s.user_id = auth.uid())
);

drop policy if exists "comparisons_own" on public.comparisons;
create policy "comparisons_own" on public.comparisons for select using (auth.uid() = user_id);

drop policy if exists "saved_own" on public.user_saved_medicines;
drop policy if exists "saved_select" on public.user_saved_medicines;
drop policy if exists "saved_insert" on public.user_saved_medicines;
drop policy if exists "saved_update" on public.user_saved_medicines;
drop policy if exists "saved_delete" on public.user_saved_medicines;
create policy "saved_select" on public.user_saved_medicines for select using (auth.uid() = user_id);
create policy "saved_insert" on public.user_saved_medicines for insert with check (auth.uid() = user_id);
create policy "saved_update" on public.user_saved_medicines for update using (auth.uid() = user_id);
create policy "saved_delete" on public.user_saved_medicines for delete using (auth.uid() = user_id);

drop policy if exists "scan_rl_deny" on public.scan_rate_limits;
create policy "scan_rl_deny" on public.scan_rate_limits for all using (false);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
