create table if not exists public.qr_intelligence_logs (
  id uuid primary key default gen_random_uuid(),
  qr_text text not null,
  qr_type text not null,
  source_url text,
  source_type text not null default 'direct',
  confidence_score int not null default 0,
  authenticity_status text not null default 'unknown',
  canonical_fields jsonb default '{}'::jsonb,
  key_values jsonb default '{}'::jsonb,
  sections jsonb default '{}'::jsonb,
  redirect_chain jsonb default '[]'::jsonb,
  raw_source_data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_qr_intel_logs_created_at on public.qr_intelligence_logs(created_at desc);
create index if not exists idx_qr_intel_logs_qr_type on public.qr_intelligence_logs(qr_type);

alter table public.qr_intelligence_logs enable row level security;

drop policy if exists "qr_intel_logs_no_direct_access" on public.qr_intelligence_logs;
create policy "qr_intel_logs_no_direct_access"
  on public.qr_intelligence_logs
  for all
  using (false);
