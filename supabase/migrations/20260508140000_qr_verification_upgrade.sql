alter table public.medicines
  add column if not exists qr_type text default 'text',
  add column if not exists source_url text,
  add column if not exists source_type text default 'direct',
  add column if not exists authenticity_status text default 'unknown',
  add column if not exists confidence_score int default 0,
  add column if not exists dynamic_data jsonb default '{}'::jsonb,
  add column if not exists canonical_fields jsonb default '{}'::jsonb;

create table if not exists public.scan_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  medicine_id uuid references public.medicines (id) on delete cascade,
  qr_raw text,
  qr_type text not null default 'text',
  source_url text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.qr_verifications (
  id uuid primary key default gen_random_uuid(),
  medicine_id uuid not null references public.medicines (id) on delete cascade,
  status text not null default 'unknown',
  confidence_score int not null default 0,
  suspicious_reasons jsonb default '[]'::jsonb,
  raw_payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_scan_logs_user_created on public.scan_logs(user_id, created_at desc);
create index if not exists idx_qr_verifications_medicine on public.qr_verifications(medicine_id, created_at desc);

alter table public.scan_logs enable row level security;
alter table public.qr_verifications enable row level security;

drop policy if exists "scan_logs_own_select" on public.scan_logs;
create policy "scan_logs_own_select"
  on public.scan_logs for select
  using (auth.uid() = user_id);

drop policy if exists "qr_verifications_authenticated_select" on public.qr_verifications;
create policy "qr_verifications_authenticated_select"
  on public.qr_verifications for select
  to authenticated
  using (true);
