-- 009_contribution_safety.sql
-- Ajouter des mecanismes de securite pour les contributions ouvertes :
-- 1. Colonnes de traçabilité sur chord_sheets (updated_at, last_edited_by)
-- 2. Table chord_sheet_revisions pour l'historique complet
-- 3. Rate limit RPC pour eviter les abus (30 updates/heure)
-- 4. Protection des sheets officielles (admin-only edit)

-- ============================================================
-- 1. Ajouter colonnes de tracabilite sur chord_sheets
-- ============================================================
alter table chord_sheets
  add column updated_at timestamptz default now() not null,
  add column last_edited_by uuid references profiles(id);

create index idx_chord_sheets_updated_at on chord_sheets(updated_at);

-- ============================================================
-- 2. Table chord_sheet_revisions pour l'historique
-- ============================================================
create table chord_sheet_revisions (
  id uuid primary key default gen_random_uuid(),
  chord_sheet_id uuid references chord_sheets(id) on delete cascade not null,
  content text not null,
  instrument instrument not null,
  tuning text,
  capo smallint,
  edited_by uuid references profiles(id) not null,
  created_at timestamptz default now() not null
);

create index idx_chord_sheet_revisions_sheet on chord_sheet_revisions(chord_sheet_id);
create index idx_chord_sheet_revisions_created_at on chord_sheet_revisions(created_at desc);

-- Enable RLS on chord_sheet_revisions
alter table chord_sheet_revisions enable row level security;

-- Everyone can view revisions
create policy "Everyone can view chord sheet revisions"
  on chord_sheet_revisions for select using (true);

-- Authenticated non-banned users can insert revisions
create policy "Non-banned users can create revisions"
  on chord_sheet_revisions for insert
  with check (auth.role() = 'authenticated' and not public.is_banned());

-- Admins can delete revisions
create policy "Admins can delete revisions"
  on chord_sheet_revisions for delete using (public.is_admin());

-- ============================================================
-- 3. RPC: check_update_rate_limit
-- ============================================================
create or replace function public.check_update_rate_limit(
  user_uuid uuid,
  max_per_hour int default 30
)
returns boolean as $$
declare
  recent_count int;
begin
  select count(*) into recent_count
  from chord_sheet_revisions
  where edited_by = user_uuid
    and created_at > now() - interval '1 hour';
  return recent_count < max_per_hour;
end;
$$ language plpgsql security definer;

-- ============================================================
-- 4. Proteger les sheets officielles (admin-only edit)
-- ============================================================
drop policy if exists "Authenticated users can update chord sheets" on chord_sheets;
create policy "Authenticated users can update non-official chord sheets"
  on chord_sheets for update
  using (
    (auth.role() = 'authenticated' and not public.is_banned() and not is_official)
    or public.is_admin()
  );
