-- 008_open_contributions.sql
-- Supprimer le concept de propriete : tout utilisateur connecte non-banni
-- peut modifier les grilles d'accords et les chansons.
-- Ajouter la table suggestions pour les corrections admin-gated.

-- ============================================================
-- 1. Ouvrir l'edition des chord_sheets a tous les connectes
-- ============================================================
drop policy if exists "Users can update own chord sheets" on chord_sheets;
create policy "Authenticated users can update chord sheets"
  on chord_sheets for update
  using (auth.role() = 'authenticated' and not public.is_banned());

-- ============================================================
-- 2. Ouvrir l'edition des songs a tous les connectes
-- ============================================================
drop policy if exists "Users can update own songs" on songs;
create policy "Authenticated users can update songs"
  on songs for update
  using (auth.role() = 'authenticated' and not public.is_banned());

-- Suppression de chansons : restreindre a l'admin uniquement
-- (on retire le delete owner-only, l'admin policy existe deja)
drop policy if exists "Users can delete own songs" on songs;

-- Suppression de chord_sheets : restreindre a l'admin uniquement
drop policy if exists "Users can delete own chord sheets" on chord_sheets;

-- ============================================================
-- 3. Table suggestions
-- ============================================================
create type suggestion_type as enum (
  'correction_artiste',
  'fusion_artiste',
  'correction_chanson',
  'signalement'
);

create type suggestion_status as enum (
  'pending',
  'accepted',
  'rejected'
);

create table suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  type suggestion_type not null,
  target_type text not null,          -- 'artist' | 'song' | 'chord_sheet'
  target_id uuid not null,
  message text not null,
  status suggestion_status not null default 'pending',
  admin_note text,
  created_at timestamptz default now() not null,
  resolved_at timestamptz
);

create index idx_suggestions_status on suggestions(status);
create index idx_suggestions_user on suggestions(user_id);

alter table suggestions enable row level security;

-- Tout le monde peut voir ses propres suggestions
create policy "Users can view own suggestions"
  on suggestions for select using (auth.uid() = user_id);

-- Les connectes non-bannis peuvent creer des suggestions
create policy "Non-banned users can create suggestions"
  on suggestions for insert
  with check (auth.role() = 'authenticated' and not public.is_banned());

-- Admins voient toutes les suggestions
create policy "Admins can view all suggestions"
  on suggestions for select using (public.is_admin());

-- Admins peuvent mettre a jour les suggestions
create policy "Admins can update suggestions"
  on suggestions for update using (public.is_admin());
